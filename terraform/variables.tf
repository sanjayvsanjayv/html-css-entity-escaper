variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Short name used to prefix/tag all resources."
  type        = string
  default     = "entity-escaper"
}

variable "environment" {
  description = "Deployment environment name (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "deployment_mode" {
  description = <<-EOT
    Which infrastructure approach to provision:
      "student"    (Option B, RECOMMENDED for this project) - a single
                    EC2 instance running k3s (lightweight Kubernetes).
                    Cheap, fast to create/destroy, fits AWS free tier.
      "production" (Option A) - full managed AWS EKS cluster. Realistic
                    production architecture, but costs significantly more
                    (control plane + node group run continuously) and
                    takes longer to provision. Use only if you have
                    budget/credits and want to demonstrate EKS itself.
  EOT
  type    = string
  default = "student"

  validation {
    condition     = contains(["student", "production"], var.deployment_mode)
    error_message = "deployment_mode must be either \"student\" or \"production\"."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (2 AZs for basic HA)."
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type for the student/k3s deployment mode."
  type        = string
  default     = "t3.small"
}

variable "eks_node_instance_type" {
  description = "Instance type for EKS worker nodes (production mode only)."
  type        = string
  default     = "t3.medium"
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes (production mode only)."
  type        = number
  default     = 2
}

variable "ssh_key_name" {
  description = "Name of an existing EC2 key pair, used for Ansible access to the k3s host (student mode only). Create this in the AWS console/CLI beforehand."
  type        = string
  default     = "REPLACE_WITH_YOUR_KEY_PAIR_NAME"
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the k3s host. Restrict this to your own IP (e.g. 203.0.113.10/32), never 0.0.0.0/0 in real use."
  type        = string
  default     = "203.0.113.10/32"
}
