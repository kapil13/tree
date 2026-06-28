terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
  # backend "s3" {  # Configure per env via -backend-config
  #   bucket = "byot-tfstate"
  #   key    = "global/terraform.tfstate"
  #   region = "ap-south-1"
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project    = "BYOT"
      ManagedBy  = "Terraform"
      Environment = var.environment
    }
  }
}

module "network" {
  source = "./modules/network"

  name        = "${var.name_prefix}-${var.environment}"
  cidr_block  = var.vpc_cidr
  azs         = var.azs
  environment = var.environment
}

module "s3" {
  source      = "./modules/s3"
  name_prefix = "${var.name_prefix}-${var.environment}"
}

module "rds" {
  source = "./modules/rds"

  name                = "${var.name_prefix}-${var.environment}"
  vpc_id              = module.network.vpc_id
  private_subnet_ids  = module.network.private_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]
  db_name             = "byot"
  db_username         = "byot_admin"
  db_password         = var.db_password
  instance_class      = var.rds_instance_class
  multi_az            = var.environment == "prod"
}

module "redis" {
  source = "./modules/redis"

  name                = "${var.name_prefix}-${var.environment}"
  vpc_id              = module.network.vpc_id
  private_subnet_ids  = module.network.private_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]
  node_type           = var.redis_node_type
}

module "eks" {
  source = "./modules/eks"

  name               = "${var.name_prefix}-${var.environment}"
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  cluster_version    = var.eks_version
  node_groups        = var.eks_node_groups
}

output "vpc_id"            { value = module.network.vpc_id }
output "rds_endpoint"      { value = module.rds.endpoint }
output "redis_endpoint"    { value = module.redis.primary_endpoint }
output "eks_cluster_name"  { value = module.eks.cluster_name }
output "s3_buckets"        { value = module.s3.bucket_names }
