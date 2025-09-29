#!/bin/bash

# NX Monorepo Template Cleanup Script
# This script cleans up the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
NX Monorepo Template Cleanup Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -f, --full          Full reset (removes all generated files and configs)
    -s, --soft          Soft cleanup (keeps node_modules and configs)
    --keep-docker       Keep Docker containers and volumes
    --keep-deps         Keep node_modules directory
    --keep-env          Keep environment files (.env.local)
    --keep-cache        Keep build cache and artifacts
    --dry-run           Show what would be cleaned without actually doing it
    --verbose           Enable verbose output
    -y, --yes           Skip confirmation prompts

CLEANUP LEVELS:
    Soft cleanup (default):
        - Stop running services
        - Clean build artifacts
        - Clean temporary files
        - Reset test databases

    Full cleanup (--full):
        - Everything from soft cleanup
        - Remove node_modules
        - Remove Docker containers and volumes
        - Remove environment files
        - Remove all caches
        - Reset git hooks

EXAMPLES:
    $0                  Soft cleanup with confirmation
    $0 --full -y        Full cleanup without confirmation
    $0 --dry-run        Show what would be cleaned
    $0 --keep-deps      Cleanup but keep node_modules

EOF
}

# Default options
FULL_RESET=false
SOFT_CLEANUP=true
KEEP_DOCKER=false
KEEP_DEPS=false
KEEP_ENV=false
KEEP_CACHE=false
DRY_RUN=false
VERBOSE=false
SKIP_CONFIRMATION=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--full)
            FULL_RESET=true
            SOFT_CLEANUP=false
            shift
            ;;
        -s|--soft)
            SOFT_CLEANUP=true
            FULL_RESET=false
            shift
            ;;
        --keep-docker)
            KEEP_DOCKER=true
            shift
            ;;
        --keep-deps)
            KEEP_DEPS=true
            shift
            ;;
        --keep-env)
            KEEP_ENV=true
            shift
            ;;
        --keep-cache)
            KEEP_CACHE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRMATION=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Confirmation prompt
confirm_cleanup() {
    if [[ "$SKIP_CONFIRMATION" == true ]]; then
        return 0
    fi

    echo
    if [[ "$FULL_RESET" == true ]]; then
        log_warning "⚠️  FULL CLEANUP will remove:"
        echo "  • All node_modules"
        echo "  • All Docker containers and volumes"
        echo "  • All build artifacts and caches"
        echo "  • Environment files (.env.local)"
        echo "  • All temporary files"
    else
        log_info "SOFT CLEANUP will:"
        echo "  • Stop running services"
        echo "  • Clean build artifacts"
        echo "  • Clean temporary files"
        echo "  • Reset test databases"
        echo "  • Keep node_modules and environment files"
    fi

    echo
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
}

# Execute command with dry-run support
execute() {
    local cmd="$1"
    local description="$2"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would execute: $cmd"
        if [[ -n "$description" ]]; then
            echo "  Description: $description"
        fi
    else
        if [[ "$VERBOSE" == true ]]; then
            log_info "Executing: $cmd"
        fi
        eval "$cmd"
    fi
}

# Stop all running services
stop_services() {
    log_info "Stopping running services..."

    # Stop LocalStack
    if command -v docker &> /dev/null && docker ps | grep -q localstack; then
        execute "pnpm local:down" "Stop LocalStack"
        log_success "LocalStack stopped"
    fi

    # Stop any running development servers (common ports)
    local common_ports=(3000 3001 4200 8080 9000)
    for port in "${common_ports[@]}"; do
        local pid=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$pid" ]]; then
            execute "kill -TERM $pid" "Stop process on port $port"
            log_success "Stopped process on port $port"
        fi
    done

    # Stop any background npm/pnpm processes
    if pgrep -f "pnpm\|npm\|node" > /dev/null; then
        execute "pkill -f 'pnpm\|npm'" "Stop npm/pnpm processes"
    fi
}

# Clean Docker containers and volumes
clean_docker() {
    if [[ "$KEEP_DOCKER" == true ]]; then
        log_info "Keeping Docker containers and volumes"
        return
    fi

    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found, skipping Docker cleanup"
        return
    fi

    log_info "Cleaning Docker containers and volumes..."

    # Stop and remove containers
    local containers=$(docker ps -a --filter "name=localstack" --format "{{.ID}}" 2>/dev/null || true)
    if [[ -n "$containers" ]]; then
        execute "docker stop $containers" "Stop LocalStack containers"
        execute "docker rm $containers" "Remove LocalStack containers"
    fi

    # Remove volumes
    local volumes=$(docker volume ls --filter "name=nx-monorepo" --format "{{.Name}}" 2>/dev/null || true)
    if [[ -n "$volumes" ]]; then
        execute "docker volume rm $volumes" "Remove project volumes"
    fi

    # Clean up dangling images and volumes
    execute "docker system prune -f" "Clean up dangling Docker resources"

    log_success "Docker cleanup completed"
}

# Remove node_modules
clean_dependencies() {
    if [[ "$KEEP_DEPS" == true ]]; then
        log_info "Keeping node_modules"
        return
    fi

    log_info "Removing node_modules..."

    if [[ -d "node_modules" ]]; then
        execute "rm -rf node_modules" "Remove node_modules"
        log_success "node_modules removed"
    fi

    # Remove lock files
    if [[ -f "pnpm-lock.yaml" ]]; then
        execute "rm -f pnpm-lock.yaml" "Remove pnpm-lock.yaml"
    fi

    if [[ -f "package-lock.json" ]]; then
        execute "rm -f package-lock.json" "Remove package-lock.json"
    fi

    if [[ -f "yarn.lock" ]]; then
        execute "rm -f yarn.lock" "Remove yarn.lock"
    fi
}

# Clean build artifacts
clean_build_artifacts() {
    if [[ "$KEEP_CACHE" == true ]]; then
        log_info "Keeping build artifacts and cache"
        return
    fi

    log_info "Cleaning build artifacts..."

    # NX cache
    if [[ -d ".nx" ]]; then
        execute "rm -rf .nx" "Remove NX cache"
    fi

    # Common build directories
    local build_dirs=("dist" "build" "out" ".next" "coverage" ".nyc_output")
    for dir in "${build_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            execute "rm -rf $dir" "Remove $dir"
        fi
    done

    # TypeScript build info
    find . -name "*.tsbuildinfo" -type f 2>/dev/null | while read -r file; do
        execute "rm -f \"$file\"" "Remove TypeScript build info: $file"
    done

    # Jest cache
    if [[ -d ".jest" ]]; then
        execute "rm -rf .jest" "Remove Jest cache"
    fi

    # ESLint cache
    if [[ -f ".eslintcache" ]]; then
        execute "rm -f .eslintcache" "Remove ESLint cache"
    fi

    log_success "Build artifacts cleaned"
}

# Remove temporary files
clean_temporary_files() {
    log_info "Cleaning temporary files..."

    # Log files
    find . -name "*.log" -type f -not -path "./node_modules/*" 2>/dev/null | while read -r file; do
        execute "rm -f \"$file\"" "Remove log file: $file"
    done

    # Temporary directories
    local temp_dirs=("tmp" "temp" ".tmp" ".temp")
    for dir in "${temp_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            execute "rm -rf $dir" "Remove temporary directory: $dir"
        fi
    done

    # OS specific files
    find . -name ".DS_Store" -type f 2>/dev/null | while read -r file; do
        execute "rm -f \"$file\"" "Remove .DS_Store file: $file"
    done

    find . -name "Thumbs.db" -type f 2>/dev/null | while read -r file; do
        execute "rm -f \"$file\"" "Remove Thumbs.db file: $file"
    done

    # Editor files
    find . -name "*.swp" -o -name "*.swo" -o -name "*~" -type f 2>/dev/null | while read -r file; do
        execute "rm -f \"$file\"" "Remove editor temp file: $file"
    done

    log_success "Temporary files cleaned"
}

# Reset databases
reset_databases() {
    log_info "Resetting databases..."

    # Remove LocalStack data
    if [[ -d ".localstack" ]]; then
        execute "rm -rf .localstack" "Remove LocalStack data"
    fi

    # Reset test databases (this would be project-specific)
    log_info "Database reset completed (placeholder)"
}

# Remove environment files
clean_environment() {
    if [[ "$KEEP_ENV" == true ]]; then
        log_info "Keeping environment files"
        return
    fi

    log_info "Removing environment files..."

    local env_files=(".env.local" ".env.development" ".env.test" ".env.production")
    for file in "${env_files[@]}"; do
        if [[ -f "$file" ]]; then
            execute "rm -f $file" "Remove $file"
        fi
    done

    log_success "Environment files removed"
}

# Clean pnpm cache
clean_package_cache() {
    if [[ "$KEEP_CACHE" == true ]]; then
        return
    fi

    log_info "Cleaning package manager cache..."

    if command -v pnpm &> /dev/null; then
        execute "pnpm store prune" "Clean pnpm store"
    fi

    if command -v npm &> /dev/null; then
        execute "npm cache clean --force" "Clean npm cache"
    fi

    # Remove pnpm store directory if it exists
    if [[ -d ".pnpm-store" ]]; then
        execute "rm -rf .pnpm-store" "Remove .pnpm-store"
    fi

    log_success "Package cache cleaned"
}

# Display summary
show_summary() {
    echo
    if [[ "$DRY_RUN" == true ]]; then
        log_info "🔍 Dry run completed - no files were actually modified"
    else
        log_success "🧹 Cleanup completed successfully!"
    fi

    echo
    if [[ "$FULL_RESET" == true ]]; then
        echo -e "${GREEN}Full cleanup completed. To restart development:${NC}"
        echo "  1. Run './scripts/setup.sh' to reinstall everything"
        echo "  2. Or run 'pnpm install' to install dependencies only"
    else
        echo -e "${GREEN}Soft cleanup completed. To restart development:${NC}"
        echo "  1. Run 'pnpm local:up' to start LocalStack"
        echo "  2. Run 'pnpm dev' to start development servers"
    fi
    echo
}

# Main execution
main() {
    log_info "Starting NX Monorepo Template cleanup..."

    confirm_cleanup

    stop_services

    if [[ "$FULL_RESET" == true ]]; then
        clean_docker
        clean_dependencies
        clean_environment
        clean_package_cache
    fi

    clean_build_artifacts
    clean_temporary_files
    reset_databases

    show_summary
}

# Trap errors
cleanup_on_error() {
    log_error "Cleanup script failed"
    exit 1
}

trap cleanup_on_error ERR

# Run main function
main "$@"