import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from ipfs_routes import router as ipfs_router

load_dotenv()

app = FastAPI(title="SmartFreelance Backend", version="1.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ipfs_router, prefix="/api/ipfs", tags=["ipfs"])

@app.get("/")
def root():
    return {"status": "backend running"}

@app.get("/health")
def health():
    return {"ok": True}
