"""
Загрузка видео в S3. Принимает бинарный файл (multipart или base64).
POST / с заголовком X-Filename и X-Content-Type, тело — бинарные данные (base64encoded).
"""
import json
import os
import uuid
import base64
import boto3

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Filename, X-Content-Type",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    filename = headers.get("x-filename", "video.mp4")
    content_type = headers.get("x-content-type", "video/mp4")

    body = event.get("body", "")
    if event.get("isBase64Encoded"):
        file_data = base64.b64decode(body)
    else:
        file_data = body.encode() if isinstance(body, str) else body

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "mp4"
    key = f"videos/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=file_data, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": cdn_url})}
