#!/bin/bash

# AIOS Backend Startup Script
# This script sets up and starts the AIOS backend services

set -e  # Exit on any error

echo "🚀 Starting AIOS Backend Setup..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

print_status "docker-compose is available"

# Create .env file if it doesn't exist
if [ ! -f ../.env ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.example ../.env
    print_status "Created .env file from template"
else
    print_status ".env file exists"
fi

# Stop any existing containers
print_warning "Stopping any existing containers..."
cd ..
docker-compose down --remove-orphans || true

# Build and start services
print_status "Building and starting services..."
docker-compose up --build -d

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if services are running
print_status "Checking service status..."

services=("postgres" "redis" "app" "celery-worker" "celery-beat")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "${service}.*Up"; then
        print_status "$service is running"
    else
        print_error "$service is not running"
        all_healthy=false
    fi
done

if [ "$all_healthy" = false ]; then
    print_error "Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Initialize database
print_status "Initializing database..."
docker-compose exec app python database/init_db.py

print_status "Backend setup complete!"

echo ""
echo "🌐 AIOS Backend is now running:"
echo "   • API Documentation: http://localhost:8000/docs"
echo "   • Health Check: http://localhost:8000/health"
echo "   • WebSocket Test: ws://localhost:8000/ws/{client_id}"
echo ""
echo "🔑 Default Login Credentials:"
echo "   • Admin: admin@aios.com / admin123"
echo "   • Operator: operator@aios.com / operator123"
echo "   • Viewer: viewer@aios.com / viewer123"
echo ""
echo "🐳 Docker Commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart: docker-compose restart"
echo ""
echo "📊 Database Access:"
echo "   • PostgreSQL: localhost:5432"
echo "   • Redis: localhost:6379"
echo ""
