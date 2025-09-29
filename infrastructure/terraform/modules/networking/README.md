# Networking Module

This Terraform module creates a complete VPC infrastructure with public and private subnets, NAT gateways, and security groups for different services.

## Features

- VPC with configurable CIDR block
- Public and private subnets across multiple availability zones
- Internet Gateway for public subnet access
- NAT Gateways for private subnet internet access (optional)
- Security groups for ALB, ECS, Lambda, and database services
- VPC endpoints for AWS services (optional)

## Usage

```hcl
module "networking" {
  source = "./modules/networking"

  name_prefix           = "myapp"
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
  enable_nat_gateway   = true
  enable_vpc_endpoints = false

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name_prefix | Prefix for resource names | `string` | n/a | yes |
| vpc_cidr | CIDR block for VPC | `string` | `"10.0.0.0/16"` | no |
| public_subnet_cidrs | CIDR blocks for public subnets | `list(string)` | `["10.0.1.0/24", "10.0.2.0/24"]` | no |
| private_subnet_cidrs | CIDR blocks for private subnets | `list(string)` | `["10.0.10.0/24", "10.0.20.0/24"]` | no |
| enable_dns_hostnames | Enable DNS hostnames in VPC | `bool` | `true` | no |
| enable_dns_support | Enable DNS support in VPC | `bool` | `true` | no |
| enable_nat_gateway | Enable NAT Gateway for private subnets | `bool` | `true` | no |
| enable_vpc_endpoints | Enable VPC endpoints for AWS services | `bool` | `false` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | ID of the VPC |
| vpc_cidr_block | CIDR block of the VPC |
| internet_gateway_id | ID of the Internet Gateway |
| public_subnet_ids | IDs of the public subnets |
| private_subnet_ids | IDs of the private subnets |
| public_subnet_cidrs | CIDR blocks of the public subnets |
| private_subnet_cidrs | CIDR blocks of the private subnets |
| nat_gateway_ids | IDs of the NAT Gateways |
| nat_gateway_public_ips | Public IPs of the NAT Gateways |
| alb_security_group_id | ID of the ALB security group |
| ecs_security_group_id | ID of the ECS security group |
| lambda_security_group_id | ID of the Lambda security group |
| database_security_group_id | ID of the database security group |
| availability_zones | List of availability zones used |

## Security Groups

The module creates the following security groups:

- **ALB Security Group**: Allows inbound traffic on ports 80 and 443 from anywhere
- **ECS Security Group**: Allows inbound traffic from ALB security group on all ports above 80
- **Lambda Security Group**: Allows outbound traffic only
- **Database Security Group**: Allows inbound traffic on port 3306 from ECS and Lambda security groups

## Cost Optimization

To reduce costs in non-production environments:

- Set `enable_nat_gateway = false` to avoid NAT Gateway charges
- Use fewer availability zones by providing fewer subnet CIDRs
- Set `enable_vpc_endpoints = false` unless required for compliance