"""
Multipart загрузка видео в S3 по частям (чанкам по 5МБ).
POST / action=init     — начать загрузку { filename, contentType }
POST / action=chunk    — загрузить часть { key, uploadId, partNumber, data(base64) }
POST / action=complete — завершить { key, uploadId, parts:[{PartNumber, ETag}] }
POST / action=abort    — отменить { key, uploadId }
"""
import json
import os
import uuid
import base64
import boto3

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

BUCKET = "files"


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")
    s3 = get_s3()

    if action == "init":
        filename = body.get("filename", "video.mp4")
        content_type = body.get("contentType", "video/mp4")
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "mp4"
        key = f"videos/{uuid.uuid4()}.{ext}"
        resp = s3.create_multipart_upload(Bucket=BUCKET, Key=key, ContentType=content_type)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "uploadId": resp["UploadId"],
            "key": key,
        })}

    elif action == "chunk":
        key = body["key"]
        upload_id = body["uploadId"]
        part_number = int(body["partNumber"])
        data = base64.b64decode(body["data"])
        resp = s3.upload_part(
            Bucket=BUCKET, Key=key, UploadId=upload_id,
            PartNumber=part_number, Body=data,
        )
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"etag": resp["ETag"]})}

    elif action == "complete":
        key = body["key"]
        upload_id = body["uploadId"]
        parts = body["parts"]
        s3.complete_multipart_upload(
            Bucket=BUCKET, Key=key, UploadId=upload_id,
            MultipartUpload={"Parts": parts},
        )
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": cdn_url})}

    elif action == "abort":
        s3.abort_multipart_upload(Bucket=BUCKET, Key=body["key"], UploadId=body["uploadId"])
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}
