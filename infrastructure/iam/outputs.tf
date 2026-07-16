# Role ARNs — the handles CDK (Lambdas) and App Runner (retrieval-api) attach to.

output "crawlee_role_arn" {
  description = "Execution role ARN for skai-crawlee-fn."
  value       = aws_iam_role.crawlee.arn
}

output "chunking_role_arn" {
  description = "Execution role ARN for skai-chunking-fn."
  value       = aws_iam_role.chunking.arn
}

output "embed_role_arn" {
  description = "Execution role ARN for skai-embed-fn."
  value       = aws_iam_role.embed.arn
}

output "retrieval_api_role_arn" {
  description = "App Runner instance role ARN for retrieval-api."
  value       = aws_iam_role.retrieval_api.arn
}
