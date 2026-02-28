"""
Получение списка лотов и одного лота с историей ставок.
GET /  — список всех лотов (с последними ставками)
GET /?id=1 — один лот с полной историей ставок
GET /?id=1&userId=xxx — один лот + myAutoBid для данного пользователя
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
    """Завершаем просроченные активные лоты."""
    cur.execute(f"""
        UPDATE {SCHEMA}.lots l
        SET status = 'finished',
            winner_id   = (SELECT user_id  FROM {SCHEMA}.bids WHERE lot_id = l.id ORDER BY amount DESC, created_at ASC LIMIT 1),
            winner_name = (SELECT user_name FROM {SCHEMA}.bids WHERE lot_id = l.id ORDER BY amount DESC, created_at ASC LIMIT 1),
            payment_status = COALESCE(l.payment_status, 'pending')
        WHERE l.status = 'active' AND l.ends_at <= NOW()
    """)


def activate_scheduled_lots(cur):
    """Активируем лоты с отложенным стартом, если время пришло."""
    cur.execute(f"""
        UPDATE {SCHEMA}.lots
        SET status = 'active', starts_at = starts_at
        WHERE status = 'upcoming' AND starts_at IS NOT NULL AND starts_at <= NOW()
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
        "video": row[15] or "",
        "videoDuration": row[16],
        "startsAt": row[17].isoformat() if row[17] else None,
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
    user_id = params.get("userId", "")

    conn = get_conn()
    cur = conn.cursor()

    finish_expired_lots(cur)
    activate_scheduled_lots(cur)
    conn.commit()

    if lot_id:
        cur.execute(f"""
            SELECT id, title, description, image, start_price, current_price, step,
                   ends_at, status, winner_id, winner_name, anti_snipe, anti_snipe_minutes,
                   payment_status, created_at, COALESCE(video, '') as video, video_duration, starts_at
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

        # Автоставка текущего пользователя
        if user_id and user_id != "guest":
            uid = user_id.replace("'", "''")
            cur.execute(f"""
                SELECT max_amount, user_id FROM {SCHEMA}.auto_bids
                WHERE lot_id = {int(lot_id)} AND user_id = '{uid}'
            """)
            ab = cur.fetchone()
            if ab:
                lot["myAutoBid"] = {"maxAmount": ab[0], "userId": ab[1]}

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(lot)}

    # List all lots with top bid info
    cur.execute(f"""
        SELECT l.id, l.title, l.description, l.image, l.start_price, l.current_price, l.step,
               l.ends_at, l.status, l.winner_id, l.winner_name, l.anti_snipe, l.anti_snipe_minutes,
               l.payment_status, l.created_at, COALESCE(l.video, '') as video, l.video_duration, l.starts_at,
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

    lot_ids = [r[0] for r in rows]
    recent_bids = {}
    if lot_ids:
        ids_str = ",".join(str(i) for i in lot_ids)
        cur.execute(f"""
            SELECT id, lot_id, user_id, user_name, user_avatar, amount, created_at
            FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY lot_id ORDER BY amount DESC, created_at ASC) as rn
                FROM {SCHEMA}.bids WHERE lot_id IN ({ids_str})
            ) ranked WHERE rn <= 3
            ORDER BY lot_id, amount DESC, created_at ASC
        """)
        for row in cur.fetchall():
            lid = row[1]
            if lid not in recent_bids:
                recent_bids[lid] = []
            recent_bids[lid].append(row_to_bid(row))

    conn.close()

    lots = []
    for r in rows:
        lot = row_to_lot(r[:18])
        lot["leaderId"] = r[18]
        lot["leaderName"] = r[19]
        lot["leaderAvatar"] = r[20]
        lot["bidCount"] = r[21]
        lot["bids"] = recent_bids.get(lot["id"], [])
        lots.append(lot)

    return {"statusCode": 200, "headers": CORS, "body": json.dumps(lots)}
