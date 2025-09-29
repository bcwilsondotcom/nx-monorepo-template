# DynamoDB Module

This Terraform module creates an AWS DynamoDB table with comprehensive configuration options including global secondary indexes, auto-scaling, backup, and monitoring capabilities.

## Features

- DynamoDB table with configurable billing mode
- Global Secondary Indexes (GSI) and Local Secondary Indexes (LSI)
- Auto-scaling for read and write capacity
- Point-in-time recovery
- Server-side encryption with KMS
- DynamoDB streams support
- TTL (Time To Live) configuration
- AWS Backup integration for continuous backups
- CloudWatch alarms for monitoring
- Deletion protection

## Usage

### Basic DynamoDB Table (Pay-per-request)

```hcl
module "dynamodb_table" {
  source = "./modules/dynamodb"

  table_name = "users"
  hash_key   = "user_id"
  range_key  = "created_at"

  attributes = [
    {
      name = "user_id"
      type = "S"
    },
    {
      name = "created_at"
      type = "S"
    },
    {
      name = "email"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    email_index = {
      name        = "email-index"
      hash_key    = "email"
      projection_type = "ALL"
    }
  }

  ttl_enabled        = true
  ttl_attribute_name = "expires_at"

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### Provisioned DynamoDB Table with Auto-scaling

```hcl
module "dynamodb_provisioned" {
  source = "./modules/dynamodb"

  table_name   = "orders"
  billing_mode = "PROVISIONED"
  hash_key     = "order_id"
  range_key    = "customer_id"

  read_capacity  = 10
  write_capacity = 10

  attributes = [
    {
      name = "order_id"
      type = "S"
    },
    {
      name = "customer_id"
      type = "S"
    },
    {
      name = "status"
      type = "S"
    },
    {
      name = "created_date"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    status_index = {
      name           = "status-index"
      hash_key       = "status"
      range_key      = "created_date"
      read_capacity  = 5
      write_capacity = 5
      projection_type = "INCLUDE"
      non_key_attributes = ["order_total", "customer_email"]
    }
  }

  enable_autoscaling = true
  autoscaling_read_min_capacity  = 5
  autoscaling_read_max_capacity  = 100
  autoscaling_write_min_capacity = 5
  autoscaling_write_max_capacity = 100

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  enable_continuous_backups = true
  backup_schedule          = "cron(0 2 * * ? *)"

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### DynamoDB Table with Enhanced Security

```hcl
module "dynamodb_secure" {
  source = "./modules/dynamodb"

  table_name = "sensitive-data"
  hash_key   = "id"

  attributes = [
    {
      name = "id"
      type = "S"
    }
  ]

  # Enhanced security settings
  encryption_enabled = true
  kms_key_id        = aws_kms_key.dynamodb.arn
  deletion_protection_enabled = true
  point_in_time_recovery_enabled = true

  # Monitoring
  enable_cloudwatch_alarms = true
  alarm_actions = [aws_sns_topic.alerts.arn]

  common_tags = {
    Environment = "production"
    Project     = "myapp"
    Sensitive   = "true"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| table_name | Name of the DynamoDB table | `string` | n/a | yes |
| hash_key | The attribute to use as the hash (partition) key | `string` | n/a | yes |
| attributes | List of nested attribute definitions | `list(object)` | n/a | yes |
| range_key | The attribute to use as the range (sort) key | `string` | `null` | no |
| billing_mode | Controls how you are charged for read and write throughput | `string` | `"PAY_PER_REQUEST"` | no |
| table_class | The storage class of the table | `string` | `"STANDARD"` | no |
| deletion_protection_enabled | Enable deletion protection for the table | `bool` | `true` | no |
| read_capacity | The number of read units for this table | `number` | `5` | no |
| write_capacity | The number of write units for this table | `number` | `5` | no |
| global_secondary_indexes | Global secondary indexes for the table | `map(object)` | `{}` | no |
| local_secondary_indexes | Local secondary indexes for the table | `map(object)` | `{}` | no |
| ttl_enabled | Enable TTL for the table | `bool` | `false` | no |
| ttl_attribute_name | The name of the TTL attribute | `string` | `"ttl"` | no |
| stream_enabled | Enable DynamoDB streams | `bool` | `false` | no |
| stream_view_type | StreamViewType determines what information is written to the stream | `string` | `"NEW_AND_OLD_IMAGES"` | no |
| encryption_enabled | Enable server-side encryption | `bool` | `true` | no |
| kms_key_id | The ARN of the KMS key to use for encryption | `string` | `null` | no |
| point_in_time_recovery_enabled | Enable point-in-time recovery | `bool` | `true` | no |
| enable_autoscaling | Enable auto scaling for the table | `bool` | `true` | no |
| autoscaling_read_min_capacity | Minimum read capacity for auto scaling | `number` | `5` | no |
| autoscaling_read_max_capacity | Maximum read capacity for auto scaling | `number` | `100` | no |
| autoscaling_write_min_capacity | Minimum write capacity for auto scaling | `number` | `5` | no |
| autoscaling_write_max_capacity | Maximum write capacity for auto scaling | `number` | `100` | no |
| autoscaling_read_target_value | Target value for read capacity auto scaling | `number` | `70` | no |
| autoscaling_write_target_value | Target value for write capacity auto scaling | `number` | `70` | no |
| enable_continuous_backups | Enable continuous backups with AWS Backup | `bool` | `false` | no |
| backup_schedule | Cron expression for backup schedule | `string` | `"cron(0 2 * * ? *)"` | no |
| backup_cold_storage_after | Days after creation when a backup is moved to cold storage | `number` | `30` | no |
| backup_delete_after | Days after creation when a backup is deleted | `number` | `365` | no |
| backup_kms_key_arn | KMS key ARN for backup encryption | `string` | `null` | no |
| enable_cloudwatch_alarms | Enable CloudWatch alarms for the table | `bool` | `true` | no |
| read_throttle_alarm_threshold | Threshold for read throttled requests alarm | `number` | `0` | no |
| write_throttle_alarm_threshold | Threshold for write throttled requests alarm | `number` | `0` | no |
| consumed_read_capacity_alarm_threshold | Threshold for consumed read capacity alarm | `number` | `80` | no |
| consumed_write_capacity_alarm_threshold | Threshold for consumed write capacity alarm | `number` | `80` | no |
| alarm_actions | List of ARNs to notify when alarm triggers | `list(string)` | `[]` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| table_name | Name of the DynamoDB table |
| table_id | ID of the DynamoDB table |
| table_arn | ARN of the DynamoDB table |
| table_stream_arn | ARN of the DynamoDB table stream |
| table_stream_label | Timestamp for the stream |
| table_hash_key | Hash key of the DynamoDB table |
| table_range_key | Range key of the DynamoDB table |
| table_billing_mode | Billing mode of the DynamoDB table |
| table_read_capacity | Read capacity of the DynamoDB table |
| table_write_capacity | Write capacity of the DynamoDB table |
| global_secondary_indexes | Global secondary indexes of the table |
| local_secondary_indexes | Local secondary indexes of the table |
| point_in_time_recovery_enabled | Whether point-in-time recovery is enabled |
| server_side_encryption_enabled | Whether server-side encryption is enabled |
| ttl_enabled | Whether TTL is enabled |
| stream_enabled | Whether DynamoDB streams are enabled |
| read_autoscaling_target_arn | ARN of the read capacity auto scaling target |
| write_autoscaling_target_arn | ARN of the write capacity auto scaling target |
| backup_vault_arn | ARN of the backup vault |
| backup_plan_arn | ARN of the backup plan |
| read_throttle_alarm_arn | ARN of the read throttle CloudWatch alarm |
| write_throttle_alarm_arn | ARN of the write throttle CloudWatch alarm |

## Best Practices

1. **Billing Mode**: Use PAY_PER_REQUEST for unpredictable workloads, PROVISIONED for consistent workloads
2. **Security**: Always enable encryption and point-in-time recovery for production tables
3. **Monitoring**: Enable CloudWatch alarms to monitor throttling and capacity utilization
4. **Backup**: Configure continuous backups for critical data
5. **Auto-scaling**: Enable auto-scaling for provisioned tables to handle traffic spikes
6. **GSI Design**: Design GSIs carefully to avoid hot partitions
7. **Deletion Protection**: Enable deletion protection for production tables

## Cost Optimization

- Use PAY_PER_REQUEST for low-traffic tables
- Use STANDARD_INFREQUENT_ACCESS table class for infrequently accessed data
- Configure appropriate backup retention periods
- Monitor and optimize GSI usage
- Use auto-scaling to avoid over-provisioning capacity