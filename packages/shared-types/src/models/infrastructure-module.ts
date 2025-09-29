/**
 * InfrastructureModule Model
 * T038 - Terraform infrastructure modules
 */

export interface InfrastructureModule {
  name: string;                   // Module name
  provider: CloudProvider;        // 'aws' | 'azure' | 'gcp'
  resources: TerraformResource[]; // Managed resources
  variables: TerraformVariable[]; // Input variables
  outputs: TerraformOutput[];     // Output values
}

export enum CloudProvider {
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  LOCAL = 'local' // LocalStack
}

export interface TerraformResource {
  type: string;                   // Resource type (aws_lambda_function)
  name: string;                   // Resource name
  configuration: Record<string, any>;  // Resource settings
}

export interface TerraformVariable {
  name: string;                   // Variable name
  type: string;                   // Variable type
  description: string;            // Variable purpose
  default?: any;                  // Default value
  validation?: ValidationRule[];  // Validation rules
}

export interface ValidationRule {
  condition: string;              // Validation condition
  error_message: string;          // Error message if validation fails
}

export interface TerraformOutput {
  name: string;                   // Output name
  value: string;                  // Output expression
  description: string;            // Output purpose
  sensitive?: boolean;            // Hide in logs
}