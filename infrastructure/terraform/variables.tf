variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "name_prefix" {
  type    = string
  default = "byot"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "azs" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "rds_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.small"
}

variable "eks_version" {
  type    = string
  default = "1.30"
}

variable "eks_node_groups" {
  type = map(object({
    instance_types = list(string)
    desired_size   = number
    min_size       = number
    max_size       = number
    capacity_type  = string
    labels         = map(string)
  }))
  default = {
    general = {
      instance_types = ["t3a.large"]
      desired_size   = 2
      min_size       = 2
      max_size       = 6
      capacity_type  = "ON_DEMAND"
      labels         = { workload = "general" }
    }
    ai-spot = {
      instance_types = ["m6a.xlarge", "m6i.xlarge"]
      desired_size   = 0
      min_size       = 0
      max_size       = 8
      capacity_type  = "SPOT"
      labels         = { workload = "ai" }
    }
  }
}
