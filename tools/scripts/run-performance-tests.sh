#!/bin/bash

# Performance Test Runner Script
# Runs all K6 performance tests with proper setup and teardown

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${ENVIRONMENT:-local}
SKIP_SETUP=${SKIP_SETUP:-false}
CLEAN_UP=${CLEAN_UP:-true}
OUTPUT_DIR=${OUTPUT_DIR:-./test-results/performance}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        print_error "k6 is not installed. Please install k6 first."
        echo "Installation instructions:"
        echo "  macOS: brew install k6"
        echo "  Ubuntu: sudo apt-get install k6"
        echo "  Or visit: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
}

# Function to setup test environment
setup_environment() {
    if [ "$SKIP_SETUP" = "true" ]; then
        print_warning "Skipping environment setup"
        return
    fi

    print_status "Setting up test environment..."

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    # Start LocalStack if running local tests
    if [ "$ENVIRONMENT" = "local" ]; then
        print_status "Starting LocalStack..."
        if ! pnpm local:up > /dev/null 2>&1; then
            print_warning "Failed to start LocalStack, continuing anyway"
        fi

        # Wait for LocalStack to be ready
        print_status "Waiting for LocalStack to be ready..."
        timeout=30
        while [ $timeout -gt 0 ]; do
            if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
                print_status "LocalStack is ready"
                break
            fi
            sleep 1
            timeout=$((timeout - 1))
        done

        if [ $timeout -eq 0 ]; then
            print_warning "LocalStack health check timed out"
        fi
    fi

    # Start application services if needed
    if [ "$ENVIRONMENT" = "local" ]; then
        print_status "Starting application services..."
        # Add commands to start your application services
        # For example:
        # pnpm nx serve web-app &
        # pnpm nx serve api-example &
        # sleep 10 # Wait for services to start
    fi
}

# Function to run a specific performance test
run_test() {
    local test_file=$1
    local test_name=$2
    local output_file="$OUTPUT_DIR/${test_name}-$(date +%Y%m%d-%H%M%S)"

    print_status "Running $test_name performance test..."

    # Run k6 test with JSON output for later analysis
    if k6 run \
        --env ENVIRONMENT="$ENVIRONMENT" \
        --out json="$output_file.json" \
        --summary-export="$output_file-summary.json" \
        "tools/performance/$test_file" > "$output_file.log" 2>&1; then
        print_status "$test_name test completed successfully"
        return 0
    else
        print_error "$test_name test failed"
        cat "$output_file.log"
        return 1
    fi
}

# Function to cleanup test environment
cleanup_environment() {
    if [ "$CLEAN_UP" = "false" ]; then
        print_warning "Skipping cleanup"
        return
    fi

    print_status "Cleaning up test environment..."

    # Stop application services
    if [ "$ENVIRONMENT" = "local" ]; then
        # Kill any started services
        # pkill -f "nx serve" || true
        true
    fi

    # Stop LocalStack
    if [ "$ENVIRONMENT" = "local" ]; then
        pnpm local:down > /dev/null 2>&1 || true
    fi
}

# Function to generate test report
generate_report() {
    print_status "Generating performance test report..."

    local report_file="$OUTPUT_DIR/performance-report-$(date +%Y%m%d-%H%M%S).html"

    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { border-left: 5px solid #4CAF50; }
        .failure { border-left: 5px solid #f44336; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
        .metric { background-color: #f9f9f9; padding: 10px; border-radius: 3px; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #333; }
        .metric-label { font-size: 0.9em; color: #666; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p><strong>Environment:</strong> $ENVIRONMENT</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>
EOF

    # Add test results for each test file
    for json_file in "$OUTPUT_DIR"/*.json; do
        if [ -f "$json_file" ] && [[ "$json_file" != *"-summary.json" ]]; then
            local test_name=$(basename "$json_file" .json | sed 's/-[0-9]*-[0-9]*$//')

            echo "    <div class=\"test-section success\">" >> "$report_file"
            echo "        <h2>$test_name</h2>" >> "$report_file"

            # Extract key metrics from JSON (simplified)
            if command -v jq &> /dev/null; then
                echo "        <div class=\"metrics\">" >> "$report_file"
                echo "            <div class=\"metric\">" >> "$report_file"
                echo "                <div class=\"metric-value\">Available in JSON</div>" >> "$report_file"
                echo "                <div class=\"metric-label\">Detailed metrics in $json_file</div>" >> "$report_file"
                echo "            </div>" >> "$report_file"
                echo "        </div>" >> "$report_file"
            fi

            echo "    </div>" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF
    <div class="test-section">
        <h2>Raw Test Files</h2>
        <p>Detailed test results are available in the following files:</p>
        <ul>
EOF

    # List all generated files
    for file in "$OUTPUT_DIR"/*; do
        if [ -f "$file" ]; then
            echo "            <li>$(basename "$file")</li>" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF
        </ul>
    </div>
</body>
</html>
EOF

    print_status "Report generated: $report_file"
}

# Main execution
main() {
    print_status "Starting performance test suite..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Output directory: $OUTPUT_DIR"

    # Check prerequisites
    check_k6

    # Setup
    setup_environment

    # Track test results
    local failed_tests=0
    local total_tests=0

    # Run API load test
    total_tests=$((total_tests + 1))
    if ! run_test "api-load.js" "api-load"; then
        failed_tests=$((failed_tests + 1))
    fi

    # Run Lambda performance test
    total_tests=$((total_tests + 1))
    if ! run_test "lambda-perf.js" "lambda-perf"; then
        failed_tests=$((failed_tests + 1))
    fi

    # Run database stress test
    total_tests=$((total_tests + 1))
    if ! run_test "db-stress.js" "db-stress"; then
        failed_tests=$((failed_tests + 1))
    fi

    # Generate report
    generate_report

    # Cleanup
    cleanup_environment

    # Summary
    print_status "Performance test suite completed"
    print_status "Tests run: $total_tests"
    print_status "Tests failed: $failed_tests"

    if [ $failed_tests -eq 0 ]; then
        print_status "All tests passed!"
        exit 0
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
Performance Test Runner

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV     Set test environment (local, staging, production)
    -s, --skip-setup         Skip environment setup
    -n, --no-cleanup         Skip cleanup after tests
    -o, --output-dir DIR     Set output directory for test results
    -h, --help              Show this help message

Environment Variables:
    ENVIRONMENT             Test environment (default: local)
    SKIP_SETUP             Skip setup (default: false)
    CLEAN_UP               Cleanup after tests (default: true)
    OUTPUT_DIR             Output directory (default: ./test-results/performance)

Examples:
    $0                                    # Run with defaults
    $0 -e staging                         # Run against staging environment
    $0 -s -n                             # Skip setup and cleanup
    $0 -o /tmp/perf-results              # Custom output directory

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        -n|--no-cleanup)
            CLEAN_UP=false
            shift
            ;;
        -o|--output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main