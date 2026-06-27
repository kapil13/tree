terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.50" }
  }
}

variable "name"                { type = string }
variable "vpc_id"              { type = string }
variable "private_subnet_ids"  { type = list(string) }
variable "allowed_cidr_blocks" { type = list(string) }
variable "db_name"             { type = string, default = "byot" }
variable "db_username"         { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}
variable "instance_class" { type = string }
variable "multi_az"       { type = bool, default = false }

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-rds-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "this" {
  name        = "${var.name}-rds-sg"
  description = "Allow Postgres from VPC"
  vpc_id      = var.vpc_id

  ingress {
    description = "Postgres"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name}-postgis16"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

resource "aws_db_instance" "this" {
  identifier              = "${var.name}-pg"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = var.instance_class
  allocated_storage       = 100
  max_allocated_storage   = 1000
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.this.name
  vpc_security_group_ids  = [aws_security_group.this.id]
  parameter_group_name    = aws_db_parameter_group.this.name
  multi_az                = var.multi_az
  backup_retention_period = 14
  backup_window           = "18:00-19:00"
  maintenance_window      = "Sun:19:30-Sun:20:30"
  skip_final_snapshot     = true
  deletion_protection     = false
  performance_insights_enabled = true
}

output "endpoint" { value = aws_db_instance.this.address }
