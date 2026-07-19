from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import analytics, reports, predictions, health

app = FastAPI(
    title="Richy's Eat - AI & Analytics Service",
    description="Python microservice for analytics, reporting, and ML features",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])

@app.get("/")
async def root():
    return {"name": "Richy's Eat AI Service", "version": "2.0.0", "status": "ok"}
