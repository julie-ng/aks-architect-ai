region      = "eu-west-1"
name_prefix = "skai"

# --- Networking ---
# /24 VPC is deliberately oversized-for-safety yet small (a /16 would be waste).
# Two /27 public subnets across two AZs satisfy the RDS subnet-group requirement.
vpc_cidr            = "10.0.0.0/24"
public_subnet_cidrs = ["10.0.0.0/27", "10.0.0.32/27"]

# POC: any source may reach 5432; password is the control (callers' egress IPs are non-static).
db_ingress_cidrs = ["0.0.0.0/0"]

# --- Database ---
db_identifier        = "skai-postgres-db"
db_name              = "skaidb"
db_username          = "skai_admin"
db_instance_class    = "db.t4g.micro"
db_allocated_storage = 20
db_engine_version    = "17"
