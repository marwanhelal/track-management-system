#!/bin/bash

##############################################################################
# CDTMS Deployment Script for Contabo VPS
# This script handles deployment, updates, and management of the application
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="cdtms"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print section header
print_header() {
    echo ""
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "$1"
    print_message "$BLUE" "=========================================="
}

# Check if required files exist
check_requirements() {
    print_header "Checking Requirements"

    if [ ! -f "$ENV_FILE" ]; then
        print_message "$RED" "Error: $ENV_FILE not found!"
        print_message "$YELLOW" "Please create $ENV_FILE based on .env.production.example"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        print_message "$RED" "Error: Docker is not installed!"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_message "$RED" "Error: Docker Compose is not installed!"
        exit 1
    fi

    print_message "$GREEN" "✓ All requirements met"
}

# Create necessary directories
setup_directories() {
    print_header "Setting Up Directories"

    mkdir -p "$BACKUP_DIR"
    mkdir -p "./uploads"
    mkdir -p "./ssl"

    print_message "$GREEN" "✓ Directories created"
}

# Backup database
backup_database() {
    print_header "Creating Database Backup"

    if docker ps | grep -q "cdtms-postgres"; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="${BACKUP_DIR}/db_backup_${timestamp}.sql"

        docker exec cdtms-postgres pg_dump -U ${DB_USER:-cdtms} ${DB_NAME:-track_management} > "$backup_file"

        if [ -f "$backup_file" ]; then
            gzip "$backup_file"
            print_message "$GREEN" "✓ Database backed up to ${backup_file}.gz"
        else
            print_message "$YELLOW" "⚠ Backup failed, continuing anyway..."
        fi
    else
        print_message "$YELLOW" "⚠ Database container not running, skipping backup"
    fi
}

# Pull latest code
pull_code() {
    print_header "Pulling Latest Code"

    if [ -d ".git" ]; then
        git pull origin main
        print_message "$GREEN" "✓ Code updated"
    else
        print_message "$YELLOW" "⚠ Not a git repository, skipping pull"
    fi
}

# Build and start containers
deploy() {
    print_header "Building and Deploying"

    # Stop existing containers
    print_message "$YELLOW" "Stopping existing containers..."
    docker-compose down

    # Build new images
    print_message "$YELLOW" "Building new images..."
    docker-compose build --no-cache

    # Start containers
    print_message "$YELLOW" "Starting containers..."
    docker-compose up -d

    # Wait for services to be healthy
    print_message "$YELLOW" "Waiting for services to start..."
    sleep 10

    # Check container status
    docker-compose ps

    print_message "$GREEN" "✓ Deployment complete"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    # Wait for database to be ready
    sleep 5

    # Check if migration files exist
    if [ -d "./database/migrations" ]; then
        print_message "$YELLOW" "Applying database migrations..."

        # Copy migration files to container and execute
        for migration in ./database/migrations/*.sql; do
            if [ -f "$migration" ]; then
                filename=$(basename "$migration")
                print_message "$YELLOW" "Applying $filename..."
                docker exec -i cdtms-postgres psql -U ${DB_USER:-cdtms} -d ${DB_NAME:-track_management} < "$migration" || true
            fi
        done

        print_message "$GREEN" "✓ Migrations completed"
    else
        print_message "$YELLOW" "⚠ No migrations directory found"
    fi
}

# View logs
view_logs() {
    print_header "Application Logs"
    docker-compose logs -f --tail=100 backend
}

# Check application health
health_check() {
    print_header "Health Check"

    # Check if containers are running
    if ! docker ps | grep -q "cdtms-backend"; then
        print_message "$RED" "✗ Backend container is not running!"
        return 1
    fi

    # Check API health endpoint
    local api_port=${PORT:-10000}
    local health_url="http://localhost:${api_port}/api/v1/health"

    print_message "$YELLOW" "Checking health endpoint: $health_url"

    if curl -f -s "$health_url" > /dev/null; then
        print_message "$GREEN" "✓ API is healthy"
    else
        print_message "$RED" "✗ API health check failed"
        return 1
    fi

    # Show container stats
    print_message "$YELLOW" "\nContainer Status:"
    docker-compose ps

    return 0
}

# Cleanup old images and volumes
cleanup() {
    print_header "Cleaning Up"

    print_message "$YELLOW" "Removing unused Docker images..."
    docker image prune -f

    print_message "$YELLOW" "Removing old backups (keeping last 7)..."
    ls -t ${BACKUP_DIR}/db_backup_* 2>/dev/null | tail -n +8 | xargs -r rm

    print_message "$GREEN" "✓ Cleanup complete"
}

# Show usage
show_usage() {
    cat << EOF
Usage: ./deploy.sh [COMMAND]

Commands:
    deploy          Full deployment (pull, backup, build, deploy, migrate)
    update          Update application (pull, build, restart)
    start           Start all containers
    stop            Stop all containers
    restart         Restart all containers
    logs            View application logs
    backup          Create database backup
    migrate         Run database migrations
    health          Check application health
    cleanup         Remove old images and backups
    status          Show container status
    help            Show this help message

Examples:
    ./deploy.sh deploy          # Full deployment
    ./deploy.sh update          # Quick update
    ./deploy.sh logs            # View logs
    ./deploy.sh health          # Check health

EOF
}

# Main execution
main() {
    local command=${1:-help}

    case $command in
        deploy)
            check_requirements
            setup_directories
            pull_code
            backup_database
            deploy
            run_migrations
            health_check
            print_message "$GREEN" "\n🚀 Deployment successful!"
            ;;

        update)
            check_requirements
            pull_code
            backup_database
            deploy
            health_check
            print_message "$GREEN" "\n✓ Update successful!"
            ;;

        start)
            docker-compose up -d
            print_message "$GREEN" "✓ Containers started"
            ;;

        stop)
            docker-compose down
            print_message "$GREEN" "✓ Containers stopped"
            ;;

        restart)
            docker-compose restart
            print_message "$GREEN" "✓ Containers restarted"
            ;;

        logs)
            view_logs
            ;;

        backup)
            backup_database
            ;;

        migrate)
            run_migrations
            ;;

        health)
            health_check
            ;;

        cleanup)
            cleanup
            ;;

        status)
            docker-compose ps
            ;;

        help|*)
            show_usage
            ;;
    esac
}

# Run main function
main "$@"
