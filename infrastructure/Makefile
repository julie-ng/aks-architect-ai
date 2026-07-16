PROFILE     = process
REGION      = eu-west-1
TITAN_MODEL = amazon.titan-embed-text-v2:0
NOVA_MODEL  = amazon.nova-micro-v1:0

AWS = aws --profile $(PROFILE) --region $(REGION)

# Enable Bedrock model access via the foundation-model agreement flow.
# Amazon-owned models (Titan, Nova) are often access-enabled by default, in which
# case create-foundation-model-agreement is a no-op / already-accepted. Errors are
# NOT suppressed — run `enable-aws-models/status` first to see current access.
enable-aws-models:
	@echo "Accepting model agreements in $(REGION): $(TITAN_MODEL), $(NOVA_MODEL)"
	$(AWS) bedrock create-foundation-model-agreement \
		--model-id $(TITAN_MODEL) \
		--offer-token $$($(AWS) bedrock list-foundation-model-agreement-offers \
			--model-id $(TITAN_MODEL) --query 'offers[0].offerToken' --output text)
	$(AWS) bedrock create-foundation-model-agreement \
		--model-id $(NOVA_MODEL) \
		--offer-token $$($(AWS) bedrock list-foundation-model-agreement-offers \
			--model-id $(NOVA_MODEL) --query 'offers[0].offerToken' --output text)

enable-aws-models/status:
	$(AWS) bedrock list-foundation-models \
		--query "modelSummaries[?contains(modelId, 'titan-embed-text-v2') || contains(modelId, 'nova-micro')].[modelId,modelLifecycle.status]" \
		--output table

# Apply db/init.sql (schema + pgvector extension) to the RDS instance.
# Connection values come from `terraform output` in shared/; psql runs inside the
# pgvector container so no local psql install is needed. Idempotent — init.sql
# uses IF NOT EXISTS throughout.
TF_SHARED = terraform -chdir=shared output -raw
INIT_SQL  = ../db/init.sql

init-db:
	@command -v docker >/dev/null || { echo "docker is required (psql runs in the pgvector container)"; exit 1; }
	@test -f $(INIT_SQL) || { echo "not found: $(INIT_SQL)"; exit 1; }
	@echo "Applying $(INIT_SQL) to RDS: $$($(TF_SHARED) db_address)/$$($(TF_SHARED) db_name)"
	@PGPASSWORD="$$($(TF_SHARED) db_password)" \
		docker run --rm -i -e PGPASSWORD \
			pgvector/pgvector:pg17 \
			psql \
				-h "$$($(TF_SHARED) db_address)" \
				-p "$$($(TF_SHARED) db_port)" \
				-U "$$($(TF_SHARED) db_username)" \
				-d "$$($(TF_SHARED) db_name)" \
				-v ON_ERROR_STOP=1 \
			< $(INIT_SQL)
	@echo "Schema applied."
