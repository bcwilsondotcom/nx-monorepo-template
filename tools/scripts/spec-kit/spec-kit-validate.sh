#!/bin/bash

# spec-kit-validate.sh
# Validate all API specifications with detailed reporting

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
REPORTS_DIR="${CONFIG_DIR}/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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
VERBOSE=false
OUTPUT_FORMAT="console"
FAIL_FAST=false
SPECS_FILTER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --fail-fast)
            FAIL_FAST=true
            shift
            ;;
        --filter)
            SPECS_FILTER="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose         Enable verbose output"
            echo "  -f, --format FORMAT   Output format: console, json, html, junit"
            echo "  --fail-fast           Stop on first validation error"
            echo "  --filter PATTERN      Filter specs by filename pattern"
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

    if [[ ! -f "${CONFIG_DIR}/package.json" ]]; then
        log_error "Spec-kit dependencies not installed. Run spec-kit-init.sh first."
        exit 1
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi

    log_success "Dependencies check passed"
}

install_validation_tools() {
    log_info "Installing/updating validation tools..."

    cd "${CONFIG_DIR}"

    # Ensure all validation tools are available
    local tools=(
        "@apidevtools/swagger-parser"
        "@redocly/cli"
        "@asyncapi/parser"
        "spectral"
        "swagger-jsdoc"
        "ajv"
        "ajv-formats"
    )

    for tool in "${tools[@]}"; do
        if ! pnpm list "${tool}" &> /dev/null; then
            log_info "Installing ${tool}..."
            pnpm add "${tool}"
        fi
    done

    log_success "Validation tools ready"
}

validate_openapi_spec() {
    local spec_file="$1"
    local spec_name="$(basename "${spec_file}" .yaml)"
    local report_file="${REPORTS_DIR}/openapi_${spec_name}_${TIMESTAMP}.json"

    log_info "Validating OpenAPI spec: ${spec_name}"

    mkdir -p "${REPORTS_DIR}"

    # Create validation script
    cat > "${CONFIG_DIR}/temp_validate_openapi.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const yaml = require('js-yaml');

const specFile = process.argv[2];
const reportFile = process.argv[3];
const verbose = process.argv[4] === 'true';

async function validateSpec() {
    const startTime = Date.now();
    const result = {
        spec: specFile,
        type: 'openapi',
        timestamp: new Date().toISOString(),
        valid: false,
        errors: [],
        warnings: [],
        info: {},
        performance: {}
    };

    try {
        if (verbose) console.log(`📖 Parsing ${specFile}...`);

        // Parse the spec
        const spec = yaml.load(fs.readFileSync(specFile, 'utf8'));
        result.info = {
            title: spec.info?.title || 'Unknown',
            version: spec.info?.version || 'Unknown',
            openapi: spec.openapi,
            paths: Object.keys(spec.paths || {}).length,
            operations: 0,
            schemas: Object.keys(spec.components?.schemas || {}).length,
            responses: Object.keys(spec.components?.responses || {}).length,
            parameters: Object.keys(spec.components?.parameters || {}).length
        };

        // Count operations
        for (const path in spec.paths || {}) {
            for (const method in spec.paths[path]) {
                if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(method)) {
                    result.info.operations++;
                }
            }
        }

        if (verbose) console.log(`🔍 Validating ${specFile}...`);

        // Validate with SwaggerParser
        const api = await SwaggerParser.validate(specFile);

        result.valid = true;
        result.performance.validationTime = Date.now() - startTime;

        if (verbose) {
            console.log(`✅ ${specFile} is valid`);
            console.log(`   📊 ${result.info.paths} paths, ${result.info.operations} operations`);
            console.log(`   🏗️  ${result.info.schemas} schemas, ${result.info.responses} responses`);
        }

        // Additional checks
        const warnings = [];

        // Check for missing descriptions
        if (!spec.info.description) warnings.push('Missing API description');
        if (!spec.info.contact) warnings.push('Missing contact information');
        if (!spec.info.license) warnings.push('Missing license information');

        // Check for operations without summary/description
        let operationsWithoutSummary = 0;
        let operationsWithoutDescription = 0;

        for (const path in spec.paths || {}) {
            for (const method in spec.paths[path]) {
                if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'].includes(method)) {
                    const operation = spec.paths[path][method];
                    if (!operation.summary) operationsWithoutSummary++;
                    if (!operation.description) operationsWithoutDescription++;
                }
            }
        }

        if (operationsWithoutSummary > 0) {
            warnings.push(`${operationsWithoutSummary} operations missing summary`);
        }
        if (operationsWithoutDescription > 0) {
            warnings.push(`${operationsWithoutDescription} operations missing description`);
        }

        result.warnings = warnings;

    } catch (error) {
        result.valid = false;
        result.errors = [error.message];
        result.performance.validationTime = Date.now() - startTime;

        if (verbose) {
            console.log(`❌ ${specFile} is invalid: ${error.message}`);
        }
    }

    // Write report
    fs.writeFileSync(reportFile, JSON.stringify(result, null, 2));

    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1);
}

validateSpec().catch(console.error);
EOF

    # Run validation
    local exit_code=0
    if cd "${CONFIG_DIR}" && node temp_validate_openapi.js "${spec_file}" "${report_file}" "${VERBOSE}"; then
        if [[ "${OUTPUT_FORMAT}" == "console" ]]; then
            echo -e "  ${GREEN}✓ Valid${NC}"
        fi
    else
        exit_code=1
        if [[ "${OUTPUT_FORMAT}" == "console" ]]; then
            echo -e "  ${RED}✗ Invalid${NC}"
        fi
    fi

    # Cleanup
    rm -f "${CONFIG_DIR}/temp_validate_openapi.js"

    return $exit_code
}

validate_asyncapi_spec() {
    local spec_file="$1"
    local spec_name="$(basename "${spec_file}" .yaml)"
    local report_file="${REPORTS_DIR}/asyncapi_${spec_name}_${TIMESTAMP}.json"

    log_info "Validating AsyncAPI spec: ${spec_name}"

    mkdir -p "${REPORTS_DIR}"

    # Create validation script
    cat > "${CONFIG_DIR}/temp_validate_asyncapi.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const { parse } = require('@asyncapi/parser');
const yaml = require('js-yaml');

const specFile = process.argv[2];
const reportFile = process.argv[3];
const verbose = process.argv[4] === 'true';

async function validateSpec() {
    const startTime = Date.now();
    const result = {
        spec: specFile,
        type: 'asyncapi',
        timestamp: new Date().toISOString(),
        valid: false,
        errors: [],
        warnings: [],
        info: {},
        performance: {}
    };

    try {
        if (verbose) console.log(`📖 Parsing ${specFile}...`);

        const content = fs.readFileSync(specFile, 'utf8');
        const spec = yaml.load(content);

        result.info = {
            title: spec.info?.title || 'Unknown',
            version: spec.info?.version || 'Unknown',
            asyncapi: spec.asyncapi,
            channels: Object.keys(spec.channels || {}).length,
            messages: 0,
            servers: Object.keys(spec.servers || {}).length,
            schemas: Object.keys(spec.components?.schemas || {}).length
        };

        // Count messages
        for (const channel in spec.channels || {}) {
            const channelObj = spec.channels[channel];
            if (channelObj.publish?.message) result.info.messages++;
            if (channelObj.subscribe?.message) result.info.messages++;
        }

        if (verbose) console.log(`🔍 Validating ${specFile}...`);

        // Validate with AsyncAPI parser
        const document = await parse(content);

        if (document.hasErrors()) {
            result.valid = false;
            result.errors = document.errors.map(err => err.message);

            if (verbose) {
                console.log(`❌ ${specFile} is invalid:`);
                result.errors.forEach(error => console.log(`   ${error}`));
            }
        } else {
            result.valid = true;

            if (verbose) {
                console.log(`✅ ${specFile} is valid`);
                console.log(`   📡 ${result.info.channels} channels, ${result.info.messages} messages`);
                console.log(`   🖥️  ${result.info.servers} servers, ${result.info.schemas} schemas`);
            }

            // Additional checks for warnings
            const warnings = [];

            if (!spec.info.description) warnings.push('Missing API description');
            if (!spec.info.contact) warnings.push('Missing contact information');
            if (!spec.info.license) warnings.push('Missing license information');

            // Check for channels without descriptions
            let channelsWithoutDescription = 0;
            for (const channel in spec.channels || {}) {
                if (!spec.channels[channel].description) {
                    channelsWithoutDescription++;
                }
            }

            if (channelsWithoutDescription > 0) {
                warnings.push(`${channelsWithoutDescription} channels missing description`);
            }

            result.warnings = warnings;
        }

        result.performance.validationTime = Date.now() - startTime;

    } catch (error) {
        result.valid = false;
        result.errors = [error.message];
        result.performance.validationTime = Date.now() - startTime;

        if (verbose) {
            console.log(`❌ ${specFile} validation failed: ${error.message}`);
        }
    }

    // Write report
    fs.writeFileSync(reportFile, JSON.stringify(result, null, 2));

    // Exit with appropriate code
    process.exit(result.valid ? 0 : 1);
}

validateSpec().catch(console.error);
EOF

    # Run validation
    local exit_code=0
    if cd "${CONFIG_DIR}" && node temp_validate_asyncapi.js "${spec_file}" "${report_file}" "${VERBOSE}"; then
        if [[ "${OUTPUT_FORMAT}" == "console" ]]; then
            echo -e "  ${GREEN}✓ Valid${NC}"
        fi
    else
        exit_code=1
        if [[ "${OUTPUT_FORMAT}" == "console" ]]; then
            echo -e "  ${RED}✗ Invalid${NC}"
        fi
    fi

    # Cleanup
    rm -f "${CONFIG_DIR}/temp_validate_asyncapi.js"

    return $exit_code
}

run_spectral_linting() {
    log_section "Running Spectral Linting"

    # Create Spectral configuration if it doesn't exist
    if [[ ! -f "${CONFIG_DIR}/.spectral.yml" ]]; then
        cat > "${CONFIG_DIR}/.spectral.yml" << 'EOF'
extends: ["@stoplight/spectral-rulesets/dist/ruleset"]
rules:
  # OpenAPI rules
  operation-operationId: error
  operation-summary: error
  operation-description: warn
  operation-tag-defined: error
  path-params-defined: error
  contact-properties: error
  license-url: error
  no-unresolved-refs: error
  openapi-tags: error
  operation-tags: error

  # Custom rules
  info-contact-required:
    description: Info object should have contact object
    given: $.info
    severity: error
    then:
      field: contact
      function: truthy

  info-license-required:
    description: Info object should have license object
    given: $.info
    severity: error
    then:
      field: license
      function: truthy

  component-description:
    description: Components should have descriptions
    given: $.components.schemas.*
    severity: warn
    then:
      field: description
      function: truthy
EOF
    fi

    local openapi_files=()
    while IFS= read -r -d '' file; do
        if [[ -z "${SPECS_FILTER}" || "${file}" == *"${SPECS_FILTER}"* ]]; then
            openapi_files+=("$file")
        fi
    done < <(find "${CONTRACTS_DIR}/openapi" -name "*.yaml" -type f -print0 2>/dev/null)

    if [[ ${#openapi_files[@]} -eq 0 ]]; then
        log_warning "No OpenAPI specs found for linting"
        return 0
    fi

    local lint_errors=0
    for spec_file in "${openapi_files[@]}"; do
        log_info "Linting $(basename "${spec_file}")..."

        if cd "${CONFIG_DIR}" && npx spectral lint "${spec_file}" --format json > "${REPORTS_DIR}/lint_$(basename "${spec_file}" .yaml)_${TIMESTAMP}.json"; then
            if [[ "${OUTPUT_FORMAT}" == "console" ]]; then
                echo -e "  ${GREEN}✓ Passed${NC}"
            fi
        else
            lint_errors=$((lint_errors + 1))
            if [[ "${OUTPUT_FORMAT}" == "console" ]]; then
                echo -e "  ${YELLOW}⚠ Issues found${NC}"
            fi
        fi
    done

    if [[ ${lint_errors} -gt 0 ]]; then
        log_warning "Linting found issues in ${lint_errors} spec(s)"
    else
        log_success "All specs passed linting"
    fi

    return 0  # Don't fail on linting issues, just report them
}

generate_html_report() {
    log_info "Generating HTML validation report..."

    local html_report="${REPORTS_DIR}/validation_report_${TIMESTAMP}.html"

    cat > "${html_report}" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Specifications Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #007bff; }
        .metric.success { border-left-color: #28a745; }
        .metric.error { border-left-color: #dc3545; }
        .metric.warning { border-left-color: #ffc107; }
        .metric h3 { margin: 0 0 10px 0; font-size: 2em; }
        .metric p { margin: 0; color: #666; }
        .spec-results { margin-top: 30px; }
        .spec-item { margin-bottom: 20px; border: 1px solid #e9ecef; border-radius: 6px; }
        .spec-header { padding: 15px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; justify-content: between; align-items: center; }
        .spec-content { padding: 15px; }
        .status { padding: 4px 12px; border-radius: 4px; font-size: 0.9em; font-weight: 500; }
        .status.valid { background: #d4edda; color: #155724; }
        .status.invalid { background: #f8d7da; color: #721c24; }
        .issues { margin-top: 15px; }
        .issue { padding: 10px; margin-bottom: 10px; border-radius: 4px; }
        .issue.error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .issue.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 API Specifications Validation Report</h1>
            <p class="timestamp">Generated on: TIMESTAMP_PLACEHOLDER</p>
        </div>
        <div class="content">
            <div class="summary">
                <!-- Summary metrics will be inserted here -->
            </div>
            <div class="spec-results">
                <!-- Individual spec results will be inserted here -->
            </div>
        </div>
    </div>
</body>
</html>
EOF

    # Replace timestamp
    sed -i "s/TIMESTAMP_PLACEHOLDER/$(date)/" "${html_report}"

    log_success "HTML report generated: ${html_report}"
}

generate_consolidated_report() {
    log_info "Generating consolidated validation report..."

    local json_files=()
    while IFS= read -r -d '' file; do
        json_files+=("$file")
    done < <(find "${REPORTS_DIR}" -name "*_${TIMESTAMP}.json" -type f -print0 2>/dev/null)

    if [[ ${#json_files[@]} -eq 0 ]]; then
        log_warning "No validation reports found"
        return 0
    fi

    # Create consolidated report script
    cat > "${CONFIG_DIR}/temp_consolidate.js" << 'EOF'
const fs = require('fs');
const path = require('path');

const reportFiles = process.argv.slice(2);
const timestamp = process.env.TIMESTAMP;
const outputFile = path.join(process.cwd(), 'reports', `consolidated_report_${timestamp}.json`);

const consolidatedReport = {
    timestamp: new Date().toISOString(),
    summary: {
        total: 0,
        valid: 0,
        invalid: 0,
        openapi: 0,
        asyncapi: 0
    },
    results: []
};

for (const reportFile of reportFiles) {
    try {
        const content = fs.readFileSync(reportFile, 'utf8');
        const report = JSON.parse(content);

        consolidatedReport.results.push(report);
        consolidatedReport.summary.total++;

        if (report.valid) {
            consolidatedReport.summary.valid++;
        } else {
            consolidatedReport.summary.invalid++;
        }

        if (report.type === 'openapi') {
            consolidatedReport.summary.openapi++;
        } else if (report.type === 'asyncapi') {
            consolidatedReport.summary.asyncapi++;
        }
    } catch (error) {
        console.error(`Error processing ${reportFile}:`, error.message);
    }
}

fs.writeFileSync(outputFile, JSON.stringify(consolidatedReport, null, 2));
console.log(`Consolidated report written to: ${outputFile}`);
EOF

    cd "${CONFIG_DIR}" && TIMESTAMP="${TIMESTAMP}" node temp_consolidate.js "${json_files[@]}"
    rm -f "${CONFIG_DIR}/temp_consolidate.js"

    local consolidated_file="${REPORTS_DIR}/consolidated_report_${TIMESTAMP}.json"
    log_success "Consolidated report: ${consolidated_file}"

    # Generate different output formats
    case "${OUTPUT_FORMAT}" in
        "html")
            generate_html_report
            ;;
        "junit")
            generate_junit_report "${consolidated_file}"
            ;;
        "json")
            log_info "JSON report available at: ${consolidated_file}"
            ;;
        "console")
            display_console_summary "${consolidated_file}"
            ;;
    esac
}

generate_junit_report() {
    local consolidated_file="$1"
    local junit_file="${REPORTS_DIR}/junit_report_${TIMESTAMP}.xml"

    log_info "Generating JUnit XML report..."

    cat > "${CONFIG_DIR}/temp_junit.js" << 'EOF'
const fs = require('fs');

const consolidatedFile = process.argv[2];
const outputFile = process.argv[3];

const report = JSON.parse(fs.readFileSync(consolidatedFile, 'utf8'));

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += `<testsuite name="API Specifications Validation" tests="${report.summary.total}" failures="${report.summary.invalid}" timestamp="${report.timestamp}">\n`;

for (const result of report.results) {
    const specName = result.spec.split('/').pop().replace('.yaml', '');
    xml += `  <testcase name="${specName}" classname="${result.type}">\n`;

    if (!result.valid) {
        xml += '    <failure type="ValidationError">\n';
        xml += `      <![CDATA[${result.errors.join('\n')}]]>\n`;
        xml += '    </failure>\n';
    }

    if (result.warnings && result.warnings.length > 0) {
        xml += '    <system-out>\n';
        xml += `      <![CDATA[Warnings:\n${result.warnings.join('\n')}]]>\n`;
        xml += '    </system-out>\n';
    }

    xml += '  </testcase>\n';
}

xml += '</testsuite>\n';

fs.writeFileSync(outputFile, xml);
console.log(`JUnit report written to: ${outputFile}`);
EOF

    cd "${CONFIG_DIR}" && node temp_junit.js "${consolidated_file}" "${junit_file}"
    rm -f "${CONFIG_DIR}/temp_junit.js"

    log_success "JUnit report: ${junit_file}"
}

display_console_summary() {
    local consolidated_file="$1"

    if [[ ! -f "${consolidated_file}" ]]; then
        return 0
    fi

    log_section "Validation Summary"

    # Create summary display script
    cat > "${CONFIG_DIR}/temp_summary.js" << 'EOF'
const fs = require('fs');
const chalk = require('chalk');

const consolidatedFile = process.argv[2];
const report = JSON.parse(fs.readFileSync(consolidatedFile, 'utf8'));

console.log(chalk.bold('📊 Overall Results:'));
console.log(`   Total specs: ${report.summary.total}`);
console.log(`   ${chalk.green('✓ Valid:')} ${report.summary.valid}`);
console.log(`   ${chalk.red('✗ Invalid:')} ${report.summary.invalid}`);
console.log(`   OpenAPI specs: ${report.summary.openapi}`);
console.log(`   AsyncAPI specs: ${report.summary.asyncapi}`);

if (report.summary.invalid > 0) {
    console.log(chalk.bold.red('\n❌ Failed Specifications:'));

    for (const result of report.results) {
        if (!result.valid) {
            const specName = result.spec.split('/').pop();
            console.log(chalk.red(`   ✗ ${specName}`));

            for (const error of result.errors || []) {
                console.log(chalk.gray(`     ${error}`));
            }
        }
    }
}

if (report.results.some(r => r.warnings && r.warnings.length > 0)) {
    console.log(chalk.bold.yellow('\n⚠️  Warnings:'));

    for (const result of report.results) {
        if (result.warnings && result.warnings.length > 0) {
            const specName = result.spec.split('/').pop();
            console.log(chalk.yellow(`   ⚠ ${specName}`));

            for (const warning of result.warnings) {
                console.log(chalk.gray(`     ${warning}`));
            }
        }
    }
}

const successRate = ((report.summary.valid / report.summary.total) * 100).toFixed(1);
console.log(chalk.bold(`\n📈 Success Rate: ${successRate}%`));
EOF

    cd "${CONFIG_DIR}" && node temp_summary.js "${consolidated_file}"
    rm -f "${CONFIG_DIR}/temp_summary.js"
}

main() {
    log_section "API Specifications Validation"

    check_dependencies
    install_validation_tools

    local exit_code=0
    local validation_errors=0

    # Find and validate OpenAPI specs
    log_section "Validating OpenAPI Specifications"

    local openapi_files=()
    while IFS= read -r -d '' file; do
        if [[ -z "${SPECS_FILTER}" || "${file}" == *"${SPECS_FILTER}"* ]]; then
            openapi_files+=("$file")
        fi
    done < <(find "${CONTRACTS_DIR}/openapi" -name "*.yaml" -type f -print0 2>/dev/null)

    if [[ ${#openapi_files[@]} -eq 0 ]]; then
        log_warning "No OpenAPI specifications found"
    else
        for spec_file in "${openapi_files[@]}"; do
            if ! validate_openapi_spec "${spec_file}"; then
                validation_errors=$((validation_errors + 1))
                if [[ "${FAIL_FAST}" == "true" ]]; then
                    log_error "Validation failed, exiting due to --fail-fast"
                    exit 1
                fi
            fi
        done
    fi

    # Find and validate AsyncAPI specs
    log_section "Validating AsyncAPI Specifications"

    local asyncapi_files=()
    while IFS= read -r -d '' file; do
        if [[ -z "${SPECS_FILTER}" || "${file}" == *"${SPECS_FILTER}"* ]]; then
            asyncapi_files+=("$file")
        fi
    done < <(find "${CONTRACTS_DIR}/asyncapi" -name "*.yaml" -type f -print0 2>/dev/null)

    if [[ ${#asyncapi_files[@]} -eq 0 ]]; then
        log_warning "No AsyncAPI specifications found"
    else
        for spec_file in "${asyncapi_files[@]}"; do
            if ! validate_asyncapi_spec "${spec_file}"; then
                validation_errors=$((validation_errors + 1))
                if [[ "${FAIL_FAST}" == "true" ]]; then
                    log_error "Validation failed, exiting due to --fail-fast"
                    exit 1
                fi
            fi
        done
    fi

    # Run linting
    run_spectral_linting

    # Generate reports
    generate_consolidated_report

    # Final status
    if [[ ${validation_errors} -eq 0 ]]; then
        log_success "🎉 All specifications are valid!"
        exit_code=0
    else
        log_error "❌ ${validation_errors} specification(s) failed validation"
        exit_code=1
    fi

    log_info "📁 Reports saved in: ${REPORTS_DIR}"

    exit ${exit_code}
}

# Run main function
main "$@"