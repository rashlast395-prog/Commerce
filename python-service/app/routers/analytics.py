from fastapi import APIRouter, HTTPException
from app.services.analytics_service import analytics_service
from app.services.ml_service import ml_service

router = APIRouter()

@router.get("/daily")
async def get_daily_analytics(date: str = None):
    try:
        if date:
            from datetime import datetime
            target_date = datetime.strptime(date, '%Y-%m-%d')
            result = await analytics_service.get_daily_analytics(target_date)
        else:
            result = await analytics_service.get_daily_analytics()
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weekly")
async def get_weekly_analytics():
    try:
        result = await analytics_service.get_weekly_analytics()
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monthly")
async def get_monthly_analytics():
    try:
        result = await analytics_service.get_monthly_analytics()
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customers/segments")
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

@router.get("/predictions/demand")
async def predict_demand(days: int = 7):
    try:
        result = await ml_service.predict_demand(days)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
