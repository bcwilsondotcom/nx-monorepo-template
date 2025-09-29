# Lambda Module

This Terraform module creates an AWS Lambda function with comprehensive configuration options including IAM roles, CloudWatch logging, dead letter queues, and monitoring alarms.

## Features

- Lambda function with configurable runtime and memory
- IAM role with least privilege permissions
- CloudWatch log group with configurable retention
- Dead letter queue (SQS) for failed executions
- VPC configuration support
- Function URL support with CORS
- Lambda aliases for blue/green deployments
- X-Ray tracing support
- CloudWatch alarms for errors and duration
- Provisioned concurrency support
- Support for Lambda layers

## Usage

### Basic Lambda Function

```hcl
module "lambda" {
  source = "./modules/lambda"

  function_name = "my-function"
  description   = "My Lambda function"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  source_code_path = "./src/lambda"

  environment_variables = {
    NODE_ENV = "production"
    LOG_LEVEL = "info"
  }

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### Lambda with VPC Configuration

```hcl
module "lambda_vpc" {
  source = "./modules/lambda"

  function_name = "my-vpc-function"
  handler       = "index.handler"
  runtime       = "python3.9"

  vpc_config = {
    subnet_ids         = module.networking.private_subnet_ids
    security_group_ids = [module.networking.lambda_security_group_id]
  }

  enable_dead_letter_queue = true
  enable_xray_tracing     = true

  dynamodb_tables = [
    "arn:aws:dynamodb:region:account:table/my-table"
  ]

  s3_buckets = [
    "arn:aws:s3:::my-bucket"
  ]

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### Lambda with Function URL

```hcl
module "lambda_url" {
  source = "./modules/lambda"

  function_name = "my-api-function"
  handler       = "app.handler"
  runtime       = "nodejs18.x"

  enable_function_url     = true
  function_url_auth_type  = "NONE"

  function_url_cors = {
    allow_credentials = false
    allow_headers     = ["content-type", "x-amz-date", "authorization"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE"]
    allow_origins     = ["*"]
    max_age          = 86400
  }

  common_tags = {
    Environment = "development"
    Project     = "myapp"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| function_name | Name of the Lambda function | `string` | n/a | yes |
| description | Description of the Lambda function | `string` | `""` | no |
| handler | Lambda function handler | `string` | `"index.handler"` | no |
| runtime | Lambda function runtime | `string` | `"nodejs18.x"` | no |
| timeout | Lambda function timeout in seconds | `number` | `30` | no |
| memory_size | Lambda function memory size in MB | `number` | `128` | no |
| architectures | Lambda function architectures | `list(string)` | `["x86_64"]` | no |
| source_code_path | Path to source code directory (for local builds) | `string` | `""` | no |
| s3_bucket | S3 bucket containing the Lambda deployment package | `string` | `""` | no |
| s3_key | S3 key of the Lambda deployment package | `string` | `""` | no |
| s3_object_version | S3 object version of the Lambda deployment package | `string` | `""` | no |
| environment_variables | Environment variables for the Lambda function | `map(string)` | `{}` | no |
| vpc_config | VPC configuration for the Lambda function | `object` | `null` | no |
| enable_dead_letter_queue | Enable dead letter queue for the Lambda function | `bool` | `false` | no |
| dlq_message_retention_seconds | Message retention period for dead letter queue in seconds | `number` | `1209600` | no |
| reserved_concurrency | Reserved concurrency for the Lambda function | `number` | `-1` | no |
| provisioned_concurrency | Provisioned concurrency for the Lambda function | `number` | `0` | no |
| layers | List of Lambda layer ARNs | `list(string)` | `[]` | no |
| custom_policy | Custom IAM policy JSON for additional Lambda permissions | `string` | `null` | no |
| dynamodb_tables | List of DynamoDB table ARNs the Lambda function needs access to | `list(string)` | `[]` | no |
| s3_buckets | List of S3 bucket ARNs the Lambda function needs access to | `list(string)` | `[]` | no |
| enable_function_url | Enable Lambda function URL | `bool` | `false` | no |
| function_url_auth_type | Authorization type for Lambda function URL | `string` | `"AWS_IAM"` | no |
| function_url_cors | CORS configuration for Lambda function URL | `object` | `null` | no |
| create_alias | Create a Lambda alias | `bool` | `false` | no |
| alias_name | Name of the Lambda alias | `string` | `"live"` | no |
| alias_function_version | Function version for the alias | `string` | `"$LATEST"` | no |
| alias_routing_config | Routing configuration for the alias | `object` | `null` | no |
| enable_xray_tracing | Enable X-Ray tracing for the Lambda function | `bool` | `false` | no |
| log_retention_days | CloudWatch log retention in days | `number` | `14` | no |
| enable_error_alarm | Enable CloudWatch alarm for Lambda errors | `bool` | `true` | no |
| error_alarm_threshold | Threshold for error alarm | `number` | `5` | no |
| enable_duration_alarm | Enable CloudWatch alarm for Lambda duration | `bool` | `true` | no |
| duration_alarm_threshold | Threshold for duration alarm in milliseconds | `number` | `10000` | no |
| alarm_actions | List of ARNs to notify when alarm triggers | `list(string)` | `[]` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| lambda_function_arn | ARN of the Lambda function |
| lambda_function_name | Name of the Lambda function |
| lambda_function_qualified_arn | Qualified ARN of the Lambda function |
| lambda_invoke_arn | Invoke ARN of the Lambda function |
| lambda_function_version | Version of the Lambda function |
| lambda_function_last_modified | Last modified date of the Lambda function |
| lambda_function_source_code_hash | Source code hash of the Lambda function |
| lambda_function_source_code_size | Source code size of the Lambda function |
| lambda_role_arn | ARN of the Lambda IAM role |
| lambda_role_name | Name of the Lambda IAM role |
| lambda_cloudwatch_log_group_name | Name of the CloudWatch log group |
| lambda_cloudwatch_log_group_arn | ARN of the CloudWatch log group |
| lambda_dead_letter_queue_arn | ARN of the dead letter queue |
| lambda_dead_letter_queue_url | URL of the dead letter queue |
| lambda_function_url | Lambda function URL |
| lambda_function_url_creation_time | Creation time of the Lambda function URL |
| lambda_alias_arn | ARN of the Lambda alias |
| lambda_alias_name | Name of the Lambda alias |
| lambda_alias_invoke_arn | Invoke ARN of the Lambda alias |
| error_alarm_arn | ARN of the error CloudWatch alarm |
| duration_alarm_arn | ARN of the duration CloudWatch alarm |

## IAM Permissions

The module automatically creates IAM policies for:

- Basic Lambda execution (CloudWatch logs)
- VPC execution (if VPC config is provided)
- DynamoDB access (if tables are specified)
- S3 access (if buckets are specified)
- SQS access (for dead letter queue)
- Custom permissions (if custom policy is provided)

## Cost Optimization

- Use ARM64 architecture for better price performance
- Set appropriate memory sizes (pricing is linear with memory)
- Configure reserved concurrency to prevent unexpected costs
- Use provisioned concurrency only when necessary
- Set appropriate log retention periods