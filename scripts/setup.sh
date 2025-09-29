#!/bin/bash

# NX Monorepo Template Setup Script
# This script sets up the development environment for the NX monorepo template

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
NX Monorepo Template Setup Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -s, --skip-deps     Skip dependency installation
    -t, --skip-tests    Skip initial test run
    -b, --skip-build    Skip initial build
    --no-localstack     Skip LocalStack setup
    --verbose           Enable verbose output

EXAMPLES:
    $0                  Full setup with all components
    $0 --skip-tests     Setup without running tests
    $0 --no-localstack  Setup without LocalStack

EOF
}

# Default options
SKIP_DEPS=false
SKIP_TESTS=false
SKIP_BUILD=false
NO_LOCALSTACK=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --no-localstack)
            NO_LOCALSTACK=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            set -x
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

log_info "Starting NX Monorepo Template setup..."

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

    if [[ $NODE_MAJOR -lt 18 ]]; then
        log_error "Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 18+."
        exit 1
    fi

    log_success "Node.js version $NODE_VERSION is supported"

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm@9.0.0
    fi

    PNPM_VERSION=$(pnpm --version)
    log_success "pnpm version $PNPM_VERSION is available"

    # Check Docker (for LocalStack)
    if [[ "$NO_LOCALSTACK" == false ]]; then
        if ! command -v docker &> /dev/null; then
            log_warning "Docker is not installed. LocalStack setup will be skipped."
            NO_LOCALSTACK=true
        else
            if ! docker info &> /dev/null; then
                log_warning "Docker is not running. LocalStack setup will be skipped."
                NO_LOCALSTACK=true
            else
                log_success "Docker is available and running"
            fi
        fi
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        log_warning "Git is not installed. Some features may not work properly."
    else
        log_success "Git is available"
    fi
}

# Install dependencies
install_dependencies() {
    if [[ "$SKIP_DEPS" == true ]]; then
        log_info "Skipping dependency installation"
        return
    fi

    log_info "Installing dependencies..."

    # Clear any existing node_modules and lock files
    if [[ -d "node_modules" ]]; then
        log_info "Removing existing node_modules..."
        rm -rf node_modules
    fi

    if [[ -f "pnpm-lock.yaml" ]]; then
        log_info "Removing existing pnpm-lock.yaml..."
        rm -f pnpm-lock.yaml
    fi

    # Install dependencies
    pnpm install --frozen-lockfile=false

    log_success "Dependencies installed successfully"
}

# Setup LocalStack
setup_localstack() {
    if [[ "$NO_LOCALSTACK" == true ]]; then
        log_info "Skipping LocalStack setup"
        return
    fi

    log_info "Setting up LocalStack..."

    # Create LocalStack directory
    mkdir -p .localstack

    # Start LocalStack
    log_info "Starting LocalStack services..."
    pnpm local:up

    # Wait for LocalStack to be ready
    log_info "Waiting for LocalStack to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:4566/_localstack/health &> /dev/null; then
            log_success "LocalStack is ready"
            break
        fi
        if [[ $i -eq 30 ]]; then
            log_error "LocalStack failed to start within 60 seconds"
            exit 1
        fi
        sleep 2
    done

    # Bootstrap LocalStack if script exists
    if [[ -f "scripts/local/bootstrap-localstack.sh" ]]; then
        log_info "Bootstrapping LocalStack..."
        pnpm local:bootstrap
    fi

    log_success "LocalStack setup completed"
}

# Initialize databases
initialize_databases() {
    log_info "Initializing databases..."

    # This would typically involve running migration scripts
    # For now, we'll just create a placeholder
    log_info "Database initialization completed (placeholder)"
}

# Configure environment variables
configure_environment() {
    log_info "Configuring environment variables..."

    # Create .env.local if it doesn't exist
    if [[ ! -f ".env.local" ]]; then
        cat > .env.local << EOF
# Local development environment variables
NODE_ENV=development
AWS_REGION=us-west-2
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Database URLs (adjust as needed)
DATABASE_URL=postgresql://localhost:5432/nx_template_dev

# Feature flags
FLIPT_URL=http://localhost:8080

# Other local settings
LOG_LEVEL=debug
EOF
        log_success "Created .env.local with default development settings"
    else
        log_info ".env.local already exists, skipping creation"
    fi
}

# Build all projects
build_projects() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_info "Skipping build"
        return
    fi

    log_info "Building all projects..."
    pnpm build
    log_success "Build completed successfully"
}

# Run initial tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_info "Skipping tests"
        return
    fi

    log_info "Running initial tests..."
    pnpm test:unit
    log_success "Tests completed successfully"
}

# Display success message
show_success_message() {
    echo
    log_success "🎉 NX Monorepo Template setup completed successfully!"
    echo
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Review and update .env.local with your specific settings"
    echo "  2. Run 'pnpm test' to execute all tests"
    echo "  3. Run 'pnpm dev' to start development servers"
    echo "  4. Visit the documentation for more information"
    echo
    echo -e "${GREEN}Available commands:${NC}"
    echo "  pnpm build          - Build all projects"
    echo "  pnpm test           - Run all tests"
    echo "  pnpm lint           - Lint all projects"
    echo "  pnpm local:up       - Start LocalStack"
    echo "  pnpm local:down     - Stop LocalStack"
    echo
    echo -e "${GREEN}Useful scripts:${NC}"
    echo "  ./scripts/cleanup.sh - Clean up development environment"
    echo "  ./scripts/release.sh - Create a new release"
    echo
}

# Main execution
main() {
    check_requirements
    install_dependencies
    setup_localstack
    initialize_databases
    configure_environment
    build_projects
    run_tests
    show_success_message
}

# Trap errors and cleanup
cleanup_on_error() {
    log_error "Setup failed. Cleaning up..."
    if [[ "$NO_LOCALSTACK" == false ]]; then
        pnpm local:down 2>/dev/null || true
    fi
}

trap cleanup_on_error ERR

# Run main function
main "$@"