from fastapi import APIRouter, HTTPException, Query
from app.services.ml_service import ml_service

router = APIRouter()

@router.get("/demand")
async def predict_demand(days: int = Query(7, ge=1, le=30)):
    try:
        result = await ml_service.predict_demand(days)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer-segments")
async def get_customer_segments():
    try:
        result = await ml_service.segment_customers()
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/anomalies")
async def detect_anomalies():
    try:
        result = await ml_service.detect_anomalies()
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
