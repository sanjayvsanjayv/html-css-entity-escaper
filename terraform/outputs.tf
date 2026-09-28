output "vpc_id" {
  description = "ID of the created VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = aws_subnet.public[*].id
}

output "k3s_node_public_ip" {
  description = "Public (Elastic) IP of the k3s demo node — use this in ansible/inventory.ini and to browse the app. Only set when deployment_mode = \"student\"."
  value       = var.deployment_mode == "student" ? aws_eip.k3s_node[0].public_ip : null
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster. Only set when deployment_mode = \"production\"."
  value       = var.deployment_mode == "production" ? aws_eks_cluster.main[0].name : null
}

output "eks_cluster_endpoint" {
  description = "API endpoint of the EKS cluster. Only set when deployment_mode = \"production\"."
  value       = var.deployment_mode == "production" ? aws_eks_cluster.main[0].endpoint : null
}

output "deployment_mode" {
  description = "Which infrastructure option was provisioned."
  value       = var.deployment_mode
}
