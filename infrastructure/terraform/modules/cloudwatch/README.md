# CloudWatch Module

This Terraform module creates comprehensive CloudWatch monitoring for your AWS infrastructure, including log groups, metric filters, alarms, dashboards, and SNS notifications.

## Features

- CloudWatch log groups with configurable retention
- Metric filters for custom metrics from logs
- SNS topic for alert notifications (email and SMS)
- Pre-configured alarms for common AWS services:
  - Application Load Balancer (ALB)
  - ECS Services
  - Lambda Functions
  - DynamoDB Tables
  - API Gateway
- Custom CloudWatch alarms
- CloudWatch dashboard with service metrics
- CloudWatch Logs Insights predefined queries

## Usage

### Basic Monitoring Setup

```hcl
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment      = "production"
  application_name = "myapp"

  # Log groups
  log_groups = {
    application = {
      name           = "/aws/ecs/myapp"
      retention_days = 30
    }
    api_gateway = {
      name           = "/aws/apigateway/myapp"
      retention_days = 14
    }
  }

  # SNS notifications
  create_sns_topic      = true
  alert_email_addresses = ["admin@example.com", "devops@example.com"]
  alert_phone_numbers   = ["+1234567890"]

  # ALB monitoring
  enable_default_alarms     = true
  load_balancer_full_name   = "app/myapp-alb/1234567890"
  error_rate_threshold      = 5
  response_time_threshold   = 2

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### Comprehensive Monitoring with All Services

```hcl
module "cloudwatch_full" {
  source = "./modules/cloudwatch"

  environment      = "production"
  application_name = "myapp"

  # Log groups
  log_groups = {
    ecs_app = {
      name           = "/aws/ecs/myapp"
      retention_days = 30
    }
    lambda_api = {
      name           = "/aws/lambda/myapp-api"
      retention_days = 14
    }
    api_gateway = {
      name           = "/aws/apigateway/myapp"
      retention_days = 7
    }
  }

  # Metric filters
  metric_filters = {
    error_count = {
      name             = "ErrorCount"
      log_group_name   = "/aws/ecs/myapp"
      pattern          = "[timestamp, request_id, \"ERROR\"]"
      metric_name      = "ErrorCount"
      metric_namespace = "MyApp/Errors"
      metric_value     = "1"
    }
  }

  # ECS Services
  ecs_services = {
    web_service = {
      service_name = "myapp-web"
      cluster_name = "myapp-cluster"
    }
    api_service = {
      service_name = "myapp-api"
      cluster_name = "myapp-cluster"
    }
  }
  ecs_cpu_threshold    = 75
  ecs_memory_threshold = 80

  # Lambda Functions
  lambda_functions = {
    api_handler = {
      function_name      = "myapp-api-handler"
      duration_threshold = 5000
    }
    background_processor = {
      function_name      = "myapp-processor"
      duration_threshold = 30000
    }
  }

  # DynamoDB Tables
  dynamodb_tables = {
    users = {
      table_name = "myapp-users"
    }
    sessions = {
      table_name = "myapp-sessions"
    }
  }

  # API Gateway
  api_gateways = {
    main_api = {
      api_name   = "myapp-api"
      stage_name = "v1"
    }
  }

  # Custom alarms
  custom_alarms = {
    custom_metric = {
      name                = "custom-business-metric"
      comparison_operator = "LessThanThreshold"
      evaluation_periods  = 2
      metric_name         = "BusinessMetric"
      namespace           = "MyApp/Business"
      period              = 300
      statistic           = "Average"
      threshold           = 100
      description         = "Business metric is below threshold"
      dimensions = {
        Environment = "production"
      }
    }
  }

  # Dashboard and insights
  create_dashboard            = true
  create_log_insights_queries = true

  # SNS notifications
  create_sns_topic      = true
  alert_email_addresses = ["alerts@example.com"]

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### Custom Alarms Only

```hcl
module "cloudwatch_custom" {
  source = "./modules/cloudwatch"

  environment      = "staging"
  application_name = "myapp"

  # Disable default alarms
  enable_default_alarms = false
  create_sns_topic     = false

  # Custom alarms with external SNS topic
  custom_alarms = {
    disk_usage = {
      name                = "high-disk-usage"
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = 2
      metric_name         = "DiskSpaceUtilization"
      namespace           = "CWAgent"
      period              = 300
      statistic           = "Average"
      threshold           = 80
      description         = "Disk usage is high"
      alarm_actions       = [data.aws_sns_topic.existing.arn]
      dimensions = {
        InstanceId = "i-1234567890abcdef0"
        device     = "/dev/xvda1"
        fstype     = "ext4"
        path       = "/"
      }
    }
  }

  common_tags = {
    Environment = "staging"
    Project     = "myapp"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| environment | Environment name | `string` | n/a | yes |
| application_name | Name of the application | `string` | n/a | yes |
| log_groups | Map of CloudWatch log groups to create | `map(object)` | `{}` | no |
| metric_filters | Map of CloudWatch log metric filters | `map(object)` | `{}` | no |
| create_sns_topic | Create SNS topic for CloudWatch alarms | `bool` | `true` | no |
| alert_email_addresses | List of email addresses to receive CloudWatch alerts | `list(string)` | `[]` | no |
| alert_phone_numbers | List of phone numbers to receive CloudWatch SMS alerts | `list(string)` | `[]` | no |
| enable_default_alarms | Enable default application-level alarms | `bool` | `true` | no |
| default_alarm_actions | Default alarm actions if SNS topic is not created | `list(string)` | `[]` | no |
| load_balancer_full_name | Full name of the Application Load Balancer | `string` | `""` | no |
| error_rate_threshold | Threshold for error rate alarm (percentage) | `number` | `5` | no |
| response_time_threshold | Threshold for response time alarm (seconds) | `number` | `2` | no |
| ecs_services | Map of ECS services to monitor | `map(object)` | `{}` | no |
| ecs_cpu_threshold | CPU utilization threshold for ECS services (percentage) | `number` | `80` | no |
| ecs_memory_threshold | Memory utilization threshold for ECS services (percentage) | `number` | `80` | no |
| lambda_functions | Map of Lambda functions to monitor | `map(object)` | `{}` | no |
| lambda_error_threshold | Error count threshold for Lambda functions | `number` | `5` | no |
| dynamodb_tables | Map of DynamoDB tables to monitor | `map(object)` | `{}` | no |
| dynamodb_throttle_threshold | Throttle threshold for DynamoDB tables | `number` | `0` | no |
| api_gateways | Map of API Gateways to monitor | `map(object)` | `{}` | no |
| api_gateway_4xx_threshold | 4XX error threshold for API Gateway | `number` | `10` | no |
| api_gateway_5xx_threshold | 5XX error threshold for API Gateway | `number` | `5` | no |
| custom_alarms | Map of custom CloudWatch alarms | `map(object)` | `{}` | no |
| create_dashboard | Create CloudWatch dashboard | `bool` | `true` | no |
| create_log_insights_queries | Create predefined CloudWatch Logs Insights queries | `bool` | `true` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| log_group_names | Names of the created CloudWatch log groups |
| log_group_arns | ARNs of the created CloudWatch log groups |
| sns_topic_arn | ARN of the SNS topic for alerts |
| sns_topic_name | Name of the SNS topic for alerts |
| metric_filter_names | Names of the created metric filters |
| custom_alarm_arns | ARNs of the custom CloudWatch alarms |
| custom_alarm_names | Names of the custom CloudWatch alarms |
| high_error_rate_alarm_arn | ARN of the high error rate alarm |
| high_response_time_alarm_arn | ARN of the high response time alarm |
| ecs_cpu_alarm_arns | ARNs of ECS CPU utilization alarms |
| ecs_memory_alarm_arns | ARNs of ECS memory utilization alarms |
| lambda_error_alarm_arns | ARNs of Lambda error alarms |
| lambda_duration_alarm_arns | ARNs of Lambda duration alarms |
| dynamodb_throttle_alarm_arns | ARNs of DynamoDB throttle alarms |
| api_gateway_4xx_alarm_arns | ARNs of API Gateway 4XX error alarms |
| api_gateway_5xx_alarm_arns | ARNs of API Gateway 5XX error alarms |
| dashboard_url | URL of the CloudWatch dashboard |
| dashboard_name | Name of the CloudWatch dashboard |
| log_insights_query_names | Names of the CloudWatch Logs Insights queries |
| monitoring_summary | Summary of monitoring resources created |

## Pre-configured Alarms

The module creates alarms for the following metrics:

### Application Load Balancer
- High error rate (4XX/5XX responses)
- High response time

### ECS Services
- High CPU utilization
- High memory utilization

### Lambda Functions
- Error count
- Duration (configurable per function)

### DynamoDB Tables
- Throttled requests

### API Gateway
- 4XX error count
- 5XX error count

## CloudWatch Dashboard

The dashboard includes widgets for:
- Application Load Balancer metrics
- ECS service CPU and memory utilization
- Lambda function duration and errors
- DynamoDB read capacity consumption

## Log Insights Queries

Pre-configured queries include:
- Error analysis across all log groups
- Performance analysis for Lambda functions

## Best Practices

1. **Log Retention**: Set appropriate retention periods based on compliance requirements
2. **Alarm Thresholds**: Tune thresholds based on your application's normal behavior
3. **SNS Notifications**: Use both email and SMS for critical alerts
4. **Custom Metrics**: Create custom metrics for business-specific monitoring
5. **Dashboard Organization**: Group related metrics together for better visibility
6. **Cost Optimization**: Use shorter retention periods for non-critical logs

## Cost Considerations

- CloudWatch Logs charges for ingestion and storage
- CloudWatch metrics are charged per metric
- SNS charges per notification sent
- Dashboard usage is free within AWS Free Tier limits
- Log Insights queries are charged per GB scanned