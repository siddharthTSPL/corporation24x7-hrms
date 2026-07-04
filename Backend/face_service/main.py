"""
Face embedding microservice.

This is intentionally a single, dumb, reusable job: given an image,
find the face in it and return a 512-number vector describing that
face's geometry (an "embedding"). It knows nothing about organisations,
employees, or attendance — all of that logic lives in the Node backend.
Keeping it dumb means it never needs to change even if the rest of the
product grows.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000

The Node backend calls this at FACE_SERVICE_URL (see .env), default
http://localhost:8000
"""

import base64

import cv2
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

import insightface

app = FastAPI(title="Face Embedding Service")

# buffalo_l is a good accuracy/speed balance for CPU-only servers.
# ctx_id=-1 means CPU. Set ctx_id=0 if you have a CUDA GPU available.
model = insightface.app.FaceAnalysis(name="buffalo_l")
model.prepare(ctx_id=-1)


class ImageRequest(BaseModel):
    image_base64: str


@app.post("/embed")
def embed(req: ImageRequest):
    try:
        img_bytes = base64.b64decode(req.image_base64)
    except Exception:
        return {"error": "invalid_image"}

    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        return {"error": "invalid_image"}

    faces = model.get(img)
    if not faces:
        return {"error": "no_face_detected"}

    # If multiple faces appear in frame (e.g. someone walking past behind
    # the employee), use the largest one — almost always the person
    # standing closest to the kiosk.
    best_face = max(
        faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
    )

    return {"embedding": best_face.embedding.tolist()}


@app.get("/health")
def health():
    return {"status": "ok"}
