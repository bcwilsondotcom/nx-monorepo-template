#!/usr/bin/env node

/**
 * OpenAPI TypeScript Code Generator
 *
 * Generates TypeScript types, API clients, server stubs, React Query hooks,
 * and validation schemas from OpenAPI specifications.
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { OpenAPIV3 } from 'openapi-types';
import SwaggerParser from '@apidevtools/swagger-parser';
import chalk from 'chalk';
import * as prettier from 'prettier';

// Interfaces
interface GeneratorOptions {
  input: string;
  output: string;
  types: boolean;
  client: boolean;
  server: boolean;
  hooks: boolean;
  validation: boolean;
  namespace?: string;
  prefix?: string;
  template: 'fetch' | 'axios' | 'nestjs';
  strict: boolean;
  verbose: boolean;
}

interface GeneratedFiles {
  types: string[];
  client: string[];
  server: string[];
  hooks: string[];
  validation: string[];
}

class OpenAPITypeScriptGenerator {
  private options: GeneratorOptions;
  private spec: OpenAPIV3.Document;
  private generatedFiles: GeneratedFiles = {
    types: [],
    client: [],
    server: [],
    hooks: [],
    validation: []
  };

  constructor(options: GeneratorOptions) {
    this.options = options;
  }

  async generate(): Promise<void> {
    try {
      await this.loadSpec();
      await this.setupOutputDirectory();

      if (this.options.types) {
        await this.generateTypes();
      }

      if (this.options.client) {
        await this.generateClient();
      }

      if (this.options.server) {
        await this.generateServer();
      }

      if (this.options.hooks) {
        await this.generateHooks();
      }

      if (this.options.validation) {
        await this.generateValidation();
      }

      await this.generateIndex();
      await this.generatePackageJson();

      this.printSummary();
    } catch (error) {
      console.error(chalk.red('Generation failed:'), error.message);
      process.exit(1);
    }
  }

  private async loadSpec(): Promise<void> {
    this.log('Loading OpenAPI specification...');

    try {
      this.spec = await SwaggerParser.dereference(this.options.input) as OpenAPIV3.Document;
      this.log(`Loaded spec: ${this.spec.info.title} v${this.spec.info.version}`);
    } catch (error) {
      throw new Error(`Failed to load specification: ${error.message}`);
    }
  }

  private async setupOutputDirectory(): Promise<void> {
    this.log('Setting up output directory...');

    await fs.mkdir(this.options.output, { recursive: true });
    await fs.mkdir(path.join(this.options.output, 'types'), { recursive: true });
    await fs.mkdir(path.join(this.options.output, 'client'), { recursive: true });
    await fs.mkdir(path.join(this.options.output, 'server'), { recursive: true });
    await fs.mkdir(path.join(this.options.output, 'hooks'), { recursive: true });
    await fs.mkdir(path.join(this.options.output, 'validation'), { recursive: true });
  }

  private async generateTypes(): Promise<void> {
    this.log('Generating TypeScript types...');

    const typesContent = this.generateTypesContent();
    const typesFile = path.join(this.options.output, 'types', 'api.ts');

    await this.writeFile(typesFile, typesContent);
    this.generatedFiles.types.push(typesFile);

    // Generate separate files for each schema if there are many
    if (this.spec.components?.schemas && Object.keys(this.spec.components.schemas).length > 20) {
      await this.generateSchemaFiles();
    }
  }

  private generateTypesContent(): string {
    const namespace = this.options.namespace || this.getApiName();
    const schemas = this.spec.components?.schemas || {};

    let content = `/**
 * Generated TypeScript types from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

export namespace ${namespace} {
`;

    // Generate base types
    content += this.generateBaseTypes();

    // Generate schema types
    for (const [schemaName, schema] of Object.entries(schemas)) {
      content += this.generateSchemaType(schemaName, schema as OpenAPIV3.SchemaObject);
    }

    // Generate operation types
    content += this.generateOperationTypes();

    content += '\n}\n';

    return content;
  }

  private generateBaseTypes(): string {
    return `
  // Base types
  export interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
  }

  export interface ApiError {
    message: string;
    status?: number;
    code?: string;
    details?: any;
  }

  export interface PaginationInfo {
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  }

  export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationInfo;
  }

  // Request/Response types
  export type RequestBody<T = any> = T;
  export type QueryParams = Record<string, string | number | boolean | undefined>;
  export type PathParams = Record<string, string | number>;
  export type Headers = Record<string, string>;

`;
  }

  private generateSchemaType(name: string, schema: OpenAPIV3.SchemaObject): string {
    const typeName = this.pascalCase(name);
    const typeDefinition = this.schemaToTypeScript(schema, 1);

    return `
  /**
   * ${schema.description || `${typeName} schema`}
   */
  export interface ${typeName} ${typeDefinition}
`;
  }

  private schemaToTypeScript(schema: OpenAPIV3.SchemaObject, indent: number = 0): string {
    const spaces = '  '.repeat(indent);

    if (schema.type === 'object' || schema.properties) {
      const properties = schema.properties || {};
      const required = schema.required || [];

      let result = '{\n';

      for (const [propName, propSchema] of Object.entries(properties)) {
        const isRequired = required.includes(propName);
        const propType = this.schemaToTypeScript(propSchema as OpenAPIV3.SchemaObject, indent + 1);
        const description = (propSchema as OpenAPIV3.SchemaObject).description;

        if (description) {
          result += `${spaces}  /**\n${spaces}   * ${description}\n${spaces}   */\n`;
        }

        result += `${spaces}  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
      }

      result += `${spaces}}`;
      return result;
    }

    if (schema.type === 'array') {
      const itemType = this.schemaToTypeScript(schema.items as OpenAPIV3.SchemaObject, indent);
      return `${itemType}[]`;
    }

    if (schema.enum) {
      return schema.enum.map(val => typeof val === 'string' ? `'${val}'` : val).join(' | ');
    }

    switch (schema.type) {
      case 'string':
        return schema.format === 'date-time' || schema.format === 'date' ? 'string' : 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      default:
        return 'any';
    }
  }

  private generateOperationTypes(): string {
    let content = '\n  // Operation types\n';

    const paths = this.spec.paths || {};

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const operationId = op.operationId || this.generateOperationId(method, pathKey);

        content += this.generateOperationType(operationId, op);
      }
    }

    return content;
  }

  private generateOperationType(operationId: string, operation: OpenAPIV3.OperationObject): string {
    const typeName = this.pascalCase(operationId);

    let content = `\n  // ${operation.summary || operationId}\n`;

    // Request type
    content += `  export interface ${typeName}Request {\n`;

    // Path parameters
    const pathParams = (operation.parameters || [])
      .filter(p => (p as OpenAPIV3.ParameterObject).in === 'path');
    if (pathParams.length > 0) {
      content += '    params: {\n';
      pathParams.forEach(param => {
        const p = param as OpenAPIV3.ParameterObject;
        content += `      ${p.name}: ${this.parameterToType(p)};\n`;
      });
      content += '    };\n';
    }

    // Query parameters
    const queryParams = (operation.parameters || [])
      .filter(p => (p as OpenAPIV3.ParameterObject).in === 'query');
    if (queryParams.length > 0) {
      content += '    query?: {\n';
      queryParams.forEach(param => {
        const p = param as OpenAPIV3.ParameterObject;
        content += `      ${p.name}?: ${this.parameterToType(p)};\n`;
      });
      content += '    };\n';
    }

    // Request body
    if (operation.requestBody) {
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
      const jsonContent = requestBody.content?.['application/json'];
      if (jsonContent?.schema) {
        const bodyType = this.schemaToTypeScript(jsonContent.schema as OpenAPIV3.SchemaObject);
        content += `    body: ${bodyType};\n`;
      }
    }

    content += '  }\n';

    // Response type
    const responses = operation.responses || {};
    const successResponse = responses['200'] || responses['201'] || responses['204'];

    if (successResponse) {
      const response = successResponse as OpenAPIV3.ResponseObject;
      const jsonContent = response.content?.['application/json'];

      if (jsonContent?.schema) {
        const responseType = this.schemaToTypeScript(jsonContent.schema as OpenAPIV3.SchemaObject);
        content += `  export type ${typeName}Response = ${responseType};\n`;
      } else {
        content += `  export type ${typeName}Response = void;\n`;
      }
    }

    return content;
  }

  private async generateClient(): Promise<void> {
    this.log('Generating API client...');

    const clientContent = this.generateClientContent();
    const clientFile = path.join(this.options.output, 'client', 'api-client.ts');

    await this.writeFile(clientFile, clientContent);
    this.generatedFiles.client.push(clientFile);
  }

  private generateClientContent(): string {
    const namespace = this.options.namespace || this.getApiName();
    const className = `${this.pascalCase(this.getApiName())}Client`;

    let content = `/**
 * Generated API Client from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

import { ${namespace} } from '../types/api';

export interface ClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  apiKey?: string;
  bearerToken?: string;
}

export class ${className} {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = {
      timeout: 10000,
      ...config
    };
  }

  private async request<T>(
    method: string,
    url: string,
    options: {
      params?: Record<string, any>;
      query?: Record<string, any>;
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<${namespace}.ApiResponse<T>> {
    const { params = {}, query = {}, body, headers = {} } = options;

    // Build URL with path parameters
    let requestUrl = url;
    Object.entries(params).forEach(([key, value]) => {
      requestUrl = requestUrl.replace(\`{\${key}}\`, encodeURIComponent(String(value)));
    });

    // Add query parameters
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    if (queryString) {
      requestUrl += \`?\${queryString}\`;
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...headers
    };

    // Add authentication
    if (this.config.bearerToken) {
      requestHeaders.Authorization = \`Bearer \${this.config.bearerToken}\`;
    } else if (this.config.apiKey) {
      requestHeaders['X-API-Key'] = this.config.apiKey;
    }

    // Make request
    const response = await fetch(\`\${this.config.baseURL}\${requestUrl}\`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout!)
    });

    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as any;
    }

    if (!response.ok) {
      throw new ${namespace}.ApiError({
        message: \`Request failed: \${response.status} \${response.statusText}\`,
        status: response.status,
        details: data
      });
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

`;

    // Generate method for each operation
    const paths = this.spec.paths || {};

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const operationId = op.operationId || this.generateOperationId(method, pathKey);

        content += this.generateClientMethod(operationId, method, pathKey, op);
      }
    }

    content += '}\n';

    return content;
  }

  private generateClientMethod(
    operationId: string,
    method: string,
    path: string,
    operation: OpenAPIV3.OperationObject
  ): string {
    const methodName = this.camelCase(operationId);
    const typeName = this.pascalCase(operationId);
    const namespace = this.options.namespace || this.getApiName();

    const hasRequestBody = !!operation.requestBody;
    const hasPathParams = (operation.parameters || [])
      .some(p => (p as OpenAPIV3.ParameterObject).in === 'path');
    const hasQueryParams = (operation.parameters || [])
      .some(p => (p as OpenAPIV3.ParameterObject).in === 'query');

    let content = `
  /**
   * ${operation.summary || operationId}
   */
  async ${methodName}(`;

    if (hasRequestBody || hasPathParams || hasQueryParams) {
      content += `request: ${namespace}.${typeName}Request`;
    }

    content += `): Promise<${namespace}.ApiResponse<${namespace}.${typeName}Response>> {
    return this.request<${namespace}.${typeName}Response>(
      '${method.toUpperCase()}',
      '${path}'`;

    if (hasRequestBody || hasPathParams || hasQueryParams) {
      content += `,
      {`;

      if (hasPathParams) {
        content += `
        params: request.params,`;
      }

      if (hasQueryParams) {
        content += `
        query: request.query,`;
      }

      if (hasRequestBody) {
        content += `
        body: request.body,`;
      }

      content += `
      }`;
    }

    content += `
    );
  }
`;

    return content;
  }

  private async generateServer(): Promise<void> {
    this.log('Generating NestJS server stubs...');

    const controllerContent = this.generateControllerContent();
    const controllerFile = path.join(this.options.output, 'server', 'api.controller.ts');

    await this.writeFile(controllerFile, controllerContent);
    this.generatedFiles.server.push(controllerFile);

    const serviceContent = this.generateServiceContent();
    const serviceFile = path.join(this.options.output, 'server', 'api.service.ts');

    await this.writeFile(serviceFile, serviceContent);
    this.generatedFiles.server.push(serviceFile);

    const moduleContent = this.generateModuleContent();
    const moduleFile = path.join(this.options.output, 'server', 'api.module.ts');

    await this.writeFile(moduleFile, moduleContent);
    this.generatedFiles.server.push(moduleFile);
  }

  private generateControllerContent(): string {
    const namespace = this.options.namespace || this.getApiName();
    const controllerName = `${this.pascalCase(this.getApiName())}Controller`;
    const serviceName = `${this.pascalCase(this.getApiName())}Service`;

    let content = `/**
 * Generated NestJS Controller from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity
} from '@nestjs/swagger';
import { ${namespace} } from '../types/api';
import { ${serviceName} } from './${this.kebabCase(this.getApiName())}.service';

@ApiTags('${this.spec.info.title}')
@Controller('${this.getBasePath()}')
@UsePipes(new ValidationPipe({ transform: true }))
export class ${controllerName} {
  constructor(private readonly ${this.camelCase(serviceName)}: ${serviceName}) {}

`;

    // Generate controller methods
    const paths = this.spec.paths || {};

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const operationId = op.operationId || this.generateOperationId(method, pathKey);

        content += this.generateControllerMethod(operationId, method, pathKey, op);
      }
    }

    content += '}\n';

    return content;
  }

  private generateControllerMethod(
    operationId: string,
    method: string,
    path: string,
    operation: OpenAPIV3.OperationObject
  ): string {
    const methodName = this.camelCase(operationId);
    const typeName = this.pascalCase(operationId);
    const namespace = this.options.namespace || this.getApiName();

    // Convert OpenAPI path to NestJS path
    const nestPath = path.replace(/{([^}]+)}/g, ':$1').replace(this.getBasePath(), '');

    let content = `
  @${this.capitalizeFirst(method)}('${nestPath}')
  @ApiOperation({ summary: '${operation.summary || operationId}' })`;

    // Add response decorators
    const responses = operation.responses || {};
    for (const [statusCode, response] of Object.entries(responses)) {
      const res = response as OpenAPIV3.ResponseObject;
      content += `
  @ApiResponse({ status: ${statusCode}, description: '${res.description}' })`;
    }

    // Add auth decorators if security is defined
    if (operation.security || this.spec.security) {
      content += `
  @ApiBearerAuth()`;
    }

    content += `
  async ${methodName}(`;

    // Add parameters
    const params: string[] = [];

    // Path parameters
    const pathParams = (operation.parameters || [])
      .filter(p => (p as OpenAPIV3.ParameterObject).in === 'path');
    pathParams.forEach(param => {
      const p = param as OpenAPIV3.ParameterObject;
      params.push(`@Param('${p.name}') ${p.name}: ${this.parameterToType(p)}`);
    });

    // Query parameters
    const queryParams = (operation.parameters || [])
      .filter(p => (p as OpenAPIV3.ParameterObject).in === 'query');
    if (queryParams.length > 0) {
      params.push('@Query() query: Record<string, any>');
    }

    // Request body
    if (operation.requestBody) {
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
      const jsonContent = requestBody.content?.['application/json'];
      if (jsonContent?.schema) {
        const bodyType = this.schemaToTypeScript(jsonContent.schema as OpenAPIV3.SchemaObject);
        params.push(`@Body() body: ${bodyType}`);
      }
    }

    content += params.join(', ');
    content += `): Promise<${namespace}.${typeName}Response> {
    return this.${this.camelCase(this.getApiName())}Service.${methodName}(`;

    // Pass parameters to service
    const serviceParams: string[] = [];
    if (pathParams.length > 0) {
      serviceParams.push('{ ' + pathParams.map(p => (p as OpenAPIV3.ParameterObject).name).join(', ') + ' }');
    }
    if (queryParams.length > 0) {
      serviceParams.push('query');
    }
    if (operation.requestBody) {
      serviceParams.push('body');
    }

    content += serviceParams.join(', ');
    content += `);
  }
`;

    return content;
  }

  private generateServiceContent(): string {
    const namespace = this.options.namespace || this.getApiName();
    const serviceName = `${this.pascalCase(this.getApiName())}Service`;

    let content = `/**
 * Generated NestJS Service from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

import { Injectable } from '@nestjs/common';
import { ${namespace} } from '../types/api';

@Injectable()
export class ${serviceName} {
`;

    // Generate service methods
    const paths = this.spec.paths || {};

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const operationId = op.operationId || this.generateOperationId(method, pathKey);

        content += this.generateServiceMethod(operationId, op);
      }
    }

    content += '}\n';

    return content;
  }

  private generateServiceMethod(operationId: string, operation: OpenAPIV3.OperationObject): string {
    const methodName = this.camelCase(operationId);
    const typeName = this.pascalCase(operationId);
    const namespace = this.options.namespace || this.getApiName();

    let content = `
  /**
   * ${operation.summary || operationId}
   * TODO: Implement business logic
   */
  async ${methodName}(`;

    // Add parameters based on operation
    const params: string[] = [];

    const pathParams = (operation.parameters || [])
      .filter(p => (p as OpenAPIV3.ParameterObject).in === 'path');
    if (pathParams.length > 0) {
      params.push('params: Record<string, any>');
    }

    const queryParams = (operation.parameters || [])
      .filter(p => (p as OpenAPIV3.ParameterObject).in === 'query');
    if (queryParams.length > 0) {
      params.push('query: Record<string, any>');
    }

    if (operation.requestBody) {
      params.push('body: any');
    }

    content += params.join(', ');
    content += `): Promise<${namespace}.${typeName}Response> {
    // TODO: Implement ${operation.summary || operationId}
    throw new Error('Method not implemented');
  }
`;

    return content;
  }

  private generateModuleContent(): string {
    const moduleName = `${this.pascalCase(this.getApiName())}Module`;
    const controllerName = `${this.pascalCase(this.getApiName())}Controller`;
    const serviceName = `${this.pascalCase(this.getApiName())}Service`;

    return `/**
 * Generated NestJS Module from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

import { Module } from '@nestjs/common';
import { ${controllerName} } from './${this.kebabCase(this.getApiName())}.controller';
import { ${serviceName} } from './${this.kebabCase(this.getApiName())}.service';

@Module({
  controllers: [${controllerName}],
  providers: [${serviceName}],
  exports: [${serviceName}]
})
export class ${moduleName} {}
`;
  }

  private async generateHooks(): Promise<void> {
    this.log('Generating React Query hooks...');

    const hooksContent = this.generateHooksContent();
    const hooksFile = path.join(this.options.output, 'hooks', 'api-hooks.ts');

    await this.writeFile(hooksFile, hooksContent);
    this.generatedFiles.hooks.push(hooksFile);
  }

  private generateHooksContent(): string {
    const namespace = this.options.namespace || this.getApiName();
    const clientName = `${this.pascalCase(this.getApiName())}Client`;

    let content = `/**
 * Generated React Query hooks from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  UseQueryResult,
  UseMutationResult
} from '@tanstack/react-query';
import { ${namespace} } from '../types/api';
import { ${clientName} } from '../client/api-client';

// Query keys
export const ${this.camelCase(this.getApiName())}Keys = {
  all: ['${this.kebabCase(this.getApiName())}'] as const,
  lists: () => [...${this.camelCase(this.getApiName())}Keys.all, 'list'] as const,
  list: (filters: string) => [...${this.camelCase(this.getApiName())}Keys.lists(), { filters }] as const,
  details: () => [...${this.camelCase(this.getApiName())}Keys.all, 'detail'] as const,
  detail: (id: string | number) => [...${this.camelCase(this.getApiName())}Keys.details(), id] as const,
};

// Hook options
export interface UseApiClientOptions {
  client: ${clientName};
}

`;

    // Generate hooks for each operation
    const paths = this.spec.paths || {};

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const operationId = op.operationId || this.generateOperationId(method, pathKey);

        if (method === 'get') {
          content += this.generateQueryHook(operationId, op);
        } else {
          content += this.generateMutationHook(operationId, method, op);
        }
      }
    }

    return content;
  }

  private generateQueryHook(operationId: string, operation: OpenAPIV3.OperationObject): string {
    const hookName = `use${this.pascalCase(operationId)}`;
    const typeName = this.pascalCase(operationId);
    const methodName = this.camelCase(operationId);
    const namespace = this.options.namespace || this.getApiName();

    return `
/**
 * ${operation.summary || operationId}
 */
export function ${hookName}(
  request: ${namespace}.${typeName}Request,
  options: UseApiClientOptions & UseQueryOptions<${namespace}.${typeName}Response> = {} as any
): UseQueryResult<${namespace}.${typeName}Response> {
  const { client, ...queryOptions } = options;

  return useQuery({
    queryKey: ${this.camelCase(this.getApiName())}Keys.detail(JSON.stringify(request)),
    queryFn: () => client.${methodName}(request).then(response => response.data),
    ...queryOptions
  });
}
`;
  }

  private generateMutationHook(
    operationId: string,
    method: string,
    operation: OpenAPIV3.OperationObject
  ): string {
    const hookName = `use${this.pascalCase(operationId)}`;
    const typeName = this.pascalCase(operationId);
    const methodName = this.camelCase(operationId);
    const namespace = this.options.namespace || this.getApiName();

    return `
/**
 * ${operation.summary || operationId}
 */
export function ${hookName}(
  options: UseApiClientOptions & UseMutationOptions<
    ${namespace}.${typeName}Response,
    Error,
    ${namespace}.${typeName}Request
  > = {} as any
): UseMutationResult<${namespace}.${typeName}Response, Error, ${namespace}.${typeName}Request> {
  const { client, ...mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ${namespace}.${typeName}Request) =>
      client.${methodName}(request).then(response => response.data),
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ${this.camelCase(this.getApiName())}Keys.all });
      mutationOptions.onSuccess?.(data, variables, context);
    },
    ...mutationOptions
  });
}
`;
  }

  private async generateValidation(): Promise<void> {
    this.log('Generating Zod validation schemas...');

    const validationContent = this.generateValidationContent();
    const validationFile = path.join(this.options.output, 'validation', 'schemas.ts');

    await this.writeFile(validationFile, validationContent);
    this.generatedFiles.validation.push(validationFile);
  }

  private generateValidationContent(): string {
    const namespace = this.options.namespace || this.getApiName();
    const schemas = this.spec.components?.schemas || {};

    let content = `/**
 * Generated Zod validation schemas from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

import { z } from 'zod';

export const ${namespace}Schema = {
`;

    // Generate Zod schemas for each OpenAPI schema
    for (const [schemaName, schema] of Object.entries(schemas)) {
      const zodSchema = this.schemaToZod(schema as OpenAPIV3.SchemaObject);
      content += `
  ${this.camelCase(schemaName)}: ${zodSchema},`;
    }

    content += `
};

// Type inference from schemas
export type Inferred${namespace}Types = {`;

    for (const schemaName of Object.keys(schemas)) {
      content += `
  ${this.pascalCase(schemaName)}: z.infer<typeof ${namespace}Schema.${this.camelCase(schemaName)}>;`;
    }

    content += `
};
`;

    return content;
  }

  private schemaToZod(schema: OpenAPIV3.SchemaObject): string {
    if (schema.type === 'object' || schema.properties) {
      const properties = schema.properties || {};
      const required = schema.required || [];

      let result = 'z.object({\n';

      for (const [propName, propSchema] of Object.entries(properties)) {
        const isRequired = required.includes(propName);
        let propZod = this.schemaToZod(propSchema as OpenAPIV3.SchemaObject);

        if (!isRequired) {
          propZod += '.optional()';
        }

        result += `    ${propName}: ${propZod},\n`;
      }

      result += '  })';

      if (this.options.strict) {
        result += '.strict()';
      }

      return result;
    }

    if (schema.type === 'array') {
      const itemSchema = this.schemaToZod(schema.items as OpenAPIV3.SchemaObject);
      return `z.array(${itemSchema})`;
    }

    if (schema.enum) {
      const enumValues = schema.enum.map(val =>
        typeof val === 'string' ? `'${val}'` : val
      ).join(', ');
      return `z.enum([${enumValues}])`;
    }

    switch (schema.type) {
      case 'string':
        let stringSchema = 'z.string()';
        if (schema.format === 'email') stringSchema += '.email()';
        if (schema.format === 'uuid') stringSchema += '.uuid()';
        if (schema.format === 'date-time') stringSchema += '.datetime()';
        if (schema.format === 'date') stringSchema += '.date()';
        if (schema.minLength) stringSchema += `.min(${schema.minLength})`;
        if (schema.maxLength) stringSchema += `.max(${schema.maxLength})`;
        if (schema.pattern) stringSchema += `.regex(/${schema.pattern}/)`;
        return stringSchema;

      case 'number':
      case 'integer':
        let numberSchema = schema.type === 'integer' ? 'z.number().int()' : 'z.number()';
        if (schema.minimum !== undefined) numberSchema += `.min(${schema.minimum})`;
        if (schema.maximum !== undefined) numberSchema += `.max(${schema.maximum})`;
        return numberSchema;

      case 'boolean':
        return 'z.boolean()';

      default:
        return 'z.any()';
    }
  }

  private async generateIndex(): Promise<void> {
    this.log('Generating index files...');

    const mainIndex = this.generateMainIndex();
    const mainIndexFile = path.join(this.options.output, 'index.ts');
    await this.writeFile(mainIndexFile, mainIndex);

    // Generate index files for each subdirectory
    const subdirs = ['types', 'client', 'server', 'hooks', 'validation'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.options.output, subdir);
      const files = await fs.readdir(subdirPath).catch(() => []);

      if (files.length > 0) {
        const indexContent = files
          .filter(file => file.endsWith('.ts'))
          .map(file => `export * from './${file.replace('.ts', '')}';`)
          .join('\n');

        await this.writeFile(path.join(subdirPath, 'index.ts'), indexContent);
      }
    }
  }

  private generateMainIndex(): string {
    return `/**
 * Generated API package from OpenAPI specification
 * ${this.spec.info.title} v${this.spec.info.version}
 *
 * DO NOT EDIT - This file is auto-generated
 */

// Types
export * from './types';

// Client
export * from './client';

// Server (NestJS)
export * from './server';

// React Query hooks
export * from './hooks';

// Validation schemas
export * from './validation';

// Package info
export const packageInfo = {
  title: '${this.spec.info.title}',
  version: '${this.spec.info.version}',
  description: '${this.spec.info.description || ''}',
  generated: '${new Date().toISOString()}'
};
`;
  }

  private async generatePackageJson(): Promise<void> {
    this.log('Generating package.json...');

    const packageJson = {
      name: `@company/${this.kebabCase(this.getApiName())}-api`,
      version: this.spec.info.version || '1.0.0',
      description: this.spec.info.description || `Generated API package for ${this.spec.info.title}`,
      main: 'index.js',
      types: 'index.d.ts',
      scripts: {
        build: 'tsc',
        'build:watch': 'tsc --watch',
        clean: 'rm -rf dist',
        typecheck: 'tsc --noEmit'
      },
      dependencies: {
        '@nestjs/common': '^10.0.0',
        '@nestjs/swagger': '^7.0.0',
        '@tanstack/react-query': '^4.0.0',
        'zod': '^3.22.0'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0'
      },
      peerDependencies: {
        'react': '>=16.8.0'
      },
      keywords: [
        'api',
        'typescript',
        'openapi',
        'generated',
        'nestjs',
        'react-query',
        'zod'
      ],
      license: 'MIT',
      generated: {
        from: this.options.input,
        at: new Date().toISOString(),
        by: 'OpenAPI TypeScript Generator'
      }
    };

    const packageFile = path.join(this.options.output, 'package.json');
    await this.writeFile(packageFile, JSON.stringify(packageJson, null, 2));
  }

  private async generateSchemaFiles(): Promise<void> {
    this.log('Generating individual schema files...');

    const schemas = this.spec.components?.schemas || {};
    const schemasDir = path.join(this.options.output, 'types', 'schemas');

    await fs.mkdir(schemasDir, { recursive: true });

    for (const [schemaName, schema] of Object.entries(schemas)) {
      const typeContent = this.generateSchemaType(schemaName, schema as OpenAPIV3.SchemaObject);
      const fileName = `${this.kebabCase(schemaName)}.ts`;
      const filePath = path.join(schemasDir, fileName);

      const content = `/**
 * ${schemaName} schema type
 * Generated from OpenAPI specification
 */

export interface ${this.pascalCase(schemaName)} ${this.schemaToTypeScript(schema as OpenAPIV3.SchemaObject)}
`;

      await this.writeFile(filePath, content);
      this.generatedFiles.types.push(filePath);
    }

    // Generate schemas index
    const schemaIndex = Object.keys(schemas)
      .map(name => `export * from './${this.kebabCase(name)}';`)
      .join('\n');

    await this.writeFile(path.join(schemasDir, 'index.ts'), schemaIndex);
  }

  // Utility methods
  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const formattedContent = await prettier.format(content, {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        tabWidth: 2,
        printWidth: 100
      });

      await fs.writeFile(filePath, formattedContent, 'utf8');
    } catch (error) {
      // If prettier fails, write the content as-is
      await fs.writeFile(filePath, content, 'utf8');
    }
  }

  private parameterToType(param: OpenAPIV3.ParameterObject): string {
    const schema = param.schema as OpenAPIV3.SchemaObject;
    return this.schemaToTypeScript(schema);
  }

  private getApiName(): string {
    return this.spec.info.title
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private getBasePath(): string {
    const servers = this.spec.servers || [];
    if (servers.length > 0) {
      const url = new URL(servers[0].url);
      return url.pathname;
    }
    return '';
  }

  private generateOperationId(method: string, path: string): string {
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
    return method + pathParts.map(part => this.pascalCase(part)).join('');
  }

  private pascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private kebabCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(chalk.blue('[INFO]'), message);
    }
  }

  private printSummary(): void {
    console.log(chalk.green('\n✅ Code generation completed!'));
    console.log(chalk.blue('\n📊 Generated files:'));

    const allFiles = [
      ...this.generatedFiles.types,
      ...this.generatedFiles.client,
      ...this.generatedFiles.server,
      ...this.generatedFiles.hooks,
      ...this.generatedFiles.validation
    ];

    console.log(`   📄 ${allFiles.length} files generated`);
    console.log(`   📁 Output directory: ${this.options.output}`);

    if (this.options.verbose) {
      console.log('\n📋 File breakdown:');
      console.log(`   🔷 Types: ${this.generatedFiles.types.length} files`);
      console.log(`   🔷 Client: ${this.generatedFiles.client.length} files`);
      console.log(`   🔷 Server: ${this.generatedFiles.server.length} files`);
      console.log(`   🔷 Hooks: ${this.generatedFiles.hooks.length} files`);
      console.log(`   🔷 Validation: ${this.generatedFiles.validation.length} files`);
    }

    console.log(chalk.yellow('\n📖 Next steps:'));
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Build the package: npm run build');
    console.log('   3. Import and use the generated code in your project');
  }
}

// CLI Program
const program = new Command();

program
  .name('gen-openapi')
  .description('Generate TypeScript code from OpenAPI specifications')
  .version('1.0.0')
  .argument('<input>', 'Path to OpenAPI specification file')
  .option('-o, --output <path>', 'Output directory', './generated')
  .option('--no-types', 'Skip TypeScript types generation')
  .option('--no-client', 'Skip API client generation')
  .option('--no-server', 'Skip NestJS server stubs generation')
  .option('--no-hooks', 'Skip React Query hooks generation')
  .option('--no-validation', 'Skip Zod validation schemas generation')
  .option('-n, --namespace <name>', 'TypeScript namespace for generated types')
  .option('-p, --prefix <prefix>', 'Prefix for generated files')
  .option('-t, --template <template>', 'Client template type', 'fetch')
  .option('--strict', 'Enable strict mode for validation schemas')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (input: string, options: any) => {
    try {
      const generator = new OpenAPITypeScriptGenerator({
        input: path.resolve(input),
        output: path.resolve(options.output),
        types: options.types,
        client: options.client,
        server: options.server,
        hooks: options.hooks,
        validation: options.validation,
        namespace: options.namespace,
        prefix: options.prefix,
        template: options.template,
        strict: options.strict,
        verbose: options.verbose
      });

      await generator.generate();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();