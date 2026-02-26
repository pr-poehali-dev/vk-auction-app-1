"""
Размещение ставки на лот.
POST / — тело: {lotId, amount, userId, userName, userAvatar}
Логика: валидация минимальной ставки, антиснайп, атомарное обновление.
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = "t_p68201414_vk_auction_app_1"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-User-Name, X-User-Avatar",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    lot_id = body.get("lotId")
    amount = body.get("amount")
    user_id = body.get("userId", "guest")
    user_name = body.get("userName", "Участник")
    user_avatar = body.get("userAvatar", "??")

    if not lot_id or not amount:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан лот или сумма"})}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"""
        SELECT id, current_price, step, ends_at, status, anti_snipe, anti_snipe_minutes
        FROM {SCHEMA}.lots WHERE id = {int(lot_id)}
        FOR UPDATE
    """)
    row = cur.fetchone()

    if not row:
        conn.close()
        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Лот не найден"})}

    lid, current_price, step, ends_at, status, anti_snipe, anti_snipe_min = row

    now = datetime.now(timezone.utc)

    if status != 'active' or ends_at <= now:
        conn.rollback()
        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Аукцион уже завершён"})}

    min_bid = current_price + step
    if int(amount) < min_bid:
        conn.rollback()
        conn.close()
        return {"statusCode": 400, "headers": CORS,
                "body": json.dumps({"error": f"Ставка слишком маленькая. Минимум: {min_bid} ₽"})}

    # Anti-snipe: если ставка в последние N минут — продлеваем
    new_ends_at = ends_at
    extended = False
    if anti_snipe:
        ms_left = (ends_at - now).total_seconds()
        if 0 < ms_left < anti_snipe_min * 60:
            new_ends_at = ends_at + timedelta(minutes=anti_snipe_min)
            extended = True

    user_id_safe = user_id.replace("'", "''")
    user_name_safe = user_name.replace("'", "''")
    user_avatar_safe = user_avatar.replace("'", "''")

    cur.execute(f"""
        INSERT INTO {SCHEMA}.bids (lot_id, user_id, user_name, user_avatar, amount)
        VALUES ({int(lot_id)}, '{user_id_safe}', '{user_name_safe}', '{user_avatar_safe}', {int(amount)})
        RETURNING id
    """)
    bid_id = cur.fetchone()[0]

    cur.execute(f"""
        UPDATE {SCHEMA}.lots
        SET current_price = {int(amount)},
            ends_at = '{new_ends_at.isoformat()}'
        WHERE id = {int(lot_id)}
    """)

    conn.commit()
    conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "ok": True,
            "bidId": bid_id,
            "newPrice": int(amount),
            "extended": extended,
            "newEndsAt": new_ends_at.isoformat(),
        })
    }
