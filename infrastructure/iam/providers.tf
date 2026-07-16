terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Local state for the POC. Independent from shared/ — this folder never reads
  # shared/ state; all cross-folder references are name-as-contract.
}

provider "aws" {
  profile = "process"
  region  = var.region

  default_tags {
    tags = {
      "skai:managed-by" = "terraform"
      "skai:component"  = "iam"
    }
  }
}
