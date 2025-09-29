# Variables for S3 Module

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "force_destroy" {
  description = "Allow the bucket to be destroyed even if it contains objects"
  type        = bool
  default     = false
}

# Versioning
variable "versioning_enabled" {
  description = "Enable versioning for the S3 bucket"
  type        = bool
  default     = true
}

# Encryption
variable "sse_algorithm" {
  description = "Server-side encryption algorithm"
  type        = string
  default     = "AES256"
  validation {
    condition     = contains(["AES256", "aws:kms"], var.sse_algorithm)
    error_message = "SSE algorithm must be either 'AES256' or 'aws:kms'."
  }
}

variable "kms_master_key_id" {
  description = "KMS key ID for encryption (required if sse_algorithm is aws:kms)"
  type        = string
  default     = null
}

variable "bucket_key_enabled" {
  description = "Enable S3 bucket key for KMS encryption"
  type        = bool
  default     = true
}

# Public Access Block
variable "block_public_acls" {
  description = "Block public ACLs"
  type        = bool
  default     = true
}

variable "block_public_policy" {
  description = "Block public bucket policies"
  type        = bool
  default     = true
}

variable "ignore_public_acls" {
  description = "Ignore public ACLs"
  type        = bool
  default     = true
}

variable "restrict_public_buckets" {
  description = "Restrict public bucket policies"
  type        = bool
  default     = true
}

# Bucket Policy
variable "bucket_policy" {
  description = "JSON policy document for the bucket"
  type        = string
  default     = null
}

# Lifecycle Rules
variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    id      = string
    enabled = bool
    filter = optional(object({
      prefix = optional(string)
      tags   = optional(map(string))
    }))
    expiration = optional(object({
      days                         = optional(number)
      date                         = optional(string)
      expired_object_delete_marker = optional(bool)
    }))
    noncurrent_version_expiration = optional(object({
      days                      = number
      newer_noncurrent_versions = optional(number)
    }))
    transitions = optional(list(object({
      days          = optional(number)
      date          = optional(string)
      storage_class = string
    })))
    noncurrent_version_transitions = optional(list(object({
      days                      = number
      storage_class             = string
      newer_noncurrent_versions = optional(number)
    })))
    abort_incomplete_multipart_upload_days = optional(number)
  }))
  default = []
}

# CORS Configuration
variable "cors_rules" {
  description = "List of CORS rules for the bucket"
  type = list(object({
    allowed_headers = optional(list(string))
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

# Website Configuration
variable "website_configuration" {
  description = "Website configuration for the bucket"
  type = object({
    index_document = optional(object({
      suffix = string
    }))
    error_document = optional(object({
      key = string
    }))
    redirect_all_requests_to = optional(object({
      host_name = string
      protocol  = optional(string)
    }))
    routing_rules = optional(list(object({
      condition = optional(object({
        http_error_code_returned_equals = optional(string)
        key_prefix_equals               = optional(string)
      }))
      redirect = object({
        host_name               = optional(string)
        http_redirect_code      = optional(string)
        protocol                = optional(string)
        replace_key_prefix_with = optional(string)
        replace_key_with        = optional(string)
      })
    })))
  })
  default = null
}

# Access Logging
variable "access_logging_enabled" {
  description = "Enable access logging for the bucket"
  type        = bool
  default     = false
}

variable "access_log_target_bucket" {
  description = "Target bucket for access logs (if empty, a new bucket will be created)"
  type        = string
  default     = ""
}

variable "access_log_target_prefix" {
  description = "Prefix for access log objects"
  type        = string
  default     = "access-logs/"
}

# Notifications
variable "lambda_notifications" {
  description = "Lambda function notifications for S3 events"
  type = list(object({
    lambda_function_arn = string
    events              = list(string)
    filter_prefix       = optional(string)
    filter_suffix       = optional(string)
  }))
  default = []
}

variable "sns_notifications" {
  description = "SNS topic notifications for S3 events"
  type = list(object({
    topic_arn     = string
    events        = list(string)
    filter_prefix = optional(string)
    filter_suffix = optional(string)
  }))
  default = []
}

variable "sqs_notifications" {
  description = "SQS queue notifications for S3 events"
  type = list(object({
    queue_arn     = string
    events        = list(string)
    filter_prefix = optional(string)
    filter_suffix = optional(string)
  }))
  default = []
}

# CloudFront Distribution
variable "create_cloudfront_distribution" {
  description = "Create a CloudFront distribution for the S3 bucket"
  type        = bool
  default     = false
}

variable "cloudfront_ipv6_enabled" {
  description = "Enable IPv6 for CloudFront distribution"
  type        = bool
  default     = true
}

variable "cloudfront_default_root_object" {
  description = "Default root object for CloudFront distribution"
  type        = string
  default     = "index.html"
}

variable "cloudfront_aliases" {
  description = "CNAMEs (alternate domain names) for the CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "cloudfront_allowed_methods" {
  description = "HTTP methods that CloudFront processes and forwards"
  type        = list(string)
  default     = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
}

variable "cloudfront_cached_methods" {
  description = "HTTP methods for which CloudFront caches responses"
  type        = list(string)
  default     = ["GET", "HEAD"]
}

variable "cloudfront_compress" {
  description = "Enable CloudFront compression"
  type        = bool
  default     = true
}

variable "cloudfront_viewer_protocol_policy" {
  description = "Protocol policy for viewers"
  type        = string
  default     = "redirect-to-https"
  validation {
    condition = contains([
      "allow-all",
      "redirect-to-https",
      "https-only"
    ], var.cloudfront_viewer_protocol_policy)
    error_message = "Viewer protocol policy must be one of: allow-all, redirect-to-https, https-only."
  }
}

variable "cloudfront_forward_query_string" {
  description = "Forward query strings to the origin"
  type        = bool
  default     = false
}

variable "cloudfront_forward_cookies" {
  description = "Forward cookies to the origin"
  type        = string
  default     = "none"
  validation {
    condition     = contains(["none", "whitelist", "all"], var.cloudfront_forward_cookies)
    error_message = "Forward cookies must be one of: none, whitelist, all."
  }
}

variable "cloudfront_min_ttl" {
  description = "Minimum TTL for CloudFront cache"
  type        = number
  default     = 0
}

variable "cloudfront_default_ttl" {
  description = "Default TTL for CloudFront cache"
  type        = number
  default     = 3600
}

variable "cloudfront_max_ttl" {
  description = "Maximum TTL for CloudFront cache"
  type        = number
  default     = 86400
}

variable "cloudfront_geo_restriction_type" {
  description = "Type of geo restriction"
  type        = string
  default     = "none"
  validation {
    condition     = contains(["none", "whitelist", "blacklist"], var.cloudfront_geo_restriction_type)
    error_message = "Geo restriction type must be one of: none, whitelist, blacklist."
  }
}

variable "cloudfront_geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "cloudfront_acm_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront"
  type        = string
  default     = null
}

variable "cloudfront_price_class" {
  description = "Price class for CloudFront distribution"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "Price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}