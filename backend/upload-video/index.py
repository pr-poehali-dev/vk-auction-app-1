"""
Загрузка видео-файла в S3. Принимает base64-encoded файл, сохраняет в CDN.
POST / — { "filename": "video.mp4", "data": "<base64>", "contentType": "video/mp4" }
"""
import json
import os
import base64
import uuid
import boto3

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    filename = body.get("filename", "video.mp4")
    data_b64 = body.get("data", "")
    content_type = body.get("contentType", "video/mp4")

    if not data_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет данных файла"})}

    file_data = base64.b64decode(data_b64)
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
