#!/bin/bash

# spec-kit-diff.sh
# Show differences between API specification versions

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
REPORTS_DIR="${CONFIG_DIR}/reports/diff"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default options
OLD_SPEC=""
NEW_SPEC=""
OUTPUT_FORMAT="console"
OUTPUT_FILE=""
INCLUDE_DESCRIPTIONS=true
BREAKING_CHANGES_ONLY=false
SPEC_TYPE="auto"

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
Usage: $0 [OPTIONS] OLD_SPEC NEW_SPEC

Compare two API specifications and show differences.

Arguments:
  OLD_SPEC                Path to the old specification file
  NEW_SPEC                Path to the new specification file

Options:
  -f, --format FORMAT     Output format: console, json, html, markdown
  -o, --output FILE       Output file path
  --breaking-only         Show only breaking changes
  --no-descriptions       Exclude description changes
  --type TYPE             Specification type: openapi, asyncapi, auto
  -h, --help              Show this help message

Examples:
  $0 old-api.yaml new-api.yaml
  $0 --format html --output diff.html old-api.yaml new-api.yaml
  $0 --breaking-only --format json old-api.yaml new-api.yaml

Git Integration:
  # Compare with previous commit
  $0 HEAD~1:packages/contracts/openapi/user-api.yaml packages/contracts/openapi/user-api.yaml

  # Compare between branches
  $0 main:packages/contracts/openapi/user-api.yaml feature/new-endpoints:packages/contracts/openapi/user-api.yaml
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --breaking-only)
            BREAKING_CHANGES_ONLY=true
            shift
            ;;
        --no-descriptions)
            INCLUDE_DESCRIPTIONS=false
            shift
            ;;
        --type)
            SPEC_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            if [[ -z "${OLD_SPEC}" ]]; then
                OLD_SPEC="$1"
            elif [[ -z "${NEW_SPEC}" ]]; then
                NEW_SPEC="$1"
            else
                log_error "Too many arguments"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "${OLD_SPEC}" || -z "${NEW_SPEC}" ]]; then
    log_error "Both OLD_SPEC and NEW_SPEC are required"
    show_help
    exit 1
fi

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

resolve_spec_path() {
    local spec_path="$1"

    # Check if it's a git reference (contains :)
    if [[ "${spec_path}" == *":"* ]]; then
        local git_ref="${spec_path%%:*}"
        local file_path="${spec_path#*:}"

        log_info "Resolving git reference: ${git_ref}:${file_path}"

        # Create temporary file for git content
        local temp_file=$(mktemp)
        if git show "${git_ref}:${file_path}" > "${temp_file}" 2>/dev/null; then
            echo "${temp_file}"
            return 0
        else
            log_error "Failed to resolve git reference: ${git_ref}:${file_path}"
            rm -f "${temp_file}"
            return 1
        fi
    fi

    # Check if file exists
    if [[ ! -f "${spec_path}" ]]; then
        # Try relative to contracts directory
        local contracts_path="${CONTRACTS_DIR}/${spec_path}"
        if [[ -f "${contracts_path}" ]]; then
            echo "${contracts_path}"
            return 0
        fi

        log_error "Specification file not found: ${spec_path}"
        return 1
    fi

    echo "${spec_path}"
    return 0
}

detect_spec_type() {
    local spec_file="$1"

    if [[ "${SPEC_TYPE}" != "auto" ]]; then
        echo "${SPEC_TYPE}"
        return 0
    fi

    # Detect by content
    if head -20 "${spec_file}" | grep -q "openapi:" ; then
        echo "openapi"
    elif head -20 "${spec_file}" | grep -q "asyncapi:" ; then
        echo "asyncapi"
    else
        log_warning "Could not detect specification type, assuming OpenAPI"
        echo "openapi"
    fi
}

install_diff_tools() {
    log_info "Installing diff tools..."

    cd "${CONFIG_DIR}"

    local tools=(
        "openapi-diff"
        "@apidevtools/swagger-parser"
        "@asyncapi/parser"
        "js-yaml"
        "lodash"
        "chalk"
        "marked"
    )

    for tool in "${tools[@]}"; do
        if ! pnpm list "${tool}" &> /dev/null; then
            log_info "Installing ${tool}..."
            pnpm add "${tool}"
        fi
    done

    log_success "Diff tools ready"
}

diff_openapi_specs() {
    local old_spec="$1"
    local new_spec="$2"
    local output_format="$3"
    local output_file="$4"

    log_info "Comparing OpenAPI specifications..."

    # Create diff script
    cat > "${CONFIG_DIR}/temp_diff_openapi.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const _ = require('lodash');
const SwaggerParser = require('@apidevtools/swagger-parser');

const oldSpecFile = process.argv[2];
const newSpecFile = process.argv[3];
const outputFormat = process.argv[4];
const outputFile = process.argv[5];
const breakingOnly = process.argv[6] === 'true';
const includeDescriptions = process.argv[7] === 'true';

async function compareSpecs() {
    try {
        // Parse specifications
        const oldSpec = await SwaggerParser.dereference(oldSpecFile);
        const newSpec = await SwaggerParser.dereference(newSpecFile);

        const diff = {
            timestamp: new Date().toISOString(),
            oldSpec: {
                file: oldSpecFile,
                title: oldSpec.info?.title || 'Unknown',
                version: oldSpec.info?.version || 'Unknown'
            },
            newSpec: {
                file: newSpecFile,
                title: newSpec.info?.title || 'Unknown',
                version: newSpec.info?.version || 'Unknown'
            },
            summary: {
                hasChanges: false,
                hasBreakingChanges: false,
                pathsAdded: 0,
                pathsRemoved: 0,
                pathsModified: 0,
                operationsAdded: 0,
                operationsRemoved: 0,
                operationsModified: 0,
                schemasAdded: 0,
                schemasRemoved: 0,
                schemasModified: 0
            },
            changes: []
        };

        // Compare info section
        compareInfo(oldSpec.info, newSpec.info, diff);

        // Compare paths
        comparePaths(oldSpec.paths || {}, newSpec.paths || {}, diff);

        // Compare components
        compareComponents(oldSpec.components || {}, newSpec.components || {}, diff);

        // Generate output
        await generateOutput(diff, outputFormat, outputFile);

        return diff.summary.hasBreakingChanges ? 1 : 0;

    } catch (error) {
        console.error(chalk.red(`Error comparing specifications: ${error.message}`));
        return 2;
    }
}

function compareInfo(oldInfo, newInfo, diff) {
    if (!oldInfo || !newInfo) return;

    const changes = [];

    if (oldInfo.version !== newInfo.version) {
        changes.push({
            type: 'info',
            action: 'modified',
            field: 'version',
            oldValue: oldInfo.version,
            newValue: newInfo.version,
            breaking: false
        });
    }

    if (includeDescriptions && oldInfo.description !== newInfo.description) {
        changes.push({
            type: 'info',
            action: 'modified',
            field: 'description',
            oldValue: oldInfo.description,
            newValue: newInfo.description,
            breaking: false
        });
    }

    if (changes.length > 0) {
        diff.changes.push(...changes);
        diff.summary.hasChanges = true;
    }
}

function comparePaths(oldPaths, newPaths, diff) {
    const oldPathKeys = Object.keys(oldPaths);
    const newPathKeys = Object.keys(newPaths);

    // Added paths
    const addedPaths = newPathKeys.filter(path => !oldPathKeys.includes(path));
    addedPaths.forEach(path => {
        diff.changes.push({
            type: 'path',
            action: 'added',
            path: path,
            breaking: false
        });
        diff.summary.pathsAdded++;

        // Count added operations
        const operations = Object.keys(newPaths[path]).filter(key =>
            ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(key)
        );
        diff.summary.operationsAdded += operations.length;
    });

    // Removed paths
    const removedPaths = oldPathKeys.filter(path => !newPathKeys.includes(path));
    removedPaths.forEach(path => {
        diff.changes.push({
            type: 'path',
            action: 'removed',
            path: path,
            breaking: true
        });
        diff.summary.pathsRemoved++;
        diff.summary.hasBreakingChanges = true;

        // Count removed operations
        const operations = Object.keys(oldPaths[path]).filter(key =>
            ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(key)
        );
        diff.summary.operationsRemoved += operations.length;
    });

    // Modified paths
    const commonPaths = oldPathKeys.filter(path => newPathKeys.includes(path));
    commonPaths.forEach(path => {
        const pathChanges = comparePathOperations(oldPaths[path], newPaths[path], path);
        if (pathChanges.length > 0) {
            diff.changes.push(...pathChanges);
            diff.summary.pathsModified++;

            if (pathChanges.some(change => change.breaking)) {
                diff.summary.hasBreakingChanges = true;
            }
        }
    });

    if (diff.changes.some(change => change.type === 'path')) {
        diff.summary.hasChanges = true;
    }
}

function comparePathOperations(oldPath, newPath, pathName) {
    const changes = [];
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];

    const oldMethods = Object.keys(oldPath).filter(key => httpMethods.includes(key));
    const newMethods = Object.keys(newPath).filter(key => httpMethods.includes(key));

    // Added operations
    const addedMethods = newMethods.filter(method => !oldMethods.includes(method));
    addedMethods.forEach(method => {
        changes.push({
            type: 'operation',
            action: 'added',
            path: pathName,
            method: method.toUpperCase(),
            breaking: false
        });
    });

    // Removed operations
    const removedMethods = oldMethods.filter(method => !newMethods.includes(method));
    removedMethods.forEach(method => {
        changes.push({
            type: 'operation',
            action: 'removed',
            path: pathName,
            method: method.toUpperCase(),
            breaking: true
        });
    });

    // Modified operations
    const commonMethods = oldMethods.filter(method => newMethods.includes(method));
    commonMethods.forEach(method => {
        const operationChanges = compareOperation(oldPath[method], newPath[method], pathName, method);
        changes.push(...operationChanges);
    });

    return changes;
}

function compareOperation(oldOp, newOp, pathName, method) {
    const changes = [];

    // Compare parameters
    const oldParams = oldOp.parameters || [];
    const newParams = newOp.parameters || [];

    const oldParamNames = oldParams.map(p => `${p.name}-${p.in}`);
    const newParamNames = newParams.map(p => `${p.name}-${p.in}`);

    // Added parameters
    const addedParams = newParams.filter(p => !oldParamNames.includes(`${p.name}-${p.in}`));
    addedParams.forEach(param => {
        changes.push({
            type: 'parameter',
            action: 'added',
            path: pathName,
            method: method.toUpperCase(),
            parameter: param.name,
            location: param.in,
            required: param.required,
            breaking: param.required === true
        });
    });

    // Removed parameters
    const removedParams = oldParams.filter(p => !newParamNames.includes(`${p.name}-${p.in}`));
    removedParams.forEach(param => {
        changes.push({
            type: 'parameter',
            action: 'removed',
            path: pathName,
            method: method.toUpperCase(),
            parameter: param.name,
            location: param.in,
            breaking: true
        });
    });

    // Compare request body
    if (oldOp.requestBody || newOp.requestBody) {
        const requestBodyChanges = compareRequestBody(oldOp.requestBody, newOp.requestBody, pathName, method);
        changes.push(...requestBodyChanges);
    }

    // Compare responses
    const responseChanges = compareResponses(oldOp.responses || {}, newOp.responses || {}, pathName, method);
    changes.push(...responseChanges);

    return changes;
}

function compareRequestBody(oldBody, newBody, pathName, method) {
    const changes = [];

    if (!oldBody && newBody) {
        changes.push({
            type: 'request-body',
            action: 'added',
            path: pathName,
            method: method.toUpperCase(),
            required: newBody.required,
            breaking: newBody.required === true
        });
    } else if (oldBody && !newBody) {
        changes.push({
            type: 'request-body',
            action: 'removed',
            path: pathName,
            method: method.toUpperCase(),
            breaking: true
        });
    } else if (oldBody && newBody) {
        if (oldBody.required !== newBody.required) {
            changes.push({
                type: 'request-body',
                action: 'modified',
                path: pathName,
                method: method.toUpperCase(),
                field: 'required',
                oldValue: oldBody.required,
                newValue: newBody.required,
                breaking: newBody.required === true && oldBody.required !== true
            });
        }
    }

    return changes;
}

function compareResponses(oldResponses, newResponses, pathName, method) {
    const changes = [];

    const oldCodes = Object.keys(oldResponses);
    const newCodes = Object.keys(newResponses);

    // Added responses
    const addedCodes = newCodes.filter(code => !oldCodes.includes(code));
    addedCodes.forEach(code => {
        changes.push({
            type: 'response',
            action: 'added',
            path: pathName,
            method: method.toUpperCase(),
            statusCode: code,
            breaking: false
        });
    });

    // Removed responses
    const removedCodes = oldCodes.filter(code => !newCodes.includes(code));
    removedCodes.forEach(code => {
        const isSuccessResponse = code.startsWith('2');
        changes.push({
            type: 'response',
            action: 'removed',
            path: pathName,
            method: method.toUpperCase(),
            statusCode: code,
            breaking: isSuccessResponse
        });
    });

    return changes;
}

function compareComponents(oldComponents, newComponents, diff) {
    compareSchemas(oldComponents.schemas || {}, newComponents.schemas || {}, diff);
    compareResponses(oldComponents.responses || {}, newComponents.responses || {}, diff);
    compareParameters(oldComponents.parameters || {}, newComponents.parameters || {}, diff);
}

function compareSchemas(oldSchemas, newSchemas, diff) {
    const oldNames = Object.keys(oldSchemas);
    const newNames = Object.keys(newSchemas);

    // Added schemas
    const addedSchemas = newNames.filter(name => !oldNames.includes(name));
    addedSchemas.forEach(name => {
        diff.changes.push({
            type: 'schema',
            action: 'added',
            name: name,
            breaking: false
        });
        diff.summary.schemasAdded++;
    });

    // Removed schemas
    const removedSchemas = oldNames.filter(name => !newNames.includes(name));
    removedSchemas.forEach(name => {
        diff.changes.push({
            type: 'schema',
            action: 'removed',
            name: name,
            breaking: true
        });
        diff.summary.schemasRemoved++;
        diff.summary.hasBreakingChanges = true;
    });

    // Modified schemas (simplified comparison)
    const commonSchemas = oldNames.filter(name => newNames.includes(name));
    commonSchemas.forEach(name => {
        if (!_.isEqual(oldSchemas[name], newSchemas[name])) {
            diff.changes.push({
                type: 'schema',
                action: 'modified',
                name: name,
                breaking: false // Simplified - would need deeper analysis
            });
            diff.summary.schemasModified++;
        }
    });

    if (addedSchemas.length > 0 || removedSchemas.length > 0 || commonSchemas.length > 0) {
        diff.summary.hasChanges = true;
    }
}

function compareResponses(oldResponses, newResponses, diff) {
    // Similar implementation for responses...
}

function compareParameters(oldParameters, newParameters, diff) {
    // Similar implementation for parameters...
}

async function generateOutput(diff, format, outputFile) {
    let content;

    switch (format) {
        case 'json':
            content = JSON.stringify(diff, null, 2);
            break;
        case 'html':
            content = generateHtmlReport(diff);
            break;
        case 'markdown':
            content = generateMarkdownReport(diff);
            break;
        default:
            displayConsoleReport(diff);
            return;
    }

    if (outputFile) {
        fs.writeFileSync(outputFile, content);
        console.log(chalk.green(`Report saved to: ${outputFile}`));
    } else {
        console.log(content);
    }
}

function displayConsoleReport(diff) {
    console.log(chalk.bold.blue('\n🔍 API Specification Comparison Report\n'));

    console.log(chalk.bold('📋 Summary:'));
    console.log(`   Old spec: ${diff.oldSpec.title} v${diff.oldSpec.version}`);
    console.log(`   New spec: ${diff.newSpec.title} v${diff.newSpec.version}`);
    console.log(`   Has changes: ${diff.summary.hasChanges ? chalk.green('Yes') : chalk.gray('No')}`);
    console.log(`   Breaking changes: ${diff.summary.hasBreakingChanges ? chalk.red('Yes') : chalk.green('No')}`);

    if (diff.summary.hasChanges) {
        console.log(chalk.bold('\n📊 Change Statistics:'));
        console.log(`   Paths: +${diff.summary.pathsAdded} -${diff.summary.pathsRemoved} ~${diff.summary.pathsModified}`);
        console.log(`   Operations: +${diff.summary.operationsAdded} -${diff.summary.operationsRemoved} ~${diff.summary.operationsModified}`);
        console.log(`   Schemas: +${diff.summary.schemasAdded} -${diff.summary.schemasRemoved} ~${diff.summary.schemasModified}`);

        if (breakingOnly) {
            const breakingChanges = diff.changes.filter(change => change.breaking);
            if (breakingChanges.length > 0) {
                console.log(chalk.bold.red('\n💥 Breaking Changes:'));
                breakingChanges.forEach(change => {
                    console.log(chalk.red(`   ${formatChange(change)}`));
                });
            }
        } else {
            console.log(chalk.bold('\n📝 All Changes:'));
            diff.changes.forEach(change => {
                const color = change.breaking ? chalk.red : (change.action === 'added' ? chalk.green : chalk.yellow);
                console.log(color(`   ${formatChange(change)}`));
            });
        }
    }
}

function formatChange(change) {
    const action = change.action.toUpperCase();
    const breaking = change.breaking ? ' [BREAKING]' : '';

    switch (change.type) {
        case 'path':
            return `${action} path: ${change.path}${breaking}`;
        case 'operation':
            return `${action} operation: ${change.method} ${change.path}${breaking}`;
        case 'parameter':
            return `${action} parameter: ${change.parameter} (${change.location}) in ${change.method} ${change.path}${breaking}`;
        case 'request-body':
            return `${action} request body in ${change.method} ${change.path}${breaking}`;
        case 'response':
            return `${action} response ${change.statusCode} in ${change.method} ${change.path}${breaking}`;
        case 'schema':
            return `${action} schema: ${change.name}${breaking}`;
        default:
            return `${action} ${change.type}${breaking}`;
    }
}

function generateHtmlReport(diff) {
    // HTML report generation implementation...
    return '<html><!-- HTML report would be generated here --></html>';
}

function generateMarkdownReport(diff) {
    // Markdown report generation implementation...
    return '# API Specification Comparison Report\n\n<!-- Markdown report would be generated here -->';
}

compareSpecs().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error(chalk.red(`Unexpected error: ${error.message}`));
    process.exit(2);
});
EOF

    # Run diff
    local exit_code=0
    cd "${CONFIG_DIR}" && node temp_diff_openapi.js "${old_spec}" "${new_spec}" "${output_format}" "${output_file}" "${BREAKING_CHANGES_ONLY}" "${INCLUDE_DESCRIPTIONS}" || exit_code=$?

    # Cleanup
    rm -f "${CONFIG_DIR}/temp_diff_openapi.js"

    return $exit_code
}

diff_asyncapi_specs() {
    local old_spec="$1"
    local new_spec="$2"
    local output_format="$3"
    local output_file="$4"

    log_info "Comparing AsyncAPI specifications..."

    # Create AsyncAPI diff script
    cat > "${CONFIG_DIR}/temp_diff_asyncapi.js" << 'EOF'
const fs = require('fs');
const yaml = require('js-yaml');
const chalk = require('chalk');
const _ = require('lodash');

const oldSpecFile = process.argv[2];
const newSpecFile = process.argv[3];
const outputFormat = process.argv[4];
const outputFile = process.argv[5];

async function compareSpecs() {
    try {
        // Parse specifications
        const oldContent = fs.readFileSync(oldSpecFile, 'utf8');
        const newContent = fs.readFileSync(newSpecFile, 'utf8');

        const oldSpec = yaml.load(oldContent);
        const newSpec = yaml.load(newContent);

        const diff = {
            timestamp: new Date().toISOString(),
            oldSpec: {
                file: oldSpecFile,
                title: oldSpec.info?.title || 'Unknown',
                version: oldSpec.info?.version || 'Unknown'
            },
            newSpec: {
                file: newSpecFile,
                title: newSpec.info?.title || 'Unknown',
                version: newSpec.info?.version || 'Unknown'
            },
            summary: {
                hasChanges: false,
                hasBreakingChanges: false,
                channelsAdded: 0,
                channelsRemoved: 0,
                channelsModified: 0,
                serversAdded: 0,
                serversRemoved: 0,
                schemasAdded: 0,
                schemasRemoved: 0
            },
            changes: []
        };

        // Compare channels
        compareChannels(oldSpec.channels || {}, newSpec.channels || {}, diff);

        // Compare servers
        compareServers(oldSpec.servers || {}, newSpec.servers || {}, diff);

        // Compare components
        compareComponents(oldSpec.components || {}, newSpec.components || {}, diff);

        // Generate output
        await generateOutput(diff, outputFormat, outputFile);

        return diff.summary.hasBreakingChanges ? 1 : 0;

    } catch (error) {
        console.error(chalk.red(`Error comparing AsyncAPI specifications: ${error.message}`));
        return 2;
    }
}

function compareChannels(oldChannels, newChannels, diff) {
    const oldChannelNames = Object.keys(oldChannels);
    const newChannelNames = Object.keys(newChannels);

    // Added channels
    const addedChannels = newChannelNames.filter(name => !oldChannelNames.includes(name));
    addedChannels.forEach(name => {
        diff.changes.push({
            type: 'channel',
            action: 'added',
            name: name,
            breaking: false
        });
        diff.summary.channelsAdded++;
    });

    // Removed channels
    const removedChannels = oldChannelNames.filter(name => !newChannelNames.includes(name));
    removedChannels.forEach(name => {
        diff.changes.push({
            type: 'channel',
            action: 'removed',
            name: name,
            breaking: true
        });
        diff.summary.channelsRemoved++;
        diff.summary.hasBreakingChanges = true;
    });

    // Modified channels
    const commonChannels = oldChannelNames.filter(name => newChannelNames.includes(name));
    commonChannels.forEach(name => {
        if (!_.isEqual(oldChannels[name], newChannels[name])) {
            diff.changes.push({
                type: 'channel',
                action: 'modified',
                name: name,
                breaking: false // Would need deeper analysis
            });
            diff.summary.channelsModified++;
        }
    });

    if (addedChannels.length > 0 || removedChannels.length > 0 || commonChannels.some(name => !_.isEqual(oldChannels[name], newChannels[name]))) {
        diff.summary.hasChanges = true;
    }
}

function compareServers(oldServers, newServers, diff) {
    const oldServerNames = Object.keys(oldServers);
    const newServerNames = Object.keys(newServers);

    // Added servers
    const addedServers = newServerNames.filter(name => !oldServerNames.includes(name));
    addedServers.forEach(name => {
        diff.changes.push({
            type: 'server',
            action: 'added',
            name: name,
            breaking: false
        });
        diff.summary.serversAdded++;
    });

    // Removed servers
    const removedServers = oldServerNames.filter(name => !newServerNames.includes(name));
    removedServers.forEach(name => {
        diff.changes.push({
            type: 'server',
            action: 'removed',
            name: name,
            breaking: true
        });
        diff.summary.serversRemoved++;
        diff.summary.hasBreakingChanges = true;
    });

    if (addedServers.length > 0 || removedServers.length > 0) {
        diff.summary.hasChanges = true;
    }
}

function compareComponents(oldComponents, newComponents, diff) {
    const oldSchemas = oldComponents.schemas || {};
    const newSchemas = newComponents.schemas || {};

    const oldSchemaNames = Object.keys(oldSchemas);
    const newSchemaNames = Object.keys(newSchemas);

    // Added schemas
    const addedSchemas = newSchemaNames.filter(name => !oldSchemaNames.includes(name));
    addedSchemas.forEach(name => {
        diff.changes.push({
            type: 'schema',
            action: 'added',
            name: name,
            breaking: false
        });
        diff.summary.schemasAdded++;
    });

    // Removed schemas
    const removedSchemas = oldSchemaNames.filter(name => !newSchemaNames.includes(name));
    removedSchemas.forEach(name => {
        diff.changes.push({
            type: 'schema',
            action: 'removed',
            name: name,
            breaking: true
        });
        diff.summary.schemasRemoved++;
        diff.summary.hasBreakingChanges = true;
    });

    if (addedSchemas.length > 0 || removedSchemas.length > 0) {
        diff.summary.hasChanges = true;
    }
}

async function generateOutput(diff, format, outputFile) {
    let content;

    switch (format) {
        case 'json':
            content = JSON.stringify(diff, null, 2);
            break;
        default:
            displayConsoleReport(diff);
            return;
    }

    if (outputFile) {
        fs.writeFileSync(outputFile, content);
        console.log(chalk.green(`Report saved to: ${outputFile}`));
    } else {
        console.log(content);
    }
}

function displayConsoleReport(diff) {
    console.log(chalk.bold.blue('\n🔍 AsyncAPI Specification Comparison Report\n'));

    console.log(chalk.bold('📋 Summary:'));
    console.log(`   Old spec: ${diff.oldSpec.title} v${diff.oldSpec.version}`);
    console.log(`   New spec: ${diff.newSpec.title} v${diff.newSpec.version}`);
    console.log(`   Has changes: ${diff.summary.hasChanges ? chalk.green('Yes') : chalk.gray('No')}`);
    console.log(`   Breaking changes: ${diff.summary.hasBreakingChanges ? chalk.red('Yes') : chalk.green('No')}`);

    if (diff.summary.hasChanges) {
        console.log(chalk.bold('\n📊 Change Statistics:'));
        console.log(`   Channels: +${diff.summary.channelsAdded} -${diff.summary.channelsRemoved} ~${diff.summary.channelsModified}`);
        console.log(`   Servers: +${diff.summary.serversAdded} -${diff.summary.serversRemoved}`);
        console.log(`   Schemas: +${diff.summary.schemasAdded} -${diff.summary.schemasRemoved}`);

        console.log(chalk.bold('\n📝 Changes:'));
        diff.changes.forEach(change => {
            const color = change.breaking ? chalk.red : (change.action === 'added' ? chalk.green : chalk.yellow);
            const breaking = change.breaking ? ' [BREAKING]' : '';
            console.log(color(`   ${change.action.toUpperCase()} ${change.type}: ${change.name}${breaking}`));
        });
    }
}

compareSpecs().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error(chalk.red(`Unexpected error: ${error.message}`));
    process.exit(2);
});
EOF

    # Run diff
    local exit_code=0
    cd "${CONFIG_DIR}" && node temp_diff_asyncapi.js "${old_spec}" "${new_spec}" "${output_format}" "${output_file}" || exit_code=$?

    # Cleanup
    rm -f "${CONFIG_DIR}/temp_diff_asyncapi.js"

    return $exit_code
}

main() {
    log_section "API Specification Diff"

    check_dependencies
    install_diff_tools

    mkdir -p "${REPORTS_DIR}"

    # Resolve spec paths (handle git references)
    local old_spec_resolved
    local new_spec_resolved

    if ! old_spec_resolved=$(resolve_spec_path "${OLD_SPEC}"); then
        exit 1
    fi

    if ! new_spec_resolved=$(resolve_spec_path "${NEW_SPEC}"); then
        exit 1
    fi

    # Detect specification type
    local spec_type
    spec_type=$(detect_spec_type "${new_spec_resolved}")

    log_info "Detected specification type: ${spec_type}"

    # Set output file if not specified
    if [[ -z "${OUTPUT_FILE}" && "${OUTPUT_FORMAT}" != "console" ]]; then
        OUTPUT_FILE="${REPORTS_DIR}/diff_${spec_type}_${TIMESTAMP}.${OUTPUT_FORMAT}"
    fi

    # Perform diff based on spec type
    local exit_code=0
    case "${spec_type}" in
        "openapi")
            diff_openapi_specs "${old_spec_resolved}" "${new_spec_resolved}" "${OUTPUT_FORMAT}" "${OUTPUT_FILE}" || exit_code=$?
            ;;
        "asyncapi")
            diff_asyncapi_specs "${old_spec_resolved}" "${new_spec_resolved}" "${OUTPUT_FORMAT}" "${OUTPUT_FILE}" || exit_code=$?
            ;;
        *)
            log_error "Unsupported specification type: ${spec_type}"
            exit_code=1
            ;;
    esac

    # Cleanup temporary files (git references)
    if [[ "${OLD_SPEC}" == *":"* ]]; then
        rm -f "${old_spec_resolved}"
    fi

    if [[ "${NEW_SPEC}" == *":"* ]]; then
        rm -f "${new_spec_resolved}"
    fi

    # Cleanup temp scripts
    rm -f "${CONFIG_DIR}"/temp_diff_*.js

    exit $exit_code
}

# Run main function
main "$@"