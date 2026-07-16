locals {
  bucket_arn  = "arn:aws:s3:::${var.pipeline_bucket_name}"
  objects_arn = "${local.bucket_arn}/*"
}

# ---------------------------------------------------------------------------
# Trust policies
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "apprunner_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

# The three pipeline stages form one logical unit the same team owns, and they
# share a per-run S3 layout (s3://<bucket>/<runId>/...). Per-prefix least-
# privilege was premature — all three get bucket-wide S3 read+write.

data "aws_iam_policy_document" "pipeline_s3" {
  statement {
    sid       = "ReadWriteBucket"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    resources = [local.bucket_arn, local.objects_arn]
  }
}

# ---------------------------------------------------------------------------
# skai-crawlee-fn — writes crawl output to S3.
# ---------------------------------------------------------------------------

resource "aws_iam_role" "crawlee" {
  name               = var.crawlee_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "crawlee_basic" {
  role       = aws_iam_role.crawlee.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "crawlee_s3" {
  name   = "${var.crawlee_role_name}-s3"
  role   = aws_iam_role.crawlee.id
  policy = data.aws_iam_policy_document.pipeline_s3.json
}

# ---------------------------------------------------------------------------
# skai-chunking-fn — reads sources, writes chunks.
# ---------------------------------------------------------------------------

resource "aws_iam_role" "chunking" {
  name               = var.chunking_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "chunking_basic" {
  role       = aws_iam_role.chunking.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "chunking_s3" {
  name   = "${var.chunking_role_name}-s3"
  role   = aws_iam_role.chunking.id
  policy = data.aws_iam_policy_document.pipeline_s3.json
}

# ---------------------------------------------------------------------------
# skai-embed-fn — reads chunks, invokes Titan, writes to Postgres (network/
# password auth, so no DB-specific IAM).
# ---------------------------------------------------------------------------

resource "aws_iam_role" "embed" {
  name               = var.embed_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

resource "aws_iam_role_policy_attachment" "embed_basic" {
  role       = aws_iam_role.embed.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "embed_s3" {
  name   = "${var.embed_role_name}-s3"
  role   = aws_iam_role.embed.id
  policy = data.aws_iam_policy_document.pipeline_s3.json
}

data "aws_iam_policy_document" "embed" {
  statement {
    sid       = "InvokeTitan"
    actions   = ["bedrock:InvokeModel"]
    resources = [var.titan_model_arn]
  }
}

resource "aws_iam_role_policy" "embed_bedrock" {
  name   = "${var.embed_role_name}-bedrock"
  role   = aws_iam_role.embed.id
  policy = data.aws_iam_policy_document.embed.json
}

# ---------------------------------------------------------------------------
# skai-retrieval-api — App Runner instance role. Invokes Titan (embeddings) +
# Nova Micro (reformulation). DB access is network/password, no DB IAM.
# ---------------------------------------------------------------------------

resource "aws_iam_role" "retrieval_api" {
  name               = var.retrieval_api_role_name
  assume_role_policy = data.aws_iam_policy_document.apprunner_tasks_trust.json
}

data "aws_iam_policy_document" "retrieval_api" {
  statement {
    sid       = "InvokeBedrock"
    actions   = ["bedrock:InvokeModel"]
    resources = [var.titan_model_arn, var.nova_model_arn]
  }
}

resource "aws_iam_role_policy" "retrieval_api" {
  name   = "${var.retrieval_api_role_name}-policy"
  role   = aws_iam_role.retrieval_api.id
  policy = data.aws_iam_policy_document.retrieval_api.json
}
