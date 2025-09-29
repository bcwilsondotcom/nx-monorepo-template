#!/bin/bash

# spec-kit-bundle.sh
# Bundle API specifications for deployment with optimization and validation

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
DIST_DIR="${CONFIG_DIR}/dist"
BUNDLE_DIR="${DIST_DIR}/bundles"
DOCS_DIR="${DIST_DIR}/docs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default options
MINIFY=false
INCLUDE_EXAMPLES=true
INCLUDE_DOCS=true
OUTPUT_FORMATS=("yaml" "json")
VALIDATION_ENABLED=true
REMOVE_UNUSED=true
SPLIT_BY_TAG=false

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

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --minify)
            MINIFY=true
            shift
            ;;
        --no-examples)
            INCLUDE_EXAMPLES=false
            shift
            ;;
        --no-docs)
            INCLUDE_DOCS=false
            shift
            ;;
        --formats)
            IFS=',' read -ra OUTPUT_FORMATS <<< "$2"
            shift 2
            ;;
        --no-validation)
            VALIDATION_ENABLED=false
            shift
            ;;
        --keep-unused)
            REMOVE_UNUSED=false
            shift
            ;;
        --split-by-tag)
            SPLIT_BY_TAG=true
            shift
            ;;
        --output-dir)
            BUNDLE_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --minify              Minify output files"
            echo "  --no-examples         Remove examples from bundled specs"
            echo "  --no-docs             Skip documentation generation"
            echo "  --formats FORMATS     Comma-separated output formats (yaml,json)"
            echo "  --no-validation       Skip validation of bundled specs"
            echo "  --keep-unused         Keep unused components"
            echo "  --split-by-tag        Split specs by tags"
            echo "  --output-dir DIR      Custom output directory"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
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

setup_bundle_environment() {
    log_info "Setting up bundle environment..."

    # Create output directories
    mkdir -p "${BUNDLE_DIR}"/{openapi,asyncapi}/{yaml,json}
    mkdir -p "${DOCS_DIR}"/{openapi,asyncapi}
    mkdir -p "${DIST_DIR}/assets"

    # Install additional bundling tools if needed
    cd "${CONFIG_DIR}"

    local tools=(
        "@redocly/cli"
        "swagger-jsdoc"
        "js-yaml"
        "json-schema-ref-parser"
        "@apidevtools/swagger-parser"
        "redoc-cli"
        "@asyncapi/generator"
    )

    for tool in "${tools[@]}"; do
        if ! pnpm list "${tool}" &> /dev/null; then
            log_info "Installing ${tool}..."
            pnpm add "${tool}"
        fi
    done

    log_success "Bundle environment ready"
}

create_bundle_config() {
    log_info "Creating bundle configuration..."

    cat > "${CONFIG_DIR}/bundle.config.js" << EOF
module.exports = {
    bundle: {
        minify: ${MINIFY},
        includeExamples: ${INCLUDE_EXAMPLES},
        removeUnusedComponents: ${REMOVE_UNUSED},
        splitByTag: ${SPLIT_BY_TAG},
        outputFormats: [$(printf '"%s",' "${OUTPUT_FORMATS[@]}" | sed 's/,$//')]
    },
    validation: {
        enabled: ${VALIDATION_ENABLED},
        strict: true
    },
    docs: {
        enabled: ${INCLUDE_DOCS},
        theme: 'redoc',
        customCss: null,
        customJs: null
    },
    assets: {
        copyAssets: true,
        optimizeImages: true
    }
};
EOF

    log_success "Bundle configuration created"
}

bundle_openapi_spec() {
    local spec_file="$1"
    local spec_name="$(basename "${spec_file}" .yaml)"
    local output_base="${BUNDLE_DIR}/openapi"

    log_info "Bundling OpenAPI spec: ${spec_name}"

    # Create bundling script
    cat > "${CONFIG_DIR}/temp_bundle_openapi.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');
const RefParser = require('json-schema-ref-parser');

const specFile = process.argv[2];
const outputBase = process.argv[3];
const config = require('./bundle.config.js');

async function bundleSpec() {
    try {
        console.log(`📦 Bundling ${specFile}...`);

        // Parse and resolve all references
        let api = await SwaggerParser.bundle(specFile);

        // Remove unused components if configured
        if (config.bundle.removeUnusedComponents) {
            api = removeUnusedComponents(api);
        }

        // Remove examples if configured
        if (!config.bundle.includeExamples) {
            api = removeExamples(api);
        }

        // Validate bundled spec if configured
        if (config.validation.enabled) {
            await SwaggerParser.validate(api);
            console.log('✅ Bundled spec is valid');
        }

        const specName = path.basename(specFile, '.yaml');

        // Output in requested formats
        for (const format of config.bundle.outputFormats) {
            const outputDir = path.join(outputBase, format);
            const outputFile = path.join(outputDir, `${specName}.${format}`);

            let content;
            if (format === 'yaml') {
                content = yaml.dump(api, {
                    indent: config.bundle.minify ? 0 : 2,
                    lineWidth: config.bundle.minify ? -1 : 80,
                    noRefs: true
                });
            } else if (format === 'json') {
                content = JSON.stringify(api, null, config.bundle.minify ? 0 : 2);
            }

            fs.writeFileSync(outputFile, content);
            console.log(`✓ Saved: ${outputFile}`);
        }

        // Split by tags if configured
        if (config.bundle.splitByTag) {
            await splitByTags(api, outputBase, specName);
        }

        return true;
    } catch (error) {
        console.error(`❌ Failed to bundle ${specFile}: ${error.message}`);
        return false;
    }
}

function removeUnusedComponents(api) {
    if (!api.components) return api;

    const usedRefs = new Set();
    const refRegex = /#\/components\/([^\/]+)\/([^"'}\s]+)/g;

    // Find all references in the spec
    function findRefs(obj) {
        if (typeof obj === 'string') {
            let match;
            while ((match = refRegex.exec(obj)) !== null) {
                usedRefs.add(`${match[1]}.${match[2]}`);
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(findRefs);
        } else if (obj && typeof obj === 'object') {
            Object.values(obj).forEach(findRefs);
        }
    }

    findRefs(api);

    // Remove unused components
    for (const componentType in api.components) {
        for (const componentName in api.components[componentType]) {
            const refKey = `${componentType}.${componentName}`;
            if (!usedRefs.has(refKey)) {
                delete api.components[componentType][componentName];
            }
        }
    }

    return api;
}

function removeExamples(api) {
    function removeExamplesRecursive(obj) {
        if (Array.isArray(obj)) {
            obj.forEach(removeExamplesRecursive);
        } else if (obj && typeof obj === 'object') {
            delete obj.example;
            delete obj.examples;
            Object.values(obj).forEach(removeExamplesRecursive);
        }
    }

    removeExamplesRecursive(api);
    return api;
}

async function splitByTags(api, outputBase, specName) {
    if (!api.tags || api.tags.length === 0) return;

    console.log('📂 Splitting spec by tags...');

    for (const tag of api.tags) {
        const tagSpec = JSON.parse(JSON.stringify(api)); // Deep clone
        tagSpec.paths = {};

        // Include only paths with this tag
        for (const path in api.paths) {
            for (const method in api.paths[path]) {
                const operation = api.paths[path][method];
                if (operation.tags && operation.tags.includes(tag.name)) {
                    if (!tagSpec.paths[path]) {
                        tagSpec.paths[path] = {};
                    }
                    tagSpec.paths[path][method] = operation;
                }
            }
        }

        // Skip empty tag specs
        if (Object.keys(tagSpec.paths).length === 0) continue;

        tagSpec.info.title = `${api.info.title} - ${tag.name}`;
        tagSpec.tags = [tag];

        // Save tag-specific spec
        for (const format of config.bundle.outputFormats) {
            const outputDir = path.join(outputBase, 'tags', format);
            fs.mkdirSync(outputDir, { recursive: true });

            const outputFile = path.join(outputDir, `${specName}-${tag.name.toLowerCase()}.${format}`);

            let content;
            if (format === 'yaml') {
                content = yaml.dump(tagSpec, { indent: 2 });
            } else if (format === 'json') {
                content = JSON.stringify(tagSpec, null, 2);
            }

            fs.writeFileSync(outputFile, content);
            console.log(`✓ Tag spec saved: ${outputFile}`);
        }
    }
}

bundleSpec().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

    # Run bundling
    if cd "${CONFIG_DIR}" && node temp_bundle_openapi.js "${spec_file}" "${output_base}"; then
        echo -e "  ${GREEN}✓ Bundled successfully${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Bundle failed${NC}"
        return 1
    fi
}

bundle_asyncapi_spec() {
    local spec_file="$1"
    local spec_name="$(basename "${spec_file}" .yaml)"
    local output_base="${BUNDLE_DIR}/asyncapi"

    log_info "Bundling AsyncAPI spec: ${spec_name}"

    # Create bundling script for AsyncAPI
    cat > "${CONFIG_DIR}/temp_bundle_asyncapi.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parse } = require('@asyncapi/parser');

const specFile = process.argv[2];
const outputBase = process.argv[3];
const config = require('./bundle.config.js');

async function bundleSpec() {
    try {
        console.log(`📦 Bundling ${specFile}...`);

        const content = fs.readFileSync(specFile, 'utf8');
        const document = await parse(content);

        if (document.hasErrors()) {
            console.error('❌ AsyncAPI spec has errors:', document.errors.map(e => e.message).join(', '));
            return false;
        }

        let spec = document.json();

        // Remove examples if configured
        if (!config.bundle.includeExamples) {
            spec = removeExamples(spec);
        }

        const specName = path.basename(specFile, '.yaml');

        // Output in requested formats
        for (const format of config.bundle.outputFormats) {
            const outputDir = path.join(outputBase, format);
            const outputFile = path.join(outputDir, `${specName}.${format}`);

            let content;
            if (format === 'yaml') {
                content = yaml.dump(spec, {
                    indent: config.bundle.minify ? 0 : 2,
                    lineWidth: config.bundle.minify ? -1 : 80
                });
            } else if (format === 'json') {
                content = JSON.stringify(spec, null, config.bundle.minify ? 0 : 2);
            }

            fs.writeFileSync(outputFile, content);
            console.log(`✓ Saved: ${outputFile}`);
        }

        return true;
    } catch (error) {
        console.error(`❌ Failed to bundle ${specFile}: ${error.message}`);
        return false;
    }
}

function removeExamples(spec) {
    function removeExamplesRecursive(obj) {
        if (Array.isArray(obj)) {
            obj.forEach(removeExamplesRecursive);
        } else if (obj && typeof obj === 'object') {
            delete obj.examples;
            Object.values(obj).forEach(removeExamplesRecursive);
        }
    }

    removeExamplesRecursive(spec);
    return spec;
}

bundleSpec().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

    # Run bundling
    if cd "${CONFIG_DIR}" && node temp_bundle_asyncapi.js "${spec_file}" "${output_base}"; then
        echo -e "  ${GREEN}✓ Bundled successfully${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Bundle failed${NC}"
        return 1
    fi
}

generate_documentation() {
    log_section "Generating Documentation"

    if [[ "${INCLUDE_DOCS}" != "true" ]]; then
        log_info "Documentation generation disabled"
        return 0
    fi

    local doc_errors=0

    # Generate OpenAPI documentation
    log_info "Generating OpenAPI documentation..."

    local openapi_files=()
    while IFS= read -r -d '' file; do
        openapi_files+=("$file")
    done < <(find "${BUNDLE_DIR}/openapi/yaml" -name "*.yaml" -type f -print0 2>/dev/null)

    for spec_file in "${openapi_files[@]}"; do
        local spec_name="$(basename "${spec_file}" .yaml)"
        local doc_output="${DOCS_DIR}/openapi/${spec_name}.html"

        log_info "Generating docs for ${spec_name}..."

        # Generate Redoc documentation
        if cd "${CONFIG_DIR}" && npx redoc-cli build "${spec_file}" --output "${doc_output}" --options.theme.colors.primary.main="#1976d2"; then
            echo -e "  ${GREEN}✓ Documentation generated${NC}"
        else
            echo -e "  ${RED}✗ Documentation failed${NC}"
            doc_errors=$((doc_errors + 1))
        fi
    done

    # Generate AsyncAPI documentation
    log_info "Generating AsyncAPI documentation..."

    local asyncapi_files=()
    while IFS= read -r -d '' file; do
        asyncapi_files+=("$file")
    done < <(find "${BUNDLE_DIR}/asyncapi/yaml" -name "*.yaml" -type f -print0 2>/dev/null)

    for spec_file in "${asyncapi_files[@]}"; do
        local spec_name="$(basename "${spec_file}" .yaml)"
        local doc_output="${DOCS_DIR}/asyncapi/${spec_name}.html"

        log_info "Generating AsyncAPI docs for ${spec_name}..."

        # Generate AsyncAPI HTML documentation
        if cd "${CONFIG_DIR}" && npx @asyncapi/generator "${spec_file}" @asyncapi/html-template -o "${DOCS_DIR}/asyncapi/${spec_name}" --force-write; then
            echo -e "  ${GREEN}✓ AsyncAPI documentation generated${NC}"
        else
            echo -e "  ${RED}✗ AsyncAPI documentation failed${NC}"
            doc_errors=$((doc_errors + 1))
        fi
    done

    # Generate index page
    generate_docs_index

    if [[ ${doc_errors} -eq 0 ]]; then
        log_success "All documentation generated successfully"
    else
        log_warning "${doc_errors} documentation generation(s) failed"
    fi
}

generate_docs_index() {
    log_info "Generating documentation index..."

    local index_file="${DOCS_DIR}/index.html"

    cat > "${index_file}" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 30px;
        }
        .api-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .api-card {
            border: 1px solid #e9ecef;
            border-radius: 6px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .api-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .api-header {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .api-content {
            padding: 20px;
        }
        .api-title {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .api-type {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: 500;
            margin-bottom: 15px;
        }
        .openapi { background: #d4edda; color: #155724; }
        .asyncapi { background: #cce5ff; color: #004085; }
        .api-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 0.9em;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .btn-primary {
            background: #007bff;
            color: white;
        }
        .btn-primary:hover {
            background: #0056b3;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        .btn-secondary:hover {
            background: #545b62;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            margin-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 API Documentation</h1>
            <p>Comprehensive API specifications and documentation for the NX monorepo.</p>
        </div>
        <div class="content">
            <div class="api-grid" id="api-grid">
                <!-- API cards will be inserted here -->
            </div>
            <div class="timestamp">
                Generated on: <span id="timestamp"></span>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString();

        // API specifications data
        const apiSpecs = [
            {
                name: 'Project API',
                type: 'openapi',
                description: 'Comprehensive REST API for project management',
                docs: 'openapi/project-api.html',
                spec: '../bundles/openapi/yaml/project-api.yaml'
            },
            {
                name: 'User API',
                type: 'openapi',
                description: 'User authentication and profile management',
                docs: 'openapi/user-api.html',
                spec: '../bundles/openapi/yaml/user-api.yaml'
            },
            {
                name: 'Admin API',
                type: 'openapi',
                description: 'Administrative dashboard and monitoring',
                docs: 'openapi/admin-api.html',
                spec: '../bundles/openapi/yaml/admin-api.yaml'
            },
            {
                name: 'Webhooks API',
                type: 'openapi',
                description: 'Webhook subscription and management',
                docs: 'openapi/webhooks-api.html',
                spec: '../bundles/openapi/yaml/webhooks-api.yaml'
            },
            {
                name: 'Events API',
                type: 'asyncapi',
                description: 'Event-driven architecture for project events',
                docs: 'asyncapi/events/index.html',
                spec: '../bundles/asyncapi/yaml/events.yaml'
            },
            {
                name: 'Notifications API',
                type: 'asyncapi',
                description: 'Real-time notification channels',
                docs: 'asyncapi/notifications/index.html',
                spec: '../bundles/asyncapi/yaml/notifications.yaml'
            },
            {
                name: 'Analytics API',
                type: 'asyncapi',
                description: 'Analytics and metrics streaming',
                docs: 'asyncapi/analytics/index.html',
                spec: '../bundles/asyncapi/yaml/analytics.yaml'
            },
            {
                name: 'Integration API',
                type: 'asyncapi',
                description: 'Third-party integration events',
                docs: 'asyncapi/integration/index.html',
                spec: '../bundles/asyncapi/yaml/integration.yaml'
            }
        ];

        // Generate API cards
        const grid = document.getElementById('api-grid');
        apiSpecs.forEach(api => {
            const card = document.createElement('div');
            card.className = 'api-card';
            card.innerHTML = `
                <div class="api-header">
                    <h3 class="api-title">${api.name}</h3>
                    <span class="api-type ${api.type}">${api.type.toUpperCase()}</span>
                </div>
                <div class="api-content">
                    <p>${api.description}</p>
                    <div class="api-links">
                        <a href="${api.docs}" class="btn btn-primary">📖 Documentation</a>
                        <a href="${api.spec}" class="btn btn-secondary">📄 Specification</a>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    </script>
</body>
</html>
EOF

    log_success "Documentation index generated: ${index_file}"
}

create_bundle_manifest() {
    log_info "Creating bundle manifest..."

    local manifest_file="${DIST_DIR}/manifest.json"

    cat > "${CONFIG_DIR}/temp_manifest.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = process.argv[2];
const manifestFile = process.argv[3];

function getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function scanDirectory(dir, basePath = '') {
    const items = [];

    if (!fs.existsSync(dir)) return items;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            items.push({
                type: 'directory',
                path: relativePath,
                name: entry.name
            });
            items.push(...scanDirectory(fullPath, relativePath));
        } else if (entry.isFile()) {
            const stats = fs.statSync(fullPath);
            items.push({
                type: 'file',
                path: relativePath,
                name: entry.name,
                size: stats.size,
                hash: getFileHash(fullPath),
                modified: stats.mtime.toISOString()
            });
        }
    }

    return items;
}

const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    bundles: {
        openapi: scanDirectory(path.join(distDir, 'bundles', 'openapi')),
        asyncapi: scanDirectory(path.join(distDir, 'bundles', 'asyncapi'))
    },
    documentation: scanDirectory(path.join(distDir, 'docs')),
    summary: {
        totalFiles: 0,
        totalSize: 0,
        formats: []
    }
};

// Calculate summary
const allFiles = [
    ...manifest.bundles.openapi,
    ...manifest.bundles.asyncapi,
    ...manifest.documentation
].filter(item => item.type === 'file');

manifest.summary.totalFiles = allFiles.length;
manifest.summary.totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
manifest.summary.formats = [...new Set(allFiles.map(file => path.extname(file.name).slice(1)).filter(Boolean))];

fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
console.log(`Manifest created: ${manifestFile}`);
EOF

    cd "${CONFIG_DIR}" && node temp_manifest.js "${DIST_DIR}" "${manifest_file}"
    rm -f "${CONFIG_DIR}/temp_manifest.js"

    log_success "Bundle manifest created: ${manifest_file}"
}

cleanup_temp_files() {
    log_info "Cleaning up temporary files..."

    # Remove temporary files
    rm -f "${CONFIG_DIR}"/temp_*.js

    log_success "Cleanup completed"
}

main() {
    log_section "API Specifications Bundling"

    check_dependencies
    setup_bundle_environment
    create_bundle_config

    local bundle_errors=0

    # Bundle OpenAPI specifications
    log_section "Bundling OpenAPI Specifications"

    local openapi_files=()
    while IFS= read -r -d '' file; do
        openapi_files+=("$file")
    done < <(find "${CONTRACTS_DIR}/openapi" -name "*.yaml" -type f -print0 2>/dev/null)

    if [[ ${#openapi_files[@]} -eq 0 ]]; then
        log_warning "No OpenAPI specifications found"
    else
        for spec_file in "${openapi_files[@]}"; do
            if ! bundle_openapi_spec "${spec_file}"; then
                bundle_errors=$((bundle_errors + 1))
            fi
        done
    fi

    # Bundle AsyncAPI specifications
    log_section "Bundling AsyncAPI Specifications"

    local asyncapi_files=()
    while IFS= read -r -d '' file; do
        asyncapi_files+=("$file")
    done < <(find "${CONTRACTS_DIR}/asyncapi" -name "*.yaml" -type f -print0 2>/dev/null)

    if [[ ${#asyncapi_files[@]} -eq 0 ]]; then
        log_warning "No AsyncAPI specifications found"
    else
        for spec_file in "${asyncapi_files[@]}"; do
            if ! bundle_asyncapi_spec "${spec_file}"; then
                bundle_errors=$((bundle_errors + 1))
            fi
        done
    fi

    # Generate documentation
    generate_documentation

    # Create manifest
    create_bundle_manifest

    # Cleanup
    cleanup_temp_files

    # Final status
    log_section "Bundle Summary"

    if [[ ${bundle_errors} -eq 0 ]]; then
        log_success "🎉 All specifications bundled successfully!"
        log_info "📁 Bundles available in: ${BUNDLE_DIR}"
        log_info "📚 Documentation available in: ${DOCS_DIR}"

        # Display bundle info
        local total_files=$(find "${BUNDLE_DIR}" -type f | wc -l)
        local total_size=$(du -sh "${BUNDLE_DIR}" | cut -f1)
        log_info "📊 Generated ${total_files} bundle files (${total_size})"

        exit 0
    else
        log_error "❌ ${bundle_errors} specification(s) failed to bundle"
        exit 1
    fi
}

# Run main function
main "$@"