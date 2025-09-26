import asyncio
from fastapi import FastAPI, Depends, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.v1.api import api_router
from app.api.ws.websocket import websocket_endpoint
from app.api.ws.manager import start_heartbeat
from app.db.session import get_db
from app.services.pipeline_websocket import pipeline_websocket_service
from app.services.system_monitor import start_system_monitor, stop_system_monitor

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# WebSocket endpoint
@app.websocket(f"{settings.API_V1_STR}/ws")
async def websocket_route(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
    db: Session = Depends(get_db)
):
    await websocket_endpoint(websocket, token, db)


@app.get("/")
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "api_base": settings.API_V1_STR
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


@app.on_event("startup")
async def startup_event():
    """
    Application startup event handler.
    """
    print(f"🚀 Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"📊 API Documentation: http://localhost:8000/docs")
    print(f"🔗 WebSocket endpoint: ws://localhost:8000{settings.API_V1_STR}/ws")
    
    # Initialize Pipeline WebSocket Service
    pipeline_websocket_service.initialize()
    print("📡 Pipeline WebSocket Service initialized")
    
    # Start WebSocket heartbeat task
    asyncio.create_task(start_heartbeat())
    
    # Start system monitoring
    asyncio.create_task(start_system_monitor())


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown event handler.
    """
    print(f"🛑 Shutting down {settings.PROJECT_NAME}")
    
    # Stop system monitoring
    await stop_system_monitor()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
