#!/usr/bin/env python3
"""
AIOS Backend Initialization Script
This script sets up the initial database state and creates sample data.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to Python path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.models import *  # Import all models
from app.core.security import get_password_hash
from app.crud import crud_user, crud_device, crud_pipeline
from app.schemas.user import UserCreate
from app.schemas.device import DeviceCreate
from app.schemas.organization import OrganizationCreate
import uuid


def create_sample_organization(db: Session):
    """Create a sample organization."""
    org = Organization(
        name="AIOS Demo Organization",
        description="Organização de demonstração para o sistema AIOS"
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def create_sample_users(db: Session, organization_id: uuid.UUID):
    """Create sample users."""
    users_data = [
        {
            "email": "admin@aios.com",
            "password": "admin123",
            "full_name": "AIOS Administrator",
            "role": "admin"
        },
        {
            "email": "operator@aios.com", 
            "password": "operator123",
            "full_name": "System Operator",
            "role": "operator"
        },
        {
            "email": "viewer@aios.com",
            "password": "viewer123", 
            "full_name": "System Viewer",
            "role": "viewer"
        }
    ]
    
    created_users = []
    for user_data in users_data:
        user_create = UserCreate(
            email=user_data["email"],
            password=user_data["password"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            organization_id=organization_id
        )
        user = crud_user.create_user(db, user_create)
        created_users.append(user)
        print(f"✅ Created user: {user.email} ({user.role})")
    
    return created_users


def create_sample_devices(db: Session, organization_id: uuid.UUID):
    """Create sample devices."""
    devices_data = [
        {
            "name": "Câmera Portaria Principal",
            "device_type": "camera",
            "rtsp_url": "rtsp://demo:demo@192.168.1.100:554/stream1",
            "location": "Portaria - Entrada Principal",
            "metadata": {
                "model": "Hikvision DS-2CD2143G0-I",
                "resolution": "4MP",
                "night_vision": True
            }
        },
        {
            "name": "Câmera Estacionamento",
            "device_type": "camera", 
            "rtsp_url": "rtsp://demo:demo@192.168.1.101:554/stream1",
            "location": "Estacionamento - Área Externa",
            "metadata": {
                "model": "Dahua IPC-HFW4431R-Z",
                "resolution": "4MP",
                "ptz": True
            }
        },
        {
            "name": "Câmera Doca 1",
            "device_type": "camera",
            "rtsp_url": "rtsp://demo:demo@192.168.1.102:554/stream1", 
            "location": "Doca de Carga 1",
            "metadata": {
                "model": "Axis P1448-LE",
                "resolution": "8MP",
                "weatherproof": True
            }
        },
        {
            "name": "Sensor Temperatura Armazém",
            "device_type": "sensor",
            "location": "Armazém Principal",
            "metadata": {
                "type": "temperature",
                "range": "-40°C to 85°C",
                "accuracy": "±0.5°C"
            }
        }
    ]
    
    created_devices = []
    for device_data in devices_data:
        device_create = DeviceCreate(
            name=device_data["name"],
            device_type=device_data["device_type"],
            rtsp_url=device_data.get("rtsp_url"),
            location=device_data["location"],
            metadata=device_data["metadata"],
            organization_id=organization_id
        )
        device = crud_device.create_device(db, device_create)
        created_devices.append(device)
        print(f"✅ Created device: {device.name} ({device.device_type})")
    
    return created_devices


def init_database():
    """Initialize database with sample data."""
    print("🚀 Initializing AIOS database...")
    
    # Create tables
    from app.db.models import Base
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if organization already exists
        existing_org = db.query(Organization).first()
        if existing_org:
            print("⚠️  Database already initialized. Skipping sample data creation.")
            return
        
        # Create sample organization
        print("📝 Creating sample organization...")
        organization = create_sample_organization(db)
        
        # Create sample users
        print("👥 Creating sample users...")
        users = create_sample_users(db, organization.id)
        
        # Create sample devices
        print("📹 Creating sample devices...")
        devices = create_sample_devices(db, organization.id)
        
        print(f"""
🎉 Database initialization complete!

📊 Summary:
   • Organization: {organization.name}
   • Users: {len(users)}
   • Devices: {len(devices)}

🔑 Login Credentials:
   • Admin: admin@aios.com / admin123
   • Operator: operator@aios.com / operator123  
   • Viewer: viewer@aios.com / viewer123

🌐 Access Points:
   • API: http://localhost:8000
   • Docs: http://localhost:8000/docs
   • Health: http://localhost:8000/health
        """)
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
