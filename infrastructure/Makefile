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
