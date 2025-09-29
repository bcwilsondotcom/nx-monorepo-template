# Variables for DynamoDB Module

variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "billing_mode" {
  description = "Controls how you are charged for read and write throughput"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.billing_mode)
    error_message = "Billing mode must be either 'PROVISIONED' or 'PAY_PER_REQUEST'."
  }
}

variable "hash_key" {
  description = "The attribute to use as the hash (partition) key"
  type        = string
}

variable "range_key" {
  description = "The attribute to use as the range (sort) key"
  type        = string
  default     = null
}

variable "table_class" {
  description = "The storage class of the table"
  type        = string
  default     = "STANDARD"
  validation {
    condition     = contains(["STANDARD", "STANDARD_INFREQUENT_ACCESS"], var.table_class)
    error_message = "Table class must be either 'STANDARD' or 'STANDARD_INFREQUENT_ACCESS'."
  }
}

variable "deletion_protection_enabled" {
  description = "Enable deletion protection for the table"
  type        = bool
  default     = true
}

# Capacity Settings (for PROVISIONED billing mode)
variable "read_capacity" {
  description = "The number of read units for this table"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "The number of write units for this table"
  type        = number
  default     = 5
}

# Attributes
variable "attributes" {
  description = "List of nested attribute definitions"
  type = list(object({
    name = string
    type = string
  }))
}

# Global Secondary Indexes
variable "global_secondary_indexes" {
  description = "Global secondary indexes for the table"
  type = map(object({
    name               = string
    hash_key           = string
    range_key          = optional(string)
    projection_type    = optional(string, "ALL")
    non_key_attributes = optional(list(string), [])
    read_capacity      = optional(number, 5)
    write_capacity     = optional(number, 5)
    autoscaling_read_max_capacity  = optional(number)
    autoscaling_read_min_capacity  = optional(number)
    autoscaling_write_max_capacity = optional(number)
    autoscaling_write_min_capacity = optional(number)
  }))
  default = {}
}

# Local Secondary Indexes
variable "local_secondary_indexes" {
  description = "Local secondary indexes for the table"
  type = map(object({
    name               = string
    range_key          = string
    projection_type    = optional(string, "ALL")
    non_key_attributes = optional(list(string), [])
  }))
  default = {}
}

# TTL
variable "ttl_enabled" {
  description = "Enable TTL for the table"
  type        = bool
  default     = false
}

variable "ttl_attribute_name" {
  description = "The name of the TTL attribute"
  type        = string
  default     = "ttl"
}

# Stream
variable "stream_enabled" {
  description = "Enable DynamoDB streams"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "When an item in the table is modified, StreamViewType determines what information is written to the table's stream"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
  validation {
    condition = contains([
      "KEYS_ONLY",
      "NEW_IMAGE",
      "OLD_IMAGE",
      "NEW_AND_OLD_IMAGES"
    ], var.stream_view_type)
    error_message = "Stream view type must be one of: KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES."
  }
}

# Encryption
variable "encryption_enabled" {
  description = "Enable server-side encryption"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "The ARN of the KMS key to use for encryption"
  type        = string
  default     = null
}

# Point-in-time Recovery
variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

# Auto Scaling
variable "enable_autoscaling" {
  description = "Enable auto scaling for the table"
  type        = bool
  default     = true
}

variable "autoscaling_read_min_capacity" {
  description = "Minimum read capacity for auto scaling"
  type        = number
  default     = 5
}

variable "autoscaling_read_max_capacity" {
  description = "Maximum read capacity for auto scaling"
  type        = number
  default     = 100
}

variable "autoscaling_write_min_capacity" {
  description = "Minimum write capacity for auto scaling"
  type        = number
  default     = 5
}

variable "autoscaling_write_max_capacity" {
  description = "Maximum write capacity for auto scaling"
  type        = number
  default     = 100
}

variable "autoscaling_read_target_value" {
  description = "Target value for read capacity auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_write_target_value" {
  description = "Target value for write capacity auto scaling"
  type        = number
  default     = 70
}

# Backup Settings
variable "enable_continuous_backups" {
  description = "Enable continuous backups with AWS Backup"
  type        = bool
  default     = false
}

variable "backup_schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "cron(0 2 * * ? *)" # Daily at 2 AM
}

variable "backup_cold_storage_after" {
  description = "Days after creation when a backup is moved to cold storage"
  type        = number
  default     = 30
}

variable "backup_delete_after" {
  description = "Days after creation when a backup is deleted"
  type        = number
  default     = 365
}

variable "backup_kms_key_arn" {
  description = "KMS key ARN for backup encryption"
  type        = string
  default     = null
}

# CloudWatch Alarms
variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms for the table"
  type        = bool
  default     = true
}

variable "read_throttle_alarm_threshold" {
  description = "Threshold for read throttled requests alarm"
  type        = number
  default     = 0
}

variable "write_throttle_alarm_threshold" {
  description = "Threshold for write throttled requests alarm"
  type        = number
  default     = 0
}

variable "consumed_read_capacity_alarm_threshold" {
  description = "Threshold for consumed read capacity alarm"
  type        = number
  default     = 80
}

variable "consumed_write_capacity_alarm_threshold" {
  description = "Threshold for consumed write capacity alarm"
  type        = number
  default     = 80
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}