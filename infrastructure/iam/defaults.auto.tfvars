region      = "eu-west-1"
name_prefix = "skai"

# --- Name-as-contract references (must match what CDK creates) ---
# Per-run S3 layout: s3://skai-pipeline-store/<runId>/{sources/*.json,chunks.jsonl,tagged_chunks.jsonl}
pipeline_bucket_name = "skai-pipeline-store"

# Bedrock foundation-model ARNs (account-agnostic; access enabled out-of-band via `make enable-aws-models`).
titan_model_arn = "arn:aws:bedrock:eu-west-1::foundation-model/amazon.titan-embed-text-v2:0"
nova_model_arn  = "arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-micro-v1:0"

# --- Role names ---
crawlee_role_name       = "skai-crawlee-fn-role"
chunking_role_name      = "skai-chunking-fn-role"
embed_role_name         = "skai-embed-fn-role"
retrieval_api_role_name = "skai-retrieval-api-role"
