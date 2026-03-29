import os
import uuid
from typing import BinaryIO, Optional

import boto3
from botocore.exceptions import ClientError


class S3Service:
    """
    Service layer for managing asset storage in AWS S3.

    Supports:
    - uploading original artwork
    - uploading watermarked preview artwork
    - checking whether an asset exists
    - generating presigned download/view URLs
    - deleting assets
    """

    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME")
        self.region = os.getenv("AWS_REGION", "us-west-2")

        if not self.bucket_name:
            raise ValueError("AWS_S3_BUCKET_NAME environment variable is not set")

        self.s3 = boto3.client("s3", region_name=self.region)

    def _build_original_key(self, artist_id: str, image_id: str, filename: str) -> str:
        ext = self._get_extension(filename)
        return f"originals/{artist_id}/{image_id}{ext}"

    def _build_preview_key(self, artist_id: str, image_id: str, filename: str) -> str:
        ext = self._get_extension(filename)
        return f"previews/{artist_id}/{image_id}_watermarked{ext}"

    def _get_extension(self, filename: str) -> str:
        _, ext = os.path.splitext(filename)
        return ext.lower() if ext else ""

    def upload_original(
        self,
        file_obj: BinaryIO,
        artist_id: str,
        filename: str,
        content_type: str,
        image_id: Optional[str] = None,
    ) -> dict:
        """
        Upload the original, protected artwork file to S3.
        Returns metadata including the generated image_id and object key.
        """
        if image_id is None:
            image_id = str(uuid.uuid4())

        key = self._build_original_key(artist_id, image_id, filename)

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
            "image_id": image_id,
            "bucket": self.bucket_name,
            "key": key,
            "type": "original",
        }

    def upload_preview(
        self,
        file_obj: BinaryIO,
        artist_id: str,
        filename: str,
        content_type: str,
        image_id: str,
    ) -> dict:
        """
        Upload the watermarked preview artwork file to S3.
        Returns metadata including the S3 key.
        """
        key = self._build_preview_key(artist_id, image_id, filename)

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
            "image_id": image_id,
            "bucket": self.bucket_name,
            "key": key,
            "type": "preview",
        }

    def asset_exists(self, key: str) -> bool:
        """
        Check whether an S3 object exists.
        Useful for escrow verification before release.
        """
        try:
            self.s3.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("404", "NoSuchKey", "NotFound"):
                return False
            raise

    def get_presigned_download_url(self, key: str, expires_in: int = 300) -> str:
        """
        Generate a short-lived presigned URL for downloading a protected asset.
        This is what you would use to release the unwatermarked original after payment.
        """
        try:
            return self.s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            raise RuntimeError(f"Could not generate presigned download URL: {str(e)}")

    def delete_asset(self, key: str) -> bool:
        """
        Delete an object from S3.
        """
        try:
            self.s3.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False

    def get_original_key(self, artist_id: str, image_id: str, filename: str) -> str:
        return self._build_original_key(artist_id, image_id, filename)

    def get_preview_key(self, artist_id: str, image_id: str, filename: str) -> str:
        return self._build_preview_key(artist_id, image_id, filename)