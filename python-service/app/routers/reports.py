from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from app.services.report_service import report_service
from app.services.analytics_service import analytics_service

router = APIRouter()

@router.get("/daily/pdf")
async def get_daily_pdf_report(date: str = Query(None)):
    try:
        from datetime import datetime
        target_date = datetime.strptime(date, '%Y-%m-%d') if date else None
        analytics = await analytics_service.get_daily_analytics(target_date)
        pdf_bytes = report_service.generate_daily_pdf_report(analytics)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=daily-report-{analytics['date']}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/charts/revenue")
async def get_revenue_chart(days: int = Query(30)):
    try:
        analytics = await analytics_service.get_monthly_analytics()
        chart_data = analytics.get('daily_breakdown', [])
        chart_base64 = report_service.generate_revenue_chart(chart_data)
        
        if not chart_base64:
            return {"success": True, "data": None, "message": "No data available"}
        
        return {
            "success": True,
            "data": f"data:image/png;base64,{chart_base64}",
            "period": "monthly"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/charts/categories")
async def get_category_chart():
    try:
        analytics = await analytics_service.get_monthly_analytics()
        chart_data = analytics.get('category_breakdown', [])
        chart_base64 = report_service.generate_category_chart(chart_data)
        
        if not chart_base64:
            return {"success": True, "data": None, "message": "No data available"}
        
        return {
            "success": True,
            "data": f"data:image/png;base64,{chart_base64}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
