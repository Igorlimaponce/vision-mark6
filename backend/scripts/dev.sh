#!/bin/bash

# AIOS Backend Development Script
# This script provides common development commands

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

show_help() {
    echo "AIOS Backend Development Commands"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show service logs"
    echo "  status      Show service status"
    echo "  shell       Access backend container shell"
    echo "  db-shell    Access database shell"
    echo "  redis-cli   Access Redis CLI"
    echo "  test        Run tests"
    echo "  migrate     Run database migrations"
    echo "  reset-db    Reset database (WARNING: destroys data)"
    echo "  build       Rebuild containers"
    echo "  clean       Clean up containers and volumes"
    echo "  help        Show this help message"
}

start_services() {
    print_header "Starting AIOS Backend Services"
    cd ..
    docker-compose up -d
    print_status "Services started"
}

stop_services() {
    print_header "Stopping AIOS Backend Services"
    cd ..
    docker-compose down
    print_status "Services stopped"
}

restart_services() {
    print_header "Restarting AIOS Backend Services"
    cd ..
    docker-compose restart
    print_status "Services restarted"
}

show_logs() {
    print_header "Service Logs"
    cd ..
    if [ -n "$2" ]; then
        docker-compose logs -f "$2"
    else
        docker-compose logs -f
    fi
}

show_status() {
    print_header "Service Status"
    cd ..
    docker-compose ps
}

access_shell() {
    print_header "Accessing Backend Container Shell"
    cd ..
    docker-compose exec app bash
}

access_db_shell() {
    print_header "Accessing Database Shell"
    cd ..
    docker-compose exec postgres psql -U aios_user -d aios_db
}

access_redis_cli() {
    print_header "Accessing Redis CLI"
    cd ..
    docker-compose exec redis redis-cli
}

run_tests() {
    print_header "Running Tests"
    cd ..
    docker-compose exec app python -m pytest tests/ -v
}

run_migrations() {
    print_header "Running Database Migrations"
    cd ..
    docker-compose exec app alembic upgrade head
    print_status "Migrations completed"
}

reset_database() {
    print_warning "This will destroy all data in the database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_header "Resetting Database"
        cd ..
        docker-compose down
        docker volume rm backend_postgres_data || true
        docker-compose up -d postgres redis
        sleep 5
        docker-compose up -d app
        sleep 5
        docker-compose exec app python database/init_db.py
        print_status "Database reset complete"
    else
        print_status "Database reset cancelled"
    fi
}

build_containers() {
    print_header "Building Containers"
    cd ..
    docker-compose build --no-cache
    print_status "Containers built"
}

clean_up() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_header "Cleaning Up"
        cd ..
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_status "Cleanup complete"
    else
        print_status "Cleanup cancelled"
    fi
}

# Main command handling
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "$@"
        ;;
    status)
        show_status
        ;;
    shell)
        access_shell
        ;;
    db-shell)
        access_db_shell
        ;;
    redis-cli)
        access_redis_cli
        ;;
    test)
        run_tests
        ;;
    migrate)
        run_migrations
        ;;
    reset-db)
        reset_database
        ;;
    build)
        build_containers
        ;;
    clean)
        clean_up
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
