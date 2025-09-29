/**
 * SpecificationFile Model
 * T037 - API contract specifications
 */

export interface SpecificationFile {
  type: SpecType;                // 'openapi' | 'asyncapi'
  version: string;                // Spec version (3.1.0, 2.6.0)
  filePath: string;               // Relative path to spec file
  title?: string;                 // Specification title
  description?: string;           // Specification description
  generatedCode?: GeneratedArtifact[];  // Generated code locations
}

export enum SpecType {
  OPENAPI = 'openapi',
  ASYNCAPI = 'asyncapi'
}

export interface GeneratedArtifact {
  type: ArtifactType;            // 'client' | 'server' | 'types' | 'docs'
  language: string;               // 'typescript' | 'python'
  outputPath: string;             // Generated file location
  generator: string;              // Generator tool used
  generatedAt?: string;           // Generation timestamp
}

export enum ArtifactType {
  CLIENT = 'client',
  SERVER = 'server',
  TYPES = 'types',
  DOCUMENTATION = 'docs'
}

// Request type for code generation
export interface GenerateCodeRequest {
  specificationPath: string;
  generators: GeneratorConfig[];
}

export interface GeneratorConfig {
  type: ArtifactType;
  language: string;
  outputPath?: string;
}