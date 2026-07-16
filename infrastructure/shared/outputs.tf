# These outputs are the "by reference" handles consumed downstream (CDK, App
# Runner env, Vercel env, and the iam/ folder via name-as-contract — iam/ never
# reads this state).

output "vpc_id" {
  description = "ID of the dedicated VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = aws_subnet.public[*].id
}

output "db_security_group_id" {
  description = "Security group protecting the Postgres instance."
  value       = aws_security_group.db.id
}

output "db_endpoint" {
  description = "Postgres endpoint (host:port)."
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "Postgres hostname only."
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "Postgres port."
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Initial database name."
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "Master username."
  value       = aws_db_instance.main.username
}

output "db_password" {
  description = "Generated master password."
  value       = random_password.db.result
  sensitive   = true
}

output "db_instance_arn" {
  description = "ARN of the RDS instance."
  value       = aws_db_instance.main.arn
}
