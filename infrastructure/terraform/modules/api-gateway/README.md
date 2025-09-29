# API Gateway Module

This Terraform module creates an AWS API Gateway with Lambda integration, including throttling, rate limiting, CORS configuration, and optional API key management.

## Features

- REST API Gateway with Lambda proxy integration
- Configurable throttling and rate limiting
- CORS support with customizable headers and methods
- API key management with usage plans
- CloudWatch logging and X-Ray tracing
- WAF Web ACL association support
- Customizable binary media types

## Usage

```hcl
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name          = "my-api"
  api_description   = "My REST API"
  stage_name        = "v1"
  lambda_invoke_arn = module.lambda.lambda_invoke_arn
  lambda_function_name = module.lambda.lambda_function_name

  # Throttling
  throttle_rate_limit  = 10000
  throttle_burst_limit = 5000

  # API Key
  create_api_key    = true
  api_key_required  = false

  # CORS
  enable_cors   = true
  cors_origin   = "*"
  cors_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

  # Logging
  enable_access_logging = true
  enable_xray_tracing   = true
  log_retention_days    = 30

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| api_name | Name of the API Gateway | `string` | n/a | yes |
| lambda_invoke_arn | Lambda function invoke ARN | `string` | n/a | yes |
| api_description | Description of the API Gateway | `string` | `""` | no |
| stage_name | Name of the API Gateway stage | `string` | `"v1"` | no |
| endpoint_type | Type of API Gateway endpoint | `string` | `"REGIONAL"` | no |
| authorization_type | Authorization type for API methods | `string` | `"NONE"` | no |
| lambda_function_name | Name of the Lambda function to integrate with | `string` | `""` | no |
| binary_media_types | List of binary media types supported by the API | `list(string)` | `[]` | no |
| throttle_rate_limit | API Gateway throttle rate limit | `number` | `10000` | no |
| throttle_burst_limit | API Gateway throttle burst limit | `number` | `5000` | no |
| api_key_required | Whether API key is required for API access | `bool` | `false` | no |
| create_api_key | Whether to create an API key | `bool` | `false` | no |
| usage_plan_quota_limit | Maximum number of requests per quota period | `number` | `10000` | no |
| usage_plan_quota_period | Quota period (DAY, WEEK, MONTH) | `string` | `"MONTH"` | no |
| usage_plan_throttle_rate_limit | Usage plan throttle rate limit | `number` | `1000` | no |
| usage_plan_throttle_burst_limit | Usage plan throttle burst limit | `number` | `2000` | no |
| enable_cors | Enable CORS for the API | `bool` | `true` | no |
| cors_origin | CORS allowed origin | `string` | `"*"` | no |
| cors_headers | CORS allowed headers | `list(string)` | See variables.tf | no |
| cors_methods | CORS allowed methods | `list(string)` | `["GET", "POST", "PUT", "DELETE", "OPTIONS"]` | no |
| enable_access_logging | Enable API Gateway access logging | `bool` | `true` | no |
| log_retention_days | CloudWatch log retention in days | `number` | `14` | no |
| enable_xray_tracing | Enable X-Ray tracing | `bool` | `false` | no |
| integration_timeout | Integration timeout in milliseconds | `number` | `29000` | no |
| waf_acl_arn | ARN of WAF Web ACL to associate with the API | `string` | `""` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| api_gateway_id | ID of the API Gateway |
| api_gateway_arn | ARN of the API Gateway |
| api_gateway_execution_arn | Execution ARN of the API Gateway |
| api_gateway_url | URL of the API Gateway |
| api_gateway_invoke_url | Invoke URL of the API Gateway stage |
| api_gateway_stage_name | Name of the API Gateway stage |
| api_gateway_deployment_id | ID of the API Gateway deployment |
| api_key_id | ID of the API key |
| api_key_value | Value of the API key (sensitive) |
| usage_plan_id | ID of the usage plan |
| cloudwatch_log_group_name | Name of the CloudWatch log group |
| cloudwatch_log_group_arn | ARN of the CloudWatch log group |

## Security Features

- WAF Web ACL association for DDoS and application layer protection
- API key authentication with usage plans
- Configurable throttling and rate limiting
- CORS configuration for browser security
- CloudWatch logging for audit trails

## Cost Optimization

- Use `REGIONAL` endpoint type instead of `EDGE` for lower latency and costs
- Set appropriate throttling limits to prevent unexpected charges
- Configure log retention periods based on compliance requirements
- Use usage plans to control API consumption