#!/usr/bin/env python3

# Test script to check if models can be imported correctly
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, '/app')

try:
    print("Testing model imports...")
    
    # Test individual imports
    print("Importing base...")
    from app.db.session import Base
    
    print("Importing organization...")
    from app.db.models.organization import Organization
    
    print("Importing user...")
    from app.db.models.user import User
    
    print("Importing device...")
    from app.db.models.device import Device
    
    print("Importing pipeline models...")
    from app.db.models.pipeline import Pipeline, PipelineNode, PipelineEdge
    
    print("Importing event models...")
    from app.db.models.event import Event, Detection
    
    print("All models imported successfully!")
    
    # Check for metadata attributes
    print("\nChecking Device model attributes:")
    device_attrs = [attr for attr in dir(Device) if 'metadata' in attr.lower()]
    print(f"Device metadata-related attributes: {device_attrs}")
    
    print("\nChecking Event model attributes:")
    event_attrs = [attr for attr in dir(Event) if 'metadata' in attr.lower()]
    print(f"Event metadata-related attributes: {event_attrs}")
    
    print("\nTesting model creation...")
    # Just verify the classes can be instantiated (without saving to DB)
    device = Device()
    event = Event()
    print("Model instances created successfully!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("All tests passed!")
