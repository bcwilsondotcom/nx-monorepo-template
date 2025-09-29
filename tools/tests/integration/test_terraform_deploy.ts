/**
 * Integration Test: Terraform Deployment
 * T034 - Must fail initially per TDD requirements
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Terraform Deployment Integration', () => {
  const terraformDir = path.join(process.cwd(), 'infrastructure/terraform');
  const localEnvDir = path.join(terraformDir, 'environments/local');
  const tfStateFile = path.join(localEnvDir, 'terraform.tfstate');

  beforeAll(async () => {
    // Ensure Terraform is installed
    try {
      execSync('terraform version', { stdio: 'pipe' });
    } catch {
      throw new Error('Terraform is not installed. Please install Terraform to run these tests.');
    }

    // Initialize Terraform
    if (fs.existsSync(localEnvDir)) {
      execSync('terraform init', {
        cwd: localEnvDir,
        stdio: 'inherit'
      });
    }
  });

  afterAll(async () => {
    // Clean up Terraform state if needed
    if (fs.existsSync(tfStateFile + '.backup')) {
      fs.unlinkSync(tfStateFile + '.backup');
    }
  });

  describe('Local Environment', () => {
    it('should validate Terraform configuration', async () => {
      const result = execSync('terraform validate', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      });

      expect(result).toContain('Success');
    });

    it('should generate Terraform plan', async () => {
      const planOutput = execSync('terraform plan -out=tfplan', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      });

      expect(planOutput).toBeDefined();
      expect(fs.existsSync(path.join(localEnvDir, 'tfplan'))).toBe(true);
    });

    it('should show resources to be created', async () => {
      const planShow = execSync('terraform show -json tfplan', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      });

      const plan = JSON.parse(planShow);
      expect(plan.resource_changes).toBeDefined();
      expect(Array.isArray(plan.resource_changes)).toBe(true);

      // Verify expected resources
      const resourceTypes = plan.resource_changes.map((r: any) => r.type);
      expect(resourceTypes).toContain('aws_s3_bucket');
      expect(resourceTypes).toContain('aws_lambda_function');
      expect(resourceTypes).toContain('aws_dynamodb_table');
    });

    it('should apply Terraform configuration to LocalStack', async () => {
      // Apply with auto-approve for testing
      const applyOutput = execSync('terraform apply -auto-approve', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      });

      expect(applyOutput).toContain('Apply complete');
      expect(fs.existsSync(tfStateFile)).toBe(true);
    });

    it('should output infrastructure endpoints', async () => {
      const outputs = execSync('terraform output -json', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      });

      const outputValues = JSON.parse(outputs);
      expect(outputValues).toHaveProperty('api_endpoint');
      expect(outputValues).toHaveProperty('s3_bucket_name');
      expect(outputValues).toHaveProperty('lambda_function_names');
    });
  });

  describe('Module Testing', () => {
    it('should validate Lambda module', async () => {
      const lambdaModuleDir = path.join(terraformDir, 'modules/lambda');

      const result = execSync('terraform validate', {
        cwd: lambdaModuleDir,
        encoding: 'utf-8'
      });

      expect(result).toContain('Success');
    });

    it('should validate S3 module', async () => {
      const s3ModuleDir = path.join(terraformDir, 'modules/s3');

      const result = execSync('terraform validate', {
        cwd: s3ModuleDir,
        encoding: 'utf-8'
      });

      expect(result).toContain('Success');
    });

    it('should validate DynamoDB module', async () => {
      const dynamoModuleDir = path.join(terraformDir, 'modules/dynamodb');

      const result = execSync('terraform validate', {
        cwd: dynamoModuleDir,
        encoding: 'utf-8'
      });

      expect(result).toContain('Success');
    });
  });

  describe('Multi-Environment Support', () => {
    it('should have separate configurations for environments', async () => {
      const environments = ['local', 'staging', 'production'];

      environments.forEach(env => {
        const envDir = path.join(terraformDir, 'environments', env);
        expect(fs.existsSync(envDir)).toBe(true);
        expect(fs.existsSync(path.join(envDir, 'main.tf'))).toBe(true);
        expect(fs.existsSync(path.join(envDir, 'variables.tf'))).toBe(true);
      });
    });

    it('should use different backend configurations', async () => {
      const stagingBackend = path.join(terraformDir, 'environments/staging/backend.tf');
      const prodBackend = path.join(terraformDir, 'environments/production/backend.tf');

      if (fs.existsSync(stagingBackend)) {
        const stagingConfig = fs.readFileSync(stagingBackend, 'utf-8');
        expect(stagingConfig).toContain('s3');
        expect(stagingConfig).toContain('staging');
      }

      if (fs.existsSync(prodBackend)) {
        const prodConfig = fs.readFileSync(prodBackend, 'utf-8');
        expect(prodConfig).toContain('s3');
        expect(prodConfig).toContain('production');
      }
    });
  });

  describe('Infrastructure as Code Best Practices', () => {
    it('should use variables for configuration', async () => {
      const variablesFile = path.join(localEnvDir, 'variables.tf');
      expect(fs.existsSync(variablesFile)).toBe(true);

      const content = fs.readFileSync(variablesFile, 'utf-8');
      expect(content).toContain('variable');
      expect(content).toContain('description');
      expect(content).toContain('type');
    });

    it('should have outputs defined', async () => {
      const outputsFile = path.join(localEnvDir, 'outputs.tf');
      expect(fs.existsSync(outputsFile)).toBe(true);

      const content = fs.readFileSync(outputsFile, 'utf-8');
      expect(content).toContain('output');
      expect(content).toContain('value');
    });

    it('should use consistent naming conventions', async () => {
      const mainFile = path.join(localEnvDir, 'main.tf');
      const content = fs.readFileSync(mainFile, 'utf-8');

      // Check for consistent resource naming
      const resourcePattern = /resource\s+"aws_\w+"\s+"[\w-]+"/g;
      const matches = content.match(resourcePattern);

      if (matches) {
        matches.forEach(match => {
          // Resource names should use underscores or hyphens consistently
          expect(match).toMatch(/resource\s+"aws_\w+"\s+"[a-z0-9_-]+"/);
        });
      }
    });

    it('should tag all resources appropriately', async () => {
      const mainFile = path.join(localEnvDir, 'main.tf');
      const content = fs.readFileSync(mainFile, 'utf-8');

      // Check for tags on taggable resources
      if (content.includes('aws_s3_bucket') || content.includes('aws_lambda_function')) {
        expect(content).toContain('tags');
        expect(content).toContain('Environment');
        expect(content).toContain('Project');
      }
    });
  });

  describe('Destroy and Cleanup', () => {
    it('should destroy infrastructure cleanly', async () => {
      const destroyOutput = execSync('terraform destroy -auto-approve', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      });

      expect(destroyOutput).toContain('Destroy complete');
    });

    it('should verify all resources are removed', async () => {
      const stateList = execSync('terraform state list', {
        cwd: localEnvDir,
        encoding: 'utf-8'
      }).trim();

      expect(stateList).toBe('');
    });
  });
});