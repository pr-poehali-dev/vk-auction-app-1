"""
Генерирует presigned URL для загрузки видео напрямую в S3 с браузера.
POST / — { "filename": "video.mp4", "contentType": "video/mp4" }
Возвращает { "uploadUrl": "...", "cdnUrl": "..." }
"""
import json
import os
import uuid
import boto3
from botocore.config import Config

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
    content_type = body.get("contentType", "video/mp4")

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "mp4"
    key = f"videos/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
    )

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": "files", "Key": key, "ContentType": content_type},
        ExpiresIn=3600,
    )

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"uploadUrl": upload_url, "cdnUrl": cdn_url})}
