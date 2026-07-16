data "aws_availability_zones" "available" {
  state = "available"
}

# ---------------------------------------------------------------------------
# VPC — dedicated, public-only. No NAT, no private subnets, no VPC endpoints.
# All plumbing (VPC, subnets, IGW, route tables, SG) is free; the only real
# charge in this stack is the RDS public IPv4.
# ---------------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # required for publicly_accessible RDS to get a public DNS name

  tags = {
    Name = "${var.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.name_prefix}-public-${data.aws_availability_zones.available.names[count.index]}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ---------------------------------------------------------------------------
# Security group — Postgres reachable from the internet (SG source = the
# 0.0.0.0/0 contract). AWS SGs are allow-only + stateful, so a single ingress
# allow plus an all-egress allow is the whole firewall.
# ---------------------------------------------------------------------------

resource "aws_security_group" "db" {
  name        = "${var.name_prefix}-postgres-sg"
  description = "Allow Postgres 5432 from approved sources"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Postgres"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_ingress_cidrs
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------------------------------------------------------------------
# Database — RDS Postgres + pgvector. Single instance (not Aurora): App Runner's
# warm psycopg pool would pin connections and defeat scale-to-zero anyway, and a
# warm/predictable DB is preferred for a demo. pgvector is enabled via SQL
# (CREATE EXTENSION vector in db/init.sql), not here.
# ---------------------------------------------------------------------------

resource "random_password" "db" {
  length  = 32
  special = true
  # Exclude characters that are awkward inside connection strings / URLs.
  override_special = "!#%*-_=+"
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.public[*].id
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-postgres17"
  family = "postgres17"
}

resource "aws_db_instance" "main" {
  identifier     = var.db_identifier
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = true

  # POC posture — no snapshot gymnastics, easy teardown.
  skip_final_snapshot = true
  deletion_protection = false
}
