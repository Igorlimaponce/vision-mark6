# AIOS Backend Development Setup

## Quick Start Commands

# 1. Setup environment
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Check health
curl http://localhost:8000/health

# 4. View API documentation
open http://localhost:8000/docs

# 5. Monitor Celery tasks
open http://localhost:5555

## Database Commands

# Reset database
docker-compose down -v
docker-compose up -d postgres redis
alembic upgrade head

# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

## Development Commands

# Run backend locally
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run Celery worker
celery -A app.workers.tasks worker --loglevel=info

# Run Celery beat (scheduler)
celery -A app.workers.tasks beat --loglevel=info

# Monitor with Flower
celery -A app.workers.tasks flower

## Testing Commands

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_fleet.py -v

## Docker Commands

# Build image
docker build -t aios-backend .

# View logs
docker-compose logs -f backend
docker-compose logs -f celery_worker
docker-compose logs -f postgres

# Restart specific service
docker-compose restart backend

# Clean up
docker-compose down -v
docker system prune -f

## Production Commands

# Build for production
docker build -t aios-backend:prod -f Dockerfile.prod .

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Check production health
curl https://your-domain.com/health
