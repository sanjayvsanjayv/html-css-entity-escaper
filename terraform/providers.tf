# Provider: AWS
#
# AWS is used here because it has the most widely available free-tier
# resources for a student demo (EC2, VPC, security groups), the best
# documentation for EKS/k3s-on-EC2 setups, and is the most common cloud
# used in DevOps coursework/interviews. Any of the big three clouds would
# work; AWS was chosen for familiarity and cost-control options.
#
# Credentials are NEVER stored here. Configure them via:
#   aws configure
# or environment variables:
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN
# or an IAM role when running from Jenkins/CI.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: uncomment to keep state remotely instead of locally.
  # backend "s3" {
  #   bucket         = "REPLACE_WITH_YOUR_TF_STATE_BUCKET"
  #   key            = "entity-escaper/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "REPLACE_WITH_YOUR_LOCK_TABLE"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
  # No hard-coded keys. Terraform picks up credentials from the AWS CLI
  # config, environment variables, or an attached IAM role automatically.
}
