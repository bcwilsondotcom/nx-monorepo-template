#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import SwaggerParser from '@apidevtools/swagger-parser';
import { AsyncAPIDocument, Parser } from '@asyncapi/parser';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ValidationOptions {
  directory?: string;
  openapi?: boolean;
  asyncapi?: boolean;
  format?: 'console' | 'json' | 'junit' | 'html';
  output?: string;
  strict?: boolean;
  verbose?: boolean;
}

interface ValidationResult {
  file: string;
  type: 'openapi' | 'asyncapi';
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: any;
}

interface ValidationError {
  code: string;
  message: string;
  path?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
  results: ValidationResult[];
  executionTime: number;
}

class ContractValidator {
  private results: ValidationResult[] = [];
  private startTime: number = 0;

  constructor(private options: ValidationOptions) {}

  async validate(): Promise<ValidationSummary> {
    console.log('🔍 Starting contract validation...');
    this.startTime = Date.now();

    const contractFiles = await this.findContractFiles();
    console.log(`📄 Found ${contractFiles.length} contract files`);

    for (const file of contractFiles) {
      await this.validateFile(file);
    }

    const summary = this.generateSummary();

    if (this.options.output) {
      await this.writeOutput(summary);
    } else {
      this.printSummary(summary);
    }

    return summary;
  }

  private async findContractFiles(): Promise<string[]> {
    const directory = this.options.directory || 'packages/contracts';
    const patterns: string[] = [];

    if (this.options.openapi !== false) {
      patterns.push(`${directory}/openapi/**/*.{yaml,yml,json}`);
    }

    if (this.options.asyncapi !== false) {
      patterns.push(`${directory}/asyncapi/**/*.{yaml,yml,json}`);
    }

    // If no specific type is requested, include both
    if (!this.options.openapi && !this.options.asyncapi) {
      patterns.push(`${directory}/**/*.{yaml,yml,json}`);
    }

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { absolute: true });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async validateFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    console.log(`📋 Validating: ${fileName}`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const type = await this.detectSpecType(content, filePath);

      if (type === 'openapi') {
        await this.validateOpenAPIFile(filePath, content);
      } else if (type === 'asyncapi') {
        await this.validateAsyncAPIFile(filePath, content);
      } else {
        this.results.push({
          file: filePath,
          type: 'openapi', // default
          valid: false,
          errors: [{
            code: 'UNKNOWN_SPEC_TYPE',
            message: 'Could not determine specification type (OpenAPI or AsyncAPI)',
            severity: 'error'
          }],
          warnings: []
        });
      }
    } catch (error) {
      this.results.push({
        file: filePath,
        type: 'openapi', // default
        valid: false,
        errors: [{
          code: 'FILE_READ_ERROR',
          message: `Failed to read file: ${error}`,
          severity: 'error'
        }],
        warnings: []
      });
    }
  }

  private async detectSpecType(content: string, filePath: string): Promise<'openapi' | 'asyncapi' | 'unknown'> {
    try {
      let parsed: any;

      if (filePath.endsWith('.json')) {
        parsed = JSON.parse(content);
      } else {
        parsed = yaml.load(content);
      }

      if (parsed.openapi || parsed.swagger) {
        return 'openapi';
      } else if (parsed.asyncapi) {
        return 'asyncapi';
      }

      // Try to infer from directory structure
      if (filePath.includes('/openapi/')) {
        return 'openapi';
      } else if (filePath.includes('/asyncapi/')) {
        return 'asyncapi';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async validateOpenAPIFile(filePath: string, content: string): Promise<void> {
    const result: ValidationResult = {
      file: filePath,
      type: 'openapi',
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      // Parse and validate with swagger-parser
      const api = await SwaggerParser.validate(filePath);

      result.valid = true;
      result.metadata = {
        title: api.info?.title,
        version: api.info?.version,
        paths: Object.keys(api.paths || {}).length,
        components: Object.keys(api.components?.schemas || {}).length
      };

      // Additional custom validations
      await this.performOpenAPICustomValidations(api, result);

    } catch (error: any) {
      result.valid = false;

      if (error.details) {
        // swagger-parser validation errors
        for (const detail of error.details) {
          result.errors.push({
            code: detail.code || 'VALIDATION_ERROR',
            message: detail.message,
            path: detail.path?.join('.'),
            severity: 'error'
          });
        }
      } else {
        result.errors.push({
          code: 'PARSE_ERROR',
          message: error.message,
          severity: 'error'
        });
      }
    }

    this.results.push(result);
  }

  private async validateAsyncAPIFile(filePath: string, content: string): Promise<void> {
    const result: ValidationResult = {
      file: filePath,
      type: 'asyncapi',
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      const parser = new Parser();
      const { document, diagnostics } = await parser.parse(content);

      if (document) {
        result.valid = diagnostics.filter(d => d.severity === 0).length === 0; // 0 = error
        result.metadata = {
          title: document.info().title(),
          version: document.info().version(),
          channels: document.channels().size,
          messages: this.countAsyncAPIMessages(document)
        };

        // Convert diagnostics to our format
        for (const diagnostic of diagnostics) {
          const item = {
            code: diagnostic.code || 'DIAGNOSTIC',
            message: diagnostic.message,
            path: diagnostic.path?.join('.'),
            severity: diagnostic.severity === 0 ? 'error' as const : 'warning' as const
          };

          if (diagnostic.severity === 0) {
            result.errors.push(item);
          } else {
            result.warnings.push(item);
          }
        }

        // Additional custom validations
        await this.performAsyncAPICustomValidations(document, result);

      } else {
        result.valid = false;
        result.errors.push({
          code: 'PARSE_ERROR',
          message: 'Failed to parse AsyncAPI document',
          severity: 'error'
        });
      }
    } catch (error: any) {
      result.valid = false;
      result.errors.push({
        code: 'PARSE_ERROR',
        message: error.message,
        severity: 'error'
      });
    }

    this.results.push(result);
  }

  private countAsyncAPIMessages(document: AsyncAPIDocument): number {
    let count = 0;
    for (const [, channel] of document.channels()) {
      if (channel.subscribe()) {
        count += channel.subscribe()!.messages().length;
      }
      if (channel.publish()) {
        count += channel.publish()!.messages().length;
      }
    }
    return count;
  }

  private async performOpenAPICustomValidations(api: any, result: ValidationResult): Promise<void> {
    const warnings = result.warnings;

    // Check for missing descriptions
    if (!api.info?.description) {
      warnings.push({
        code: 'MISSING_API_DESCRIPTION',
        message: 'API description is missing',
        path: 'info.description'
      });
    }

    // Check for missing operation summaries
    for (const [path, pathItem] of Object.entries(api.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          if (!operation.summary) {
            warnings.push({
              code: 'MISSING_OPERATION_SUMMARY',
              message: `Operation ${method.toUpperCase()} ${path} is missing summary`,
              path: `paths.${path}.${method}.summary`
            });
          }

          if (!operation.description) {
            warnings.push({
              code: 'MISSING_OPERATION_DESCRIPTION',
              message: `Operation ${method.toUpperCase()} ${path} is missing description`,
              path: `paths.${path}.${method}.description`
            });
          }

          // Check for missing response descriptions
          for (const [statusCode, response] of Object.entries(operation.responses || {})) {
            if (!response.description) {
              warnings.push({
                code: 'MISSING_RESPONSE_DESCRIPTION',
                message: `Response ${statusCode} for ${method.toUpperCase()} ${path} is missing description`,
                path: `paths.${path}.${method}.responses.${statusCode}.description`
              });
            }
          }
        }
      }
    }

    // Check for missing schema examples
    if (api.components?.schemas) {
      for (const [schemaName, schema] of Object.entries(api.components.schemas)) {
        if (!schema.example && !schema.examples) {
          warnings.push({
            code: 'MISSING_SCHEMA_EXAMPLE',
            message: `Schema ${schemaName} is missing example`,
            path: `components.schemas.${schemaName}.example`
          });
        }
      }
    }

    // Check for security definitions
    if (!api.security && !api.components?.securitySchemes) {
      warnings.push({
        code: 'MISSING_SECURITY',
        message: 'No security schemes defined',
        path: 'components.securitySchemes'
      });
    }

    // Strict mode validations
    if (this.options.strict) {
      await this.performStrictOpenAPIValidations(api, result);
    }
  }

  private async performStrictOpenAPIValidations(api: any, result: ValidationResult): Promise<void> {
    const errors = result.errors;

    // Require tags for all operations
    for (const [path, pathItem] of Object.entries(api.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          if (!operation.tags || operation.tags.length === 0) {
            errors.push({
              code: 'MISSING_OPERATION_TAGS',
              message: `Operation ${method.toUpperCase()} ${path} must have tags`,
              path: `paths.${path}.${method}.tags`,
              severity: 'error'
            });
          }
        }
      }
    }

    // Require operationId for all operations
    for (const [path, pathItem] of Object.entries(api.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          if (!operation.operationId) {
            errors.push({
              code: 'MISSING_OPERATION_ID',
              message: `Operation ${method.toUpperCase()} ${path} must have operationId`,
              path: `paths.${path}.${method}.operationId`,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  private async performAsyncAPICustomValidations(document: AsyncAPIDocument, result: ValidationResult): Promise<void> {
    const warnings = result.warnings;

    // Check for missing channel descriptions
    for (const [address, channel] of document.channels()) {
      if (!channel.description()) {
        warnings.push({
          code: 'MISSING_CHANNEL_DESCRIPTION',
          message: `Channel ${address} is missing description`,
          path: `channels.${address}.description`
        });
      }

      // Check for missing message descriptions
      if (channel.subscribe()) {
        for (const message of channel.subscribe()!.messages()) {
          if (!message.description()) {
            warnings.push({
              code: 'MISSING_MESSAGE_DESCRIPTION',
              message: `Subscribe message in channel ${address} is missing description`,
              path: `channels.${address}.subscribe.message.description`
            });
          }
        }
      }

      if (channel.publish()) {
        for (const message of channel.publish()!.messages()) {
          if (!message.description()) {
            warnings.push({
              code: 'MISSING_MESSAGE_DESCRIPTION',
              message: `Publish message in channel ${address} is missing description`,
              path: `channels.${address}.publish.message.description`
            });
          }
        }
      }
    }

    // Strict mode validations
    if (this.options.strict) {
      await this.performStrictAsyncAPIValidations(document, result);
    }
  }

  private async performStrictAsyncAPIValidations(document: AsyncAPIDocument, result: ValidationResult): Promise<void> {
    const errors = result.errors;

    // Require examples for all message payloads
    for (const [address, channel] of document.channels()) {
      if (channel.subscribe()) {
        for (const message of channel.subscribe()!.messages()) {
          if (!message.examples() || message.examples().length === 0) {
            errors.push({
              code: 'MISSING_MESSAGE_EXAMPLES',
              message: `Subscribe message in channel ${address} must have examples`,
              path: `channels.${address}.subscribe.message.examples`,
              severity: 'error'
            });
          }
        }
      }

      if (channel.publish()) {
        for (const message of channel.publish()!.messages()) {
          if (!message.examples() || message.examples().length === 0) {
            errors.push({
              code: 'MISSING_MESSAGE_EXAMPLES',
              message: `Publish message in channel ${address} must have examples`,
              path: `channels.${address}.publish.message.examples`,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  private generateSummary(): ValidationSummary {
    const executionTime = Date.now() - this.startTime;
    const validFiles = this.results.filter(r => r.valid).length;
    const invalidFiles = this.results.length - validFiles;
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
      totalFiles: this.results.length,
      validFiles,
      invalidFiles,
      totalErrors,
      totalWarnings,
      results: this.results,
      executionTime
    };
  }

  private printSummary(summary: ValidationSummary): void {
    console.log('\n📊 Validation Summary');
    console.log('═'.repeat(50));
    console.log(`Total files: ${summary.totalFiles}`);
    console.log(`Valid files: ${summary.validFiles} ✅`);
    console.log(`Invalid files: ${summary.invalidFiles} ❌`);
    console.log(`Total errors: ${summary.totalErrors}`);
    console.log(`Total warnings: ${summary.totalWarnings}`);
    console.log(`Execution time: ${summary.executionTime}ms`);

    if (this.options.verbose || summary.invalidFiles > 0) {
      console.log('\n📋 Detailed Results');
      console.log('─'.repeat(50));

      for (const result of summary.results) {
        const status = result.valid ? '✅' : '❌';
        const fileName = path.basename(result.file);
        console.log(`\n${status} ${fileName} (${result.type})`);

        if (result.metadata) {
          console.log(`   Title: ${result.metadata.title || 'N/A'}`);
          console.log(`   Version: ${result.metadata.version || 'N/A'}`);
          if (result.type === 'openapi') {
            console.log(`   Paths: ${result.metadata.paths || 0}`);
            console.log(`   Components: ${result.metadata.components || 0}`);
          } else {
            console.log(`   Channels: ${result.metadata.channels || 0}`);
            console.log(`   Messages: ${result.metadata.messages || 0}`);
          }
        }

        if (result.errors.length > 0) {
          console.log('   Errors:');
          for (const error of result.errors) {
            console.log(`     • ${error.message} (${error.code})`);
            if (error.path) {
              console.log(`       Path: ${error.path}`);
            }
          }
        }

        if (result.warnings.length > 0 && this.options.verbose) {
          console.log('   Warnings:');
          for (const warning of result.warnings) {
            console.log(`     • ${warning.message} (${warning.code})`);
            if (warning.path) {
              console.log(`       Path: ${warning.path}`);
            }
          }
        }
      }
    }

    if (summary.invalidFiles > 0) {
      console.log('\n❌ Validation failed');
      process.exit(1);
    } else {
      console.log('\n✅ All contracts are valid');
    }
  }

  private async writeOutput(summary: ValidationSummary): Promise<void> {
    const outputPath = this.options.output!;

    switch (this.options.format) {
      case 'json':
        await this.writeJSONOutput(summary, outputPath);
        break;
      case 'junit':
        await this.writeJUnitOutput(summary, outputPath);
        break;
      case 'html':
        await this.writeHTMLOutput(summary, outputPath);
        break;
      default:
        await this.writeJSONOutput(summary, outputPath);
    }

    console.log(`📄 Report written to: ${outputPath}`);
  }

  private async writeJSONOutput(summary: ValidationSummary, outputPath: string): Promise<void> {
    const report = {
      summary: {
        totalFiles: summary.totalFiles,
        validFiles: summary.validFiles,
        invalidFiles: summary.invalidFiles,
        totalErrors: summary.totalErrors,
        totalWarnings: summary.totalWarnings,
        executionTime: summary.executionTime,
        timestamp: new Date().toISOString()
      },
      results: summary.results.map(result => ({
        file: result.file,
        type: result.type,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: result.metadata
      }))
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  }

  private async writeJUnitOutput(summary: ValidationSummary, outputPath: string): Promise<void> {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="Contract Validation" tests="${summary.totalFiles}" failures="${summary.invalidFiles}" time="${summary.executionTime / 1000}">\n`;

    for (const result of summary.results) {
      const fileName = path.basename(result.file);
      xml += `  <testcase name="${fileName}" classname="contracts.${result.type}">\n`;

      if (!result.valid) {
        xml += `    <failure message="Validation failed">\n`;
        xml += `      <![CDATA[\n`;
        for (const error of result.errors) {
          xml += `${error.code}: ${error.message}\n`;
          if (error.path) {
            xml += `  Path: ${error.path}\n`;
          }
        }
        xml += `      ]]>\n`;
        xml += `    </failure>\n`;
      }

      xml += `  </testcase>\n`;
    }

    xml += '</testsuite>\n';
    await fs.writeFile(outputPath, xml);
  }

  private async writeHTMLOutput(summary: ValidationSummary, outputPath: string): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric.success { border-left: 5px solid #28a745; }
        .metric.error { border-left: 5px solid #dc3545; }
        .metric.warning { border-left: 5px solid #ffc107; }
        .results { margin-top: 30px; }
        .result { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .result.valid { background: #d4edda; border: 1px solid #c3e6cb; }
        .result.invalid { background: #f8d7da; border: 1px solid #f5c6cb; }
        .errors, .warnings { margin-top: 10px; }
        .error-item, .warning-item { margin: 5px 0; padding: 5px; border-radius: 3px; }
        .error-item { background: #f8d7da; }
        .warning-item { background: #fff3cd; }
        .metadata { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Validation Report</h1>
        <p>Generated on ${new Date().toISOString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Files</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.totalFiles}</div>
        </div>
        <div class="metric success">
            <h3>Valid Files</h3>
            <div style="font-size: 2em; font-weight: bold; color: #28a745;">${summary.validFiles}</div>
        </div>
        <div class="metric error">
            <h3>Invalid Files</h3>
            <div style="font-size: 2em; font-weight: bold; color: #dc3545;">${summary.invalidFiles}</div>
        </div>
        <div class="metric error">
            <h3>Errors</h3>
            <div style="font-size: 2em; font-weight: bold; color: #dc3545;">${summary.totalErrors}</div>
        </div>
        <div class="metric warning">
            <h3>Warnings</h3>
            <div style="font-size: 2em; font-weight: bold; color: #ffc107;">${summary.totalWarnings}</div>
        </div>
    </div>

    <div class="results">
        <h2>Detailed Results</h2>
        ${summary.results.map(result => `
        <div class="result ${result.valid ? 'valid' : 'invalid'}">
            <h3>${result.valid ? '✅' : '❌'} ${path.basename(result.file)} (${result.type})</h3>

            ${result.metadata ? `
            <div class="metadata">
                <strong>Title:</strong> ${result.metadata.title || 'N/A'} |
                <strong>Version:</strong> ${result.metadata.version || 'N/A'} |
                ${result.type === 'openapi'
                  ? `<strong>Paths:</strong> ${result.metadata.paths || 0} | <strong>Components:</strong> ${result.metadata.components || 0}`
                  : `<strong>Channels:</strong> ${result.metadata.channels || 0} | <strong>Messages:</strong> ${result.metadata.messages || 0}`
                }
            </div>
            ` : ''}

            ${result.errors.length > 0 ? `
            <div class="errors">
                <h4>Errors (${result.errors.length})</h4>
                ${result.errors.map(error => `
                <div class="error-item">
                    <strong>${error.code}:</strong> ${error.message}
                    ${error.path ? `<br><small>Path: ${error.path}</small>` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${result.warnings.length > 0 ? `
            <div class="warnings">
                <h4>Warnings (${result.warnings.length})</h4>
                ${result.warnings.map(warning => `
                <div class="warning-item">
                    <strong>${warning.code}:</strong> ${warning.message}
                    ${warning.path ? `<br><small>Path: ${warning.path}</small>` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        `).join('')}
    </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
  }
}

// CLI Program
const program = new Command();

program
  .name('validate-contracts')
  .description('Validate OpenAPI and AsyncAPI contract specifications')
  .version('1.0.0');

program
  .option('-d, --directory <dir>', 'Directory containing contract specifications', 'packages/contracts')
  .option('--openapi', 'Validate only OpenAPI specifications')
  .option('--asyncapi', 'Validate only AsyncAPI specifications')
  .option('-f, --format <format>', 'Output format (console, json, junit, html)', 'console')
  .option('-o, --output <file>', 'Output file path (when not using console format)')
  .option('--strict', 'Enable strict validation mode', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options: ValidationOptions) => {
    try {
      const validator = new ContractValidator(options);
      await validator.validate();
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Subcommands
program
  .command('ci')
  .description('Validate contracts for CI/CD pipeline (strict mode, JUnit output)')
  .option('-d, --directory <dir>', 'Directory containing contract specifications', 'packages/contracts')
  .option('-o, --output <file>', 'JUnit output file', 'contract-validation-results.xml')
  .action(async (options) => {
    try {
      const validator = new ContractValidator({
        ...options,
        format: 'junit',
        strict: true,
        verbose: false
      });
      await validator.validate();
    } catch (error) {
      console.error('❌ CI validation failed:', error);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate detailed HTML validation report')
  .option('-d, --directory <dir>', 'Directory containing contract specifications', 'packages/contracts')
  .option('-o, --output <file>', 'HTML output file', 'contract-validation-report.html')
  .action(async (options) => {
    try {
      const validator = new ContractValidator({
        ...options,
        format: 'html',
        verbose: true
      });
      await validator.validate();
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    }
  });

// Example usage command
program
  .command('example')
  .description('Show example usage')
  .action(() => {
    console.log(`
📖 Contract Validation Examples:

# Validate all contracts in default directory
validate-contracts

# Validate only OpenAPI specs with verbose output
validate-contracts --openapi -v

# Generate JSON report
validate-contracts -f json -o validation-report.json

# Strict validation for CI/CD
validate-contracts ci

# Generate HTML report
validate-contracts report

# Validate specific directory
validate-contracts -d ./my-contracts --verbose

Validation Features:
✅ OpenAPI 3.x specification validation
✅ AsyncAPI 2.x specification validation
✅ Schema validation and dereferencing
✅ Custom best practice checks
✅ Missing documentation detection
✅ Security scheme validation
✅ Multiple output formats (console, JSON, JUnit, HTML)
✅ CI/CD pipeline integration
✅ Strict mode for enhanced validation

Exit Codes:
- 0: All validations passed
- 1: Validation errors found
    `);
  });

if (require.main === module) {
  program.parse();
}

export { ContractValidator };