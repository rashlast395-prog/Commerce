from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Richy's Eat AI Service",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@router.get("/ready")
async def readiness_check():
    return {"ready": True}
