from fastapi import APIRouter

from app.api.v1.endpoints import auth, fleet, pipelines, dashboard, events, websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(fleet.router, prefix="/fleet", tags=["fleet-management"])
api_router.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
