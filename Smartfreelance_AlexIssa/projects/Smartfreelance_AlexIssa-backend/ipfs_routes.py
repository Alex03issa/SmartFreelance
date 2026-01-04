import os
import tempfile
from datetime import datetime
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

load_dotenv()

router = APIRouter(tags=["ipfs"])

PINATA_JWT = os.getenv("PINATA_JWT")
PINATA_GATEWAY = os.getenv("PINATA_GATEWAY", "https://gateway.pinata.cloud")

PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"


def _headers():
    if not PINATA_JWT:
        raise HTTPException(status_code=500, detail="PINATA_JWT missing")
    return {"Authorization": f"Bearer {PINATA_JWT}"}


class DeliveryMetadataRequest(BaseModel):
    agreementId: str
    jobTitle: str
    clientWallet: Optional[str] = None
    freelancerWallet: Optional[str] = None
    freelancerName: Optional[str] = None


def render_image(req: DeliveryMetadataRequest, path: str):
    img = Image.new("RGB", (1200, 630), (245, 248, 255))
    d = ImageDraw.Draw(img)

    try:
        font_big = ImageFont.truetype("DejaVuSans.ttf", 48)
        font_med = ImageFont.truetype("DejaVuSans.ttf", 30)
        font_small = ImageFont.truetype("DejaVuSans.ttf", 22)
    except Exception:
        font_big = font_med = font_small = None

    d.text((60, 60), "SmartFreelance Delivery NFT", fill=(20, 40, 80), font=font_big)
    d.text((60, 140), f"Agreement: {req.agreementId}", fill=(30, 30, 30), font=font_med)
    d.text((60, 190), f"Job: {req.jobTitle}", fill=(30, 30, 30), font=font_med)

    if req.freelancerName:
        d.text((60, 260), f"Freelancer: {req.freelancerName}", fill=(50, 50, 50), font=font_small)

    if req.clientWallet:
        d.text((60, 300), f"Client: {req.clientWallet[:10]}…{req.clientWallet[-8:]}", fill=(80, 80, 80), font=font_small)

    d.text((60, 360), f"Issued: {datetime.utcnow().isoformat()}Z", fill=(90, 90, 90), font=font_small)

    img.save(path, "PNG")


@router.post("/delivery-metadata")
def create_delivery_metadata(req: DeliveryMetadataRequest):
    try:
        with tempfile.TemporaryDirectory() as tmp:
            img_path = os.path.join(tmp, f"{req.agreementId}.png")
            render_image(req, img_path)

            # Upload image
            with open(img_path, "rb") as f:
                r = requests.post(
                    PIN_FILE_URL,
                    headers=_headers(),
                    files={"file": f},
                    timeout=60,
                )
            if r.status_code >= 300:
                raise HTTPException(status_code=400, detail=r.text)

            img_cid = r.json()["IpfsHash"]
            image_url = f"{PINATA_GATEWAY}/ipfs/{img_cid}"

            # ARC3 metadata
            metadata = {
                "name": f"SmartFreelance Delivery {req.agreementId}",
                "description": "Proof of delivery for SmartFreelance agreement",
                "image": image_url,
                "image_mimetype": "image/png",
                "properties": req.dict(),
            }

            r = requests.post(
                PIN_JSON_URL,
                headers=_headers(),
                json={"pinataContent": metadata},
                timeout=60,
            )
            if r.status_code >= 300:
                raise HTTPException(status_code=400, detail=r.text)

            meta_cid = r.json()["IpfsHash"]
            metadata_url = f"{PINATA_GATEWAY}/ipfs/{meta_cid}#arc3"

            return {
                "metadataUrl": metadata_url,
                "imageUrl": image_url,
                "metadataCid": meta_cid,
                "imageCid": img_cid,
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
