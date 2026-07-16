variable "region" {
  description = "AWS region for all shared resources."
  type        = string
}

variable "name_prefix" {
  description = "Code name / prefix applied to every resource (skai = aks-architect)."
  type        = string
}

# --- Networking ---

variable "vpc_cidr" {
  description = "CIDR block for the dedicated VPC. Intentionally small — footprint is essentially just RDS."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "Two /27 public subnet CIDRs, one per AZ (RDS subnet group requires >= 2 AZs)."
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "Exactly two public subnet CIDRs are required (one per AZ for the RDS subnet group)."
  }
}

variable "db_ingress_cidrs" {
  description = "Source CIDRs allowed to reach Postgres on 5432. 0.0.0.0/0 for the POC (callers have no static egress IPs; password is the control)."
  type        = list(string)
}

# --- Database ---

variable "db_identifier" {
  description = "RDS instance identifier (hyphens allowed here)."
  type        = string
}

variable "db_name" {
  description = "Initial database name. Must be alphanumeric — RDS rejects hyphens on the initial db name."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9]*$", var.db_name))
    error_message = "db_name must start with a letter and contain only alphanumeric characters (no hyphens/underscores)."
  }
}

variable "db_username" {
  description = "Master username for the Postgres instance."
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB (RDS minimum is 20)."
  type        = number
}

variable "db_engine_version" {
  description = "Postgres major/minor engine version."
  type        = string
}
