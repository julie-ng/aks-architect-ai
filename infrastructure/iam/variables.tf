variable "region" {
  description = "AWS region (used only to build Bedrock foundation-model ARNs)."
  type        = string
}

variable "name_prefix" {
  description = "Code name / prefix applied to every resource (skai = aks-architect)."
  type        = string
}

# --- Name-as-contract references (resources created elsewhere) ---
# CDK creates the S3 bucket and the Lambda functions; this folder owns their
# roles and references those resources by their agreed names, never by state.

variable "pipeline_bucket_name" {
  description = "S3 bucket name the pipeline reads/writes (created by CDK). The name is the contract. Per-run layout is s3://<bucket>/<runId>/..."
  type        = string
}

variable "titan_model_arn" {
  description = "Bedrock Titan Text Embeddings V2 foundation-model ARN."
  type        = string
}

variable "nova_model_arn" {
  description = "Bedrock Nova Micro foundation-model ARN (reformulation)."
  type        = string
}

# --- Role names (this folder creates these; CDK/App Runner attach by ARN) ---

variable "crawlee_role_name" {
  description = "Execution role name for the crawlee Lambda."
  type        = string
}

variable "chunking_role_name" {
  description = "Execution role name for the chunking Lambda."
  type        = string
}

variable "embed_role_name" {
  description = "Execution role name for the embed Lambda."
  type        = string
}

variable "retrieval_api_role_name" {
  description = "App Runner instance role name for retrieval-api."
  type        = string
}
