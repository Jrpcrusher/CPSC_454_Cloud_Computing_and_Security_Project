import os
from typing import BinaryIO, Optional

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv


load_dotenv()


class S3Service:
    """
    S3 service for:
    - user profile pictures
    - user public showcase images
    - private order images
    - order image downloads
    """

    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        self.region = os.getenv("AWS_REGION", "us-west-2")

        if not self.bucket_name:
            raise ValueError("AWS_S3_BUCKET_NAME environment variable is not set")

        self.s3 = boto3.client("s3", region_name=self.region)

    def _normalize_extension(self, filename: str, default: str = ".png") -> str:
        _, ext = os.path.splitext(filename)
        return ext.lower() if ext else default

    def _upload_file(self, file_obj: BinaryIO, key: str, content_type: str) -> dict:
        try:
            self.s3.upload_fileobj(
                Fileobj=file_obj,
                Bucket=self.bucket_name,
                Key=key,
                ExtraArgs={
                    "ContentType": content_type,
                    "ServerSideEncryption": "AES256",
                },
            )
            return {
                "bucket": self.bucket_name,
                "key": key,
            }
        except ClientError as e:
            raise RuntimeError(f"Failed to upload file to S3: {str(e)}")

    def asset_exists(self, key: str) -> bool:
        try:
            self.s3.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("404", "NoSuchKey", "NotFound"):
                return False
            raise

    def delete_asset(self, key: str) -> bool:
        try:
            self.s3.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False

    def get_presigned_download_url(self, key: str, expires_in: int = 300) -> str:
        try:
            return self.s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            raise RuntimeError(f"Could not generate presigned download URL: {str(e)}")


    # Path builders

    def get_pfp_key(self, user_id: str, extension: str = ".png") -> str:
        return f"users/{user_id}/pfp/current{extension}"

    def get_user_image_key(self, user_id: str, image_id: str, extension: str = ".png") -> str:
        return f"users/{user_id}/images/{image_id}{extension}"

    def get_order_image_key(self, order_id: str, file_name: str) -> str:
        return f"orders/{order_id}/{file_name}"


    # Profile picture functions

    def upload_pfp(
        self,
        file_obj: BinaryIO,
        user_id: str,
        filename: str = "current.png",
        content_type: str = "image/png",
    ) -> dict:
        ext = self._normalize_extension(filename, default=".png")
        key = self.get_pfp_key(user_id, ext)
        result = self._upload_file(file_obj, key, content_type)
        result["type"] = "pfp"
        return result

    def get_pfp(self, user_id: str, expires_in: int = 300) -> Optional[str]:
        png_key = self.get_pfp_key(user_id, ".png")
        jpg_key = self.get_pfp_key(user_id, ".jpg")
        jpeg_key = self.get_pfp_key(user_id, ".jpeg")

        for key in (png_key, jpg_key, jpeg_key):
            if self.asset_exists(key):
                return self.get_presigned_download_url(key, expires_in=expires_in)

        return None

    # User public showcase images


    def upload_user_public_image(
        self,
        file_obj: BinaryIO,
        user_id: str,
        image_id: str,
        filename: str,
        content_type: str,
    ) -> dict:
        ext = self._normalize_extension(filename, default=".png")
        key = self.get_user_image_key(user_id, image_id, ext)
        result = self._upload_file(file_obj, key, content_type)
        result["type"] = "user_public_image"
        result["image_id"] = image_id
        return result

    def get_user_public_images(self, user_id: str) -> list[dict]:
        prefix = f"users/{user_id}/images/"
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
            )

            contents = response.get("Contents", [])
            results = []

            for obj in contents:
                key = obj["Key"]
                results.append(
                    {
                        "key": key,
                        "url": self.get_presigned_download_url(key),
                    }
                )

            return results
        except ClientError as e:
            raise RuntimeError(f"Could not list user public images: {str(e)}")

    # Private order images

    def upload_order_image(
        self,
        file_obj: BinaryIO,
        order_id: str,
        file_name: str,
        content_type: str,
    ) -> dict:
        key = self.get_order_image_key(order_id, file_name)
        result = self._upload_file(file_obj, key, content_type)
        result["type"] = "order_image"
        result["order_id"] = order_id
        result["file_name"] = file_name
        return result

    def download_order_image(self, order_id: str, file_name: str, expires_in: int = 300) -> str:
        key = self.get_order_image_key(order_id, file_name)

        if not self.asset_exists(key):
            raise FileNotFoundError(f"Order image not found for key: {key}")

        return self.get_presigned_download_url(key, expires_in=expires_in)