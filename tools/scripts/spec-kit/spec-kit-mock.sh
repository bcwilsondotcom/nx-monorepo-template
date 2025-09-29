#!/bin/bash

# spec-kit-mock.sh
# Generate mock servers from API specifications

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
CONTRACTS_DIR="${PROJECT_ROOT}/packages/contracts"
CONFIG_DIR="${PROJECT_ROOT}/.spec-kit"
PIDS_FILE="${CONFIG_DIR}/mock-servers.pids"

# Default options
SERVICES="all"
PORT_OFFSET=0
CORS_ENABLED=true
VALIDATION_ENABLED=true
PROXY_MODE=false
PROXY_TARGET=""
HOST="0.0.0.0"
BACKGROUND=false
LOG_LEVEL="info"

# Mock server configurations
declare -A MOCK_CONFIGS=(
    ["project"]="packages/contracts/openapi/project-api.yaml:3001"
    ["user"]="packages/contracts/openapi/user-api.yaml:3002"
    ["admin"]="packages/contracts/openapi/admin-api.yaml:3003"
    ["webhooks"]="packages/contracts/openapi/webhooks-api.yaml:3004"
)

# Helper functions
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

log_section() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
}

show_help() {
    cat << EOF
Usage: $0 [OPTIONS] [COMMAND]

Generate and manage mock API servers from OpenAPI specifications.

Commands:
  start                   Start mock servers (default)
  stop                    Stop all running mock servers
  restart                 Restart all mock servers
  status                  Show status of mock servers
  logs SERVICE            Show logs for a specific service

Options:
  -s, --services LIST     Comma-separated list of services to start (default: all)
                         Available: project, user, admin, webhooks
  -p, --port-offset N     Port offset for all services (default: 0)
  --host HOST            Host to bind to (default: 0.0.0.0)
  --no-cors              Disable CORS
  --no-validation        Disable request/response validation
  --proxy TARGET         Enable proxy mode to forward unmatched requests
  -b, --background       Run servers in background
  --log-level LEVEL      Log level: error, warn, info, debug (default: info)
  -h, --help             Show this help message

Examples:
  $0                                    # Start all mock servers
  $0 -s project,user                   # Start only project and user services
  $0 --port-offset 1000               # Start with ports 4001, 4002, etc.
  $0 --proxy http://localhost:8080    # Proxy unmatched requests
  $0 stop                             # Stop all servers
  $0 status                           # Show server status

Port Mapping:
  project:  3001 (+ offset)
  user:     3002 (+ offset)
  admin:    3003 (+ offset)
  webhooks: 3004 (+ offset)
EOF
}

# Parse command line arguments
COMMAND="start"

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|logs)
            COMMAND="$1"
            shift
            ;;
        -s|--services)
            SERVICES="$2"
            shift 2
            ;;
        -p|--port-offset)
            PORT_OFFSET="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --no-cors)
            CORS_ENABLED=false
            shift
            ;;
        --no-validation)
            VALIDATION_ENABLED=false
            shift
            ;;
        --proxy)
            PROXY_MODE=true
            PROXY_TARGET="$2"
            shift 2
            ;;
        -b|--background)
            BACKGROUND=true
            shift
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            if [[ "${COMMAND}" == "logs" && -z "${SERVICE_NAME:-}" ]]; then
                SERVICE_NAME="$1"
                shift
            else
                log_error "Unknown option: $1"
                show_help
                exit 1
            fi
            ;;
    esac
done

check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    # Check for required tools
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    if ! command -v pnpm &> /dev/null; then
        missing_deps+=("pnpm")
    fi

    # Check if spec-kit is initialized
    if [[ ! -d "${CONFIG_DIR}" ]]; then
        log_error "Spec-kit not initialized. Run spec-kit-init.sh first."
        exit 1
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi

    log_success "Dependencies check passed"
}

install_mock_tools() {
    log_info "Installing mock server tools..."

    cd "${CONFIG_DIR}"

    local tools=(
        "prism-cli"
        "express"
        "cors"
        "helmet"
        "morgan"
        "js-yaml"
        "chalk"
        "commander"
        "http-proxy-middleware"
    )

    for tool in "${tools[@]}"; do
        if ! pnpm list "${tool}" &> /dev/null; then
            log_info "Installing ${tool}..."
            pnpm add "${tool}"
        fi
    done

    log_success "Mock server tools ready"
}

create_mock_server() {
    local service_name="$1"
    local spec_file="$2"
    local port="$3"

    log_info "Creating enhanced mock server for ${service_name}..."

    # Create service-specific mock server
    cat > "${CONFIG_DIR}/mock-${service_name}.js" << EOF
#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

// Configuration
const config = {
    service: '${service_name}',
    spec: path.resolve(__dirname, '${spec_file}'),
    port: ${port},
    host: '${HOST}',
    cors: ${CORS_ENABLED},
    validation: ${VALIDATION_ENABLED},
    proxy: ${PROXY_MODE},
    proxyTarget: '${PROXY_TARGET}',
    logLevel: '${LOG_LEVEL}'
};

// Validate spec file exists
if (!fs.existsSync(config.spec)) {
    console.error(chalk.red(\`Specification file not found: \${config.spec}\`));
    process.exit(1);
}

// Load and validate OpenAPI spec
let apiSpec;
try {
    const specContent = fs.readFileSync(config.spec, 'utf8');
    apiSpec = yaml.load(specContent);
    console.log(chalk.blue(\`📖 Loaded \${apiSpec.info?.title || 'API'} v\${apiSpec.info?.version || 'unknown'}\`));
} catch (error) {
    console.error(chalk.red(\`Failed to load specification: \${error.message}\`));
    process.exit(1);
}

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
if (config.cors) {
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
    }));
}

// Logging
if (config.logLevel === 'debug') {
    app.use(morgan('combined'));
} else if (config.logLevel !== 'error') {
    app.use(morgan('short'));
}

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API info endpoint
app.get('/', (req, res) => {
    res.json({
        service: config.service,
        title: apiSpec.info?.title || 'API Mock Server',
        version: apiSpec.info?.version || '1.0.0',
        description: apiSpec.info?.description || 'Mock API server generated from OpenAPI specification',
        mockServer: true,
        endpoints: Object.keys(apiSpec.paths || {}),
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: config.service,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
    res.json(apiSpec);
});

// Start Prism mock server as child process
console.log(chalk.blue(\`🚀 Starting \${config.service} mock server on \${config.host}:\${config.port}\`));

const prismArgs = [
    'mock',
    '--host', config.host,
    '--port', (config.port + 100).toString(), // Prism runs on offset port
    '--cors'
];

if (config.validation) {
    prismArgs.push('--validate-request', '--validate-response');
}

if (config.logLevel === 'error') {
    prismArgs.push('--quiet');
} else if (config.logLevel === 'debug') {
    prismArgs.push('--verbose');
}

prismArgs.push(config.spec);

const prismProcess = spawn('npx', ['prism', ...prismArgs], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
});

let prismReady = false;

prismProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Prism is listening')) {
        prismReady = true;
        console.log(chalk.green(\`✅ Prism mock server ready on port \${config.port + 100}\`));
    }
    if (config.logLevel === 'debug') {
        console.log(chalk.gray(\`[Prism] \${output.trim()}\`));
    }
});

prismProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (config.logLevel !== 'error') {
        console.error(chalk.yellow(\`[Prism Error] \${error.trim()}\`));
    }
});

prismProcess.on('error', (error) => {
    console.error(chalk.red(\`Failed to start Prism: \${error.message}\`));
    process.exit(1);
});

prismProcess.on('exit', (code) => {
    if (code !== 0) {
        console.error(chalk.red(\`Prism exited with code \${code}\`));
        process.exit(code);
    }
});

// Proxy to Prism mock server
app.use('/api', createProxyMiddleware({
    target: \`http://\${config.host}:\${config.port + 100}\`,
    changeOrigin: true,
    pathRewrite: {
        '^/api': ''
    },
    onError: (err, req, res) => {
        console.error(chalk.red(\`Proxy error: \${err.message}\`));
        res.status(500).json({
            error: 'Mock server error',
            message: err.message,
            service: config.service
        });
    },
    onProxyReq: (proxyReq, req, res) => {
        if (config.logLevel === 'debug') {
            console.log(chalk.cyan(\`[Proxy] \${req.method} \${req.url}\`));
        }
    }
}));

// Proxy unmatched requests to target if configured
if (config.proxy && config.proxyTarget) {
    console.log(chalk.blue(\`🔄 Proxying unmatched requests to \${config.proxyTarget}\`));

    app.use('*', createProxyMiddleware({
        target: config.proxyTarget,
        changeOrigin: true,
        onError: (err, req, res) => {
            if (config.logLevel !== 'error') {
                console.error(chalk.yellow(\`Proxy to target failed: \${err.message}\`));
            }
            res.status(502).json({
                error: 'Proxy error',
                message: 'Failed to proxy request to target server',
                target: config.proxyTarget
            });
        }
    }));
}

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: \`Endpoint not found: \${req.method} \${req.originalUrl}\`,
        service: config.service,
        suggestion: 'Check the API documentation at /docs'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(chalk.red(\`Error: \${err.message}\`));
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        service: config.service
    });
});

// Start Express server
const server = app.listen(config.port, config.host, () => {
    console.log(chalk.green(\`🎭 \${config.service} mock server running on http://\${config.host}:\${config.port}\`));
    console.log(chalk.blue(\`   📚 API docs: http://\${config.host}:\${config.port}/docs\`));
    console.log(chalk.blue(\`   ❤️  Health check: http://\${config.host}:\${config.port}/health\`));
    console.log(chalk.blue(\`   🔌 API endpoints: http://\${config.host}:\${config.port}/api/*\`));

    if (config.proxy && config.proxyTarget) {
        console.log(chalk.blue(\`   🔄 Proxy target: \${config.proxyTarget}\`));
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(chalk.yellow(\`🛑 Stopping \${config.service} mock server...\`));

    server.close(() => {
        console.log(chalk.green(\`✅ \${config.service} mock server stopped\`));

        if (prismProcess && !prismProcess.killed) {
            prismProcess.kill('SIGTERM');
        }

        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log(chalk.yellow(\`\\n🛑 Stopping \${config.service} mock server...\`));

    server.close(() => {
        console.log(chalk.green(\`✅ \${config.service} mock server stopped\`));

        if (prismProcess && !prismProcess.killed) {
            prismProcess.kill('SIGTERM');
        }

        process.exit(0);
    });
});
EOF

    chmod +x "${CONFIG_DIR}/mock-${service_name}.js"
    log_success "Mock server created for ${service_name}"
}

start_mock_servers() {
    log_section "Starting Mock Servers"

    install_mock_tools

    # Determine services to start
    local services_to_start=()
    if [[ "${SERVICES}" == "all" ]]; then
        services_to_start=($(printf '%s\n' "${!MOCK_CONFIGS[@]}" | sort))
    else
        IFS=',' read -ra services_to_start <<< "${SERVICES}"
    fi

    # Clean up old PID file
    rm -f "${PIDS_FILE}"
    touch "${PIDS_FILE}"

    local started_count=0

    for service in "${services_to_start[@]}"; do
        service=$(echo "${service}" | xargs) # trim whitespace

        if [[ ! -v MOCK_CONFIGS["${service}"] ]]; then
            log_warning "Unknown service: ${service}"
            continue
        fi

        local config="${MOCK_CONFIGS[${service}]}"
        local spec_file="${config%:*}"
        local base_port="${config#*:}"
        local port=$((base_port + PORT_OFFSET))

        # Check if spec file exists
        local full_spec_path="${PROJECT_ROOT}/${spec_file}"
        if [[ ! -f "${full_spec_path}" ]]; then
            log_error "Specification file not found: ${full_spec_path}"
            continue
        fi

        # Check if port is available
        if netstat -ln 2>/dev/null | grep -q ":${port} "; then
            log_warning "Port ${port} is already in use for ${service}"
            continue
        fi

        log_info "Starting ${service} mock server on port ${port}..."

        # Create enhanced mock server
        create_mock_server "${service}" "../${spec_file}" "${port}"

        # Start the mock server
        if [[ "${BACKGROUND}" == "true" ]]; then
            cd "${CONFIG_DIR}"
            nohup node "mock-${service}.js" > "logs/mock-${service}.log" 2>&1 &
            local pid=$!
            echo "${service}:${pid}:${port}" >> "${PIDS_FILE}"
            log_success "Started ${service} mock server (PID: ${pid}) on port ${port}"
        else
            cd "${CONFIG_DIR}"
            node "mock-${service}.js" &
            local pid=$!
            echo "${service}:${pid}:${port}" >> "${PIDS_FILE}"
            echo -e "${GREEN}Started ${service} mock server (PID: ${pid}) on port ${port}${NC}"
        fi

        started_count=$((started_count + 1))
        sleep 1 # Give servers time to start
    done

    if [[ ${started_count} -eq 0 ]]; then
        log_error "No mock servers were started"
        exit 1
    fi

    log_success "Started ${started_count} mock server(s)"

    if [[ "${BACKGROUND}" != "true" ]]; then
        echo
        log_info "Press Ctrl+C to stop all servers"

        # Wait for all background processes
        wait
    else
        echo
        log_info "Mock servers running in background"
        log_info "Use '$0 status' to check server status"
        log_info "Use '$0 stop' to stop all servers"
    fi
}

stop_mock_servers() {
    log_section "Stopping Mock Servers"

    if [[ ! -f "${PIDS_FILE}" ]]; then
        log_warning "No running mock servers found"
        return 0
    fi

    local stopped_count=0

    while IFS=':' read -r service pid port; do
        if [[ -n "${pid}" ]]; then
            log_info "Stopping ${service} mock server (PID: ${pid})..."

            if kill -TERM "${pid}" 2>/dev/null; then
                # Wait for graceful shutdown
                local wait_count=0
                while kill -0 "${pid}" 2>/dev/null && [[ ${wait_count} -lt 10 ]]; do
                    sleep 1
                    wait_count=$((wait_count + 1))
                done

                # Force kill if still running
                if kill -0 "${pid}" 2>/dev/null; then
                    kill -KILL "${pid}" 2>/dev/null
                    log_warning "Force stopped ${service} mock server"
                else
                    log_success "Stopped ${service} mock server"
                fi

                stopped_count=$((stopped_count + 1))
            else
                log_warning "${service} mock server (PID: ${pid}) was not running"
            fi
        fi
    done < "${PIDS_FILE}"

    # Clean up
    rm -f "${PIDS_FILE}"
    rm -f "${CONFIG_DIR}"/mock-*.js

    if [[ ${stopped_count} -eq 0 ]]; then
        log_warning "No mock servers were stopped"
    else
        log_success "Stopped ${stopped_count} mock server(s)"
    fi
}

show_status() {
    log_section "Mock Server Status"

    if [[ ! -f "${PIDS_FILE}" ]]; then
        log_info "No mock servers are configured to run"
        return 0
    fi

    local running_count=0
    local total_count=0

    printf "%-12s %-8s %-6s %-8s %s\n" "SERVICE" "PID" "PORT" "STATUS" "URL"
    printf "%-12s %-8s %-6s %-8s %s\n" "--------" "---" "----" "------" "---"

    while IFS=':' read -r service pid port; do
        total_count=$((total_count + 1))

        if [[ -n "${pid}" ]]; then
            if kill -0 "${pid}" 2>/dev/null; then
                printf "%-12s %-8s %-6s %-8s %s\n" "${service}" "${pid}" "${port}" "$(echo -e "${GREEN}RUNNING${NC}")" "http://${HOST}:${port}"
                running_count=$((running_count + 1))
            else
                printf "%-12s %-8s %-6s %-8s %s\n" "${service}" "${pid}" "${port}" "$(echo -e "${RED}STOPPED${NC}")" "-"
            fi
        fi
    done < "${PIDS_FILE}"

    echo
    log_info "Status: ${running_count}/${total_count} mock servers running"

    if [[ ${running_count} -gt 0 ]]; then
        echo
        log_info "Available endpoints:"
        echo "  GET  /          - Service information"
        echo "  GET  /health    - Health check"
        echo "  GET  /docs      - API documentation"
        echo "  *    /api/*     - Mock API endpoints"
    fi
}

show_logs() {
    local service_name="$1"

    if [[ -z "${service_name}" ]]; then
        log_error "Service name is required for logs command"
        show_help
        exit 1
    fi

    local log_file="${CONFIG_DIR}/logs/mock-${service_name}.log"

    if [[ ! -f "${log_file}" ]]; then
        log_error "Log file not found: ${log_file}"
        log_info "Available services: ${!MOCK_CONFIGS[*]}"
        exit 1
    fi

    log_info "Showing logs for ${service_name} (${log_file})"
    echo
    tail -f "${log_file}"
}

restart_mock_servers() {
    log_section "Restarting Mock Servers"

    stop_mock_servers
    sleep 2
    start_mock_servers
}

main() {
    # Create logs directory
    mkdir -p "${CONFIG_DIR}/logs"

    case "${COMMAND}" in
        "start")
            check_dependencies
            start_mock_servers
            ;;
        "stop")
            stop_mock_servers
            ;;
        "restart")
            check_dependencies
            restart_mock_servers
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "${SERVICE_NAME:-}"
            ;;
        *)
            log_error "Unknown command: ${COMMAND}"
            show_help
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Shutting down mock servers...${NC}"; stop_mock_servers; exit 0' INT TERM

# Run main function
main "$@"