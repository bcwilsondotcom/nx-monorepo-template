# DynamoDB Module
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# DynamoDB Table
resource "aws_dynamodb_table" "main" {
  name           = var.table_name
  billing_mode   = var.billing_mode
  hash_key       = var.hash_key
  range_key      = var.range_key

  # Provisioned throughput (only if billing_mode is PROVISIONED)
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  # Table class
  table_class = var.table_class

  # Deletion protection
  deletion_protection_enabled = var.deletion_protection_enabled

  # Attributes
  dynamic "attribute" {
    for_each = var.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  # Global Secondary Indexes
  dynamic "global_secondary_index" {
    for_each = var.global_secondary_indexes
    content {
      name               = global_secondary_index.value.name
      hash_key           = global_secondary_index.value.hash_key
      range_key          = global_secondary_index.value.range_key
      projection_type    = global_secondary_index.value.projection_type
      non_key_attributes = global_secondary_index.value.non_key_attributes

      # Provisioned throughput for GSI (only if billing_mode is PROVISIONED)
      read_capacity  = var.billing_mode == "PROVISIONED" ? global_secondary_index.value.read_capacity : null
      write_capacity = var.billing_mode == "PROVISIONED" ? global_secondary_index.value.write_capacity : null
    }
  }

  # Local Secondary Indexes
  dynamic "local_secondary_index" {
    for_each = var.local_secondary_indexes
    content {
      name               = local_secondary_index.value.name
      range_key          = local_secondary_index.value.range_key
      projection_type    = local_secondary_index.value.projection_type
      non_key_attributes = local_secondary_index.value.non_key_attributes
    }
  }

  # TTL
  dynamic "ttl" {
    for_each = var.ttl_enabled ? [1] : []
    content {
      attribute_name = var.ttl_attribute_name
      enabled        = var.ttl_enabled
    }
  }

  # Stream
  stream_enabled   = var.stream_enabled
  stream_view_type = var.stream_enabled ? var.stream_view_type : null

  # Server-side encryption
  dynamic "server_side_encryption" {
    for_each = var.encryption_enabled ? [1] : []
    content {
      enabled     = var.encryption_enabled
      kms_key_id  = var.kms_key_id
    }
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.point_in_time_recovery_enabled
  }

  tags = var.common_tags

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      read_capacity,
      write_capacity,
    ]
  }
}

# Auto Scaling for Read Capacity
resource "aws_appautoscaling_target" "read_target" {
  count = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? 1 : 0

  max_capacity       = var.autoscaling_read_max_capacity
  min_capacity       = var.autoscaling_read_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "read_policy" {
  count = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? 1 : 0

  name               = "${var.table_name}-read-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.read_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.read_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.read_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = var.autoscaling_read_target_value
  }
}

# Auto Scaling for Write Capacity
resource "aws_appautoscaling_target" "write_target" {
  count = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? 1 : 0

  max_capacity       = var.autoscaling_write_max_capacity
  min_capacity       = var.autoscaling_write_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "write_policy" {
  count = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? 1 : 0

  name               = "${var.table_name}-write-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.write_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.write_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.write_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = var.autoscaling_write_target_value
  }
}

# Auto Scaling for GSI Read Capacity
resource "aws_appautoscaling_target" "gsi_read_target" {
  for_each = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? var.global_secondary_indexes : {}

  max_capacity       = each.value.autoscaling_read_max_capacity != null ? each.value.autoscaling_read_max_capacity : var.autoscaling_read_max_capacity
  min_capacity       = each.value.autoscaling_read_min_capacity != null ? each.value.autoscaling_read_min_capacity : var.autoscaling_read_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main.name}/index/${each.value.name}"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_read_policy" {
  for_each = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? var.global_secondary_indexes : {}

  name               = "${var.table_name}-${each.value.name}-read-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_read_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_read_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_read_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = var.autoscaling_read_target_value
  }
}

# Auto Scaling for GSI Write Capacity
resource "aws_appautoscaling_target" "gsi_write_target" {
  for_each = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? var.global_secondary_indexes : {}

  max_capacity       = each.value.autoscaling_write_max_capacity != null ? each.value.autoscaling_write_max_capacity : var.autoscaling_write_max_capacity
  min_capacity       = each.value.autoscaling_write_min_capacity != null ? each.value.autoscaling_write_min_capacity : var.autoscaling_write_min_capacity
  resource_id        = "table/${aws_dynamodb_table.main.name}/index/${each.value.name}"
  scalable_dimension = "dynamodb:index:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_write_policy" {
  for_each = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? var.global_secondary_indexes : {}

  name               = "${var.table_name}-${each.value.name}-write-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_write_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_write_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_write_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = var.autoscaling_write_target_value
  }
}

# Backup Vault (if continuous backups are enabled)
resource "aws_backup_vault" "dynamodb" {
  count = var.enable_continuous_backups ? 1 : 0

  name        = "${var.table_name}-backup-vault"
  kms_key_arn = var.backup_kms_key_arn

  tags = var.common_tags
}

# Backup Plan
resource "aws_backup_plan" "dynamodb" {
  count = var.enable_continuous_backups ? 1 : 0

  name = "${var.table_name}-backup-plan"

  rule {
    rule_name         = "${var.table_name}-backup-rule"
    target_vault_name = aws_backup_vault.dynamodb[0].name
    schedule          = var.backup_schedule

    recovery_point_tags = var.common_tags

    lifecycle {
      cold_storage_after = var.backup_cold_storage_after
      delete_after       = var.backup_delete_after
    }
  }

  tags = var.common_tags
}

# IAM Role for Backup
resource "aws_iam_role" "backup" {
  count = var.enable_continuous_backups ? 1 : 0

  name = "${var.table_name}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "backup" {
  count = var.enable_continuous_backups ? 1 : 0

  role       = aws_iam_role.backup[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

# Backup Selection
resource "aws_backup_selection" "dynamodb" {
  count = var.enable_continuous_backups ? 1 : 0

  iam_role_arn = aws_iam_role.backup[0].arn
  name         = "${var.table_name}-backup-selection"
  plan_id      = aws_backup_plan.dynamodb[0].id

  resources = [
    aws_dynamodb_table.main.arn
  ]
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "read_throttled_requests" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.table_name}-read-throttled-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = var.read_throttle_alarm_threshold
  alarm_description   = "This metric monitors DynamoDB read throttled requests"
  alarm_actions       = var.alarm_actions

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "write_throttled_requests" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.table_name}-write-throttled-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WriteThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = var.write_throttle_alarm_threshold
  alarm_description   = "This metric monitors DynamoDB write throttled requests"
  alarm_actions       = var.alarm_actions

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "consumed_read_capacity" {
  count = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? 1 : 0

  alarm_name          = "${var.table_name}-consumed-read-capacity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ConsumedReadCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = var.consumed_read_capacity_alarm_threshold
  alarm_description   = "This metric monitors DynamoDB consumed read capacity"
  alarm_actions       = var.alarm_actions

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "consumed_write_capacity" {
  count = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? 1 : 0

  alarm_name          = "${var.table_name}-consumed-write-capacity"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = var.consumed_write_capacity_alarm_threshold
  alarm_description   = "This metric monitors DynamoDB consumed write capacity"
  alarm_actions       = var.alarm_actions

  dimensions = {
    TableName = aws_dynamodb_table.main.name
  }

  tags = var.common_tags
}