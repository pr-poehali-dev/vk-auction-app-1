"""
VK Widget API — отдаёт активные лоты аукциона в формате списка для виджета сообщества ВКонтакте.
Используется как endpoint для VK App Widgets (тип: list).
"""
import os
import json
import psycopg2


def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    schema = os.environ.get("MAIN_DB_SCHEMA", "public")

    cur.execute(f"""
        SELECT
            l.id,
            l.title,
            l.current_price,
            l.status,
            l.ends_at,
            l.image,
            COUNT(b.id) AS bid_count
        FROM {schema}.lots l
        LEFT JOIN {schema}.bids b ON b.lot_id = l.id
        WHERE l.status IN ('active', 'upcoming')
        GROUP BY l.id
        ORDER BY l.status DESC, l.ends_at ASC
        LIMIT 6
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    def format_price(n):
        return f"{int(n):,}".replace(",", "\u00a0") + "\u00a0₽"

    def time_left(ends_at_str):
        from datetime import datetime, timezone
        ends_at = ends_at_str
        if hasattr(ends_at, "tzinfo") and ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        diff = ends_at - now
        total = int(diff.total_seconds())
        if total <= 0:
            return "Завершается"
        h = total // 3600
        m = (total % 3600) // 60
        if h > 0:
            return f"Осталось {h}ч {m}м"
        return f"Осталось {m}м"

    # VK Widget «list» format
    rows_out = []
    for row in rows:
        lot_id, title, current_price, status, ends_at, image, bid_count = row
        item = {
            "title": title,
            "title_url": "",  # заполняется после регистрации Mini App
            "button": "Участвовать",
            "button_url": "",  # заполняется после регистрации Mini App
            "text": f"{format_price(current_price)} · {bid_count} ставок · {time_left(ends_at)}",
            "icon_id": "",
        }
        if image:
            item["icon_id"] = ""
            item["image_id"] = ""
        rows_out.append(item)

    widget = {
        "type": "list",
        "title": "🔨 Аукционы сообщества",
        "title_url": "",
        "rows": rows_out,
    }

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps(widget, ensure_ascii=False),
    }
