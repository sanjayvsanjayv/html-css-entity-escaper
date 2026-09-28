# -----------------------------------------------------------------------
# Networking — shared by both Option A (EKS) and Option B (EC2 + k3s)
# -----------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.project_name}-igw" }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${count.index}"
    # required for EKS to discover subnets when in production mode
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# -----------------------------------------------------------------------
# Option B (RECOMMENDED): EC2 + k3s — cheap, fast, good for a student demo
# -----------------------------------------------------------------------

resource "aws_security_group" "k3s_node" {
  count       = var.deployment_mode == "student" ? 1 : 0
  name        = "${var.project_name}-k3s-sg"
  description = "Security group for the k3s demo node"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH (restrict to your own IP)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "HTTP (app / ingress)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS (ingress, if TLS configured)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "k3s Kubernetes API (restrict in real use)"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-k3s-sg" }
}

data "aws_ami" "ubuntu" {
  count       = var.deployment_mode == "student" ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "k3s_node" {
  count                  = var.deployment_mode == "student" ? 1 : 0
  ami                    = data.aws_ami.ubuntu[0].id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.k3s_node[0].id]
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name        = "${var.project_name}-k3s-node"
    Project     = var.project_name
    Environment = var.environment
    # Ansible will target this host via its Public IP (see ansible/inventory.ini.example)
  }
}

resource "aws_eip" "k3s_node" {
  count    = var.deployment_mode == "student" ? 1 : 0
  instance = aws_instance.k3s_node[0].id
  domain   = "vpc"

  tags = { Name = "${var.project_name}-k3s-eip" }
}

# -----------------------------------------------------------------------
# Option A: Managed AWS EKS — realistic production architecture
# NOTE: this creates real, continuously-billed resources (control plane
# + worker nodes). Only enable via deployment_mode = "production".
# -----------------------------------------------------------------------

resource "aws_iam_role" "eks_cluster" {
  count = var.deployment_mode == "production" ? 1 : 0
  name  = "${var.project_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count      = var.deployment_mode == "production" ? 1 : 0
  role       = aws_iam_role.eks_cluster[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "main" {
  count    = var.deployment_mode == "production" ? 1 : 0
  name     = "${var.project_name}-eks"
  role_arn = aws_iam_role.eks_cluster[0].arn

  vpc_config {
    subnet_ids = aws_subnet.public[*].id
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = { Project = var.project_name, Environment = var.environment }
}

resource "aws_iam_role" "eks_node" {
  count = var.deployment_mode == "production" ? 1 : 0
  name  = "${var.project_name}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_worker" {
  count      = var.deployment_mode == "production" ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_node_cni" {
  count      = var.deployment_mode == "production" ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_node_ecr" {
  count      = var.deployment_mode == "production" ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_node_group" "main" {
  count           = var.deployment_mode == "production" ? 1 : 0
  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${var.project_name}-nodes"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = aws_subnet.public[*].id
  instance_types  = [var.eks_node_instance_type]

  scaling_config {
    desired_size = var.eks_node_desired_size
    max_size     = var.eks_node_desired_size + 1
    min_size     = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_worker,
    aws_iam_role_policy_attachment.eks_node_cni,
    aws_iam_role_policy_attachment.eks_node_ecr,
  ]
}
