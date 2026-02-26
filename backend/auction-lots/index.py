"""
Получение списка лотов и одного лота с историей ставок.
GET /  — список всех лотов (с последними ставками)
GET /?id=1 — один лот с полной историей ставок
"""
import json
import os
import psycopg2
from datetime import datetime, timezone

SCHEMA = "t_p68201414_vk_auction_app_1"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-User-Name, X-User-Avatar",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def finish_expired_lots(cur):
    cur.execute(f"""
        UPDATE {SCHEMA}.lots l
        SET status = 'finished',
            winner_id   = (SELECT user_id  FROM {SCHEMA}.bids WHERE lot_id = l.id ORDER BY amount DESC, created_at ASC LIMIT 1),
            winner_name = (SELECT user_name FROM {SCHEMA}.bids WHERE lot_id = l.id ORDER BY amount DESC, created_at ASC LIMIT 1),
            payment_status = COALESCE(l.payment_status, 'pending')
        WHERE l.status = 'active' AND l.ends_at <= NOW()
    """)


def row_to_lot(row):
    return {
        "id": row[0],
        "title": row[1],
        "description": row[2],
        "image": row[3],
        "startPrice": row[4],
        "currentPrice": row[5],
        "step": row[6],
        "endsAt": row[7].isoformat() if row[7] else None,
        "status": row[8],
        "winnerId": row[9],
        "winnerName": row[10],
        "antiSnipe": row[11],
        "antiSnipeMinutes": row[12],
        "paymentStatus": row[13],
        "createdAt": row[14].isoformat() if row[14] else None,
    }


def row_to_bid(row):
    return {
        "id": row[0],
        "lotId": row[1],
        "userId": row[2],
        "userName": row[3],
        "userAvatar": row[4],
        "amount": row[5],
        "createdAt": row[6].isoformat() if row[6] else None,
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    lot_id = params.get("id")

    conn = get_conn()
    cur = conn.cursor()

    finish_expired_lots(cur)
    conn.commit()

    if lot_id:
        cur.execute(f"""
            SELECT id, title, description, image, start_price, current_price, step,
                   ends_at, status, winner_id, winner_name, anti_snipe, anti_snipe_minutes,
                   payment_status, created_at
            FROM {SCHEMA}.lots WHERE id = {int(lot_id)}
        """)
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Лот не найден"})}

        lot = row_to_lot(row)

        cur.execute(f"""
            SELECT id, lot_id, user_id, user_name, user_avatar, amount, created_at
            FROM {SCHEMA}.bids WHERE lot_id = {int(lot_id)}
            ORDER BY amount DESC, created_at ASC
            LIMIT 50
        """)
        lot["bids"] = [row_to_bid(r) for r in cur.fetchall()]
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(lot)}

    # List all lots with top bid info
    cur.execute(f"""
        SELECT l.id, l.title, l.description, l.image, l.start_price, l.current_price, l.step,
               l.ends_at, l.status, l.winner_id, l.winner_name, l.anti_snipe, l.anti_snipe_minutes,
               l.payment_status, l.created_at,
               b.user_id as leader_id, b.user_name as leader_name, b.user_avatar as leader_avatar,
               (SELECT COUNT(*) FROM {SCHEMA}.bids WHERE lot_id = l.id) as bid_count
        FROM {SCHEMA}.lots l
        LEFT JOIN LATERAL (
            SELECT user_id, user_name, user_avatar FROM {SCHEMA}.bids
            WHERE lot_id = l.id ORDER BY amount DESC, created_at ASC LIMIT 1
        ) b ON true
        ORDER BY l.created_at DESC
    """)
    rows = cur.fetchall()
    conn.close()

    lots = []
    for r in rows:
        lot = row_to_lot(r[:15])
        lot["leaderId"] = r[15]
        lot["leaderName"] = r[16]
        lot["leaderAvatar"] = r[17]
        lot["bidCount"] = r[18]
        lots.append(lot)

    return {"statusCode": 200, "headers": CORS, "body": json.dumps(lots)}
