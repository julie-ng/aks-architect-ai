terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state for the POC. Migrate to an S3 backend if this outlives the demo.
}

provider "aws" {
  profile = "process"
  region  = var.region

  default_tags {
    tags = {
      "skai:managed-by" = "terraform"
      "skai:component"  = "shared"
    }
  }
}
