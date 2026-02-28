"""
Ставки и автоставки.
POST / {lotId, amount, userId, userName, userAvatar} — разместить ставку
POST / {action: "auto_bid", lotId, maxAmount, userId, userName, userAvatar} — установить/обновить автоставку
После каждой ставки проверяет автоставки других участников и перебивает при необходимости.
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


def place_bid_internal(cur, lot_id: int, amount: int, user_id: str, user_name: str, user_avatar: str, now: datetime):
    """Разместить ставку. Возвращает (bid_id, new_ends_at, extended) или бросает исключение."""
    cur.execute(f"""
        SELECT id, current_price, step, ends_at, status, anti_snipe, anti_snipe_minutes
        FROM {SCHEMA}.lots WHERE id = {lot_id}
        FOR UPDATE
    """)
    row = cur.fetchone()
    if not row:
        raise ValueError("Лот не найден")

    lid, current_price, step, ends_at, status, anti_snipe, anti_snipe_min = row

    if status != 'active' or ends_at <= now:
        raise ValueError("Аукцион уже завершён")

    min_bid = current_price + step
    if int(amount) < min_bid:
        raise ValueError(f"Ставка слишком маленькая. Минимум: {min_bid} ₽")

    new_ends_at = ends_at
    extended = False
    if anti_snipe:
        ms_left = (ends_at - now).total_seconds()
        if 0 < ms_left < anti_snipe_min * 60:
            new_ends_at = ends_at + timedelta(minutes=anti_snipe_min)
            extended = True

    uid = user_id.replace("'", "''")
    uname = user_name.replace("'", "''")
    uavatar = user_avatar.replace("'", "''")

    cur.execute(f"""
        INSERT INTO {SCHEMA}.bids (lot_id, user_id, user_name, user_avatar, amount)
        VALUES ({lot_id}, '{uid}', '{uname}', '{uavatar}', {int(amount)})
        RETURNING id
    """)
    bid_id = cur.fetchone()[0]

    cur.execute(f"""
        UPDATE {SCHEMA}.lots
        SET current_price = {int(amount)}, ends_at = '{new_ends_at.isoformat()}'
        WHERE id = {lot_id}
    """)

    return bid_id, new_ends_at, extended


def process_auto_bids(conn, cur, lot_id: int, current_price: int, current_leader_id: str):
    """После ставки проверяем, есть ли автоставки других участников, которые могут перебить."""
    now = datetime.now(timezone.utc)

    # Берём активный лот ещё раз
    cur.execute(f"""
        SELECT id, current_price, step, ends_at, status
        FROM {SCHEMA}.lots WHERE id = {lot_id} FOR UPDATE
    """)
    row = cur.fetchone()
    if not row:
        return
    _, cp, step, ends_at, status = row
    if status != 'active' or ends_at <= now:
        return

    # Находим лучшую автоставку от НЕ-лидера с max_amount >= cp + step
    next_bid = cp + step
    cur.execute(f"""
        SELECT user_id, user_name, user_avatar, max_amount
        FROM {SCHEMA}.auto_bids
        WHERE lot_id = {lot_id}
          AND user_id != '{current_leader_id.replace("'", "''")}'
          AND max_amount >= {next_bid}
        ORDER BY max_amount DESC, created_at ASC
        LIMIT 1
    """)
    auto = cur.fetchone()
    if not auto:
        return

    auto_uid, auto_uname, auto_uavatar, auto_max = auto
    # Автоставка перебивает на шаг
    auto_amount = next_bid

    try:
        place_bid_internal(cur, lot_id, auto_amount, auto_uid, auto_uname, auto_uavatar, now)
        conn.commit()
        print(f"[auto-bid] auto bid placed: lot={lot_id} user={auto_uid} amount={auto_amount}")
    except ValueError as e:
        print(f"[auto-bid] skip: {e}")
        conn.rollback()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "place_bid")
    lot_id = body.get("lotId")
    user_id = body.get("userId", "guest")
    user_name = body.get("userName", "Участник")
    user_avatar = body.get("userAvatar", "??")

    if not lot_id:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан лот"})}

    # ── Установить/обновить автоставку ───────────────────────────────────────
    if action == "auto_bid":
        max_amount = body.get("maxAmount")
        if not max_amount:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан максимум"})}

        conn = get_conn()
        cur = conn.cursor()

        uid = user_id.replace("'", "''")
        uname = user_name.replace("'", "''")
        uavatar = user_avatar.replace("'", "''")

        # Проверяем, что лот активен
        cur.execute(f"SELECT status FROM {SCHEMA}.lots WHERE id = {int(lot_id)}")
        row = cur.fetchone()
        if not row or row[0] != 'active':
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Аукцион не активен"})}

        cur.execute(f"""
            INSERT INTO {SCHEMA}.auto_bids (lot_id, user_id, user_name, user_avatar, max_amount)
            VALUES ({int(lot_id)}, '{uid}', '{uname}', '{uavatar}', {int(max_amount)})
            ON CONFLICT (lot_id, user_id) DO UPDATE
              SET max_amount = EXCLUDED.max_amount,
                  user_name = EXCLUDED.user_name,
                  user_avatar = EXCLUDED.user_avatar
        """)
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── Разместить обычную ставку ─────────────────────────────────────────────
    amount = body.get("amount")
    if not amount:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указана сумма"})}

    conn = get_conn()
    cur = conn.cursor()
    now = datetime.now(timezone.utc)

    try:
        bid_id, new_ends_at, extended = place_bid_internal(
            cur, int(lot_id), int(amount), user_id, user_name, user_avatar, now
        )
        conn.commit()
    except ValueError as e:
        conn.rollback()
        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": str(e)})}

    result = {
        "ok": True,
        "bidId": bid_id,
        "newPrice": int(amount),
        "extended": extended,
        "newEndsAt": new_ends_at.isoformat(),
    }

    # Проверяем автоставки конкурентов
    try:
        process_auto_bids(conn, cur, int(lot_id), int(amount), user_id)
    except Exception as e:
        print(f"[auto-bid] error: {e}")

    conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(result)}
