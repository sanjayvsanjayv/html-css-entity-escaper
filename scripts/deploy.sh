#!/usr/bin/env bash
# Applies all Kubernetes manifests in the correct order.
# Requires: kubectl configured with KUBECONFIG pointing at your cluster.
# Usage: ./scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Applying namespace..."
kubectl apply -f kubernetes/namespace.yaml

echo "Applying configmap..."
kubectl apply -f kubernetes/configmap.yaml -n entity-escaper

echo "Applying deployment..."
kubectl apply -f kubernetes/deployment.yaml -n entity-escaper

echo "Applying service..."
kubectl apply -f kubernetes/service.yaml -n entity-escaper

echo "Applying ingress..."
kubectl apply -f kubernetes/ingress.yaml -n entity-escaper

echo "Waiting for rollout..."
kubectl rollout status deployment/entity-escaper -n entity-escaper --timeout=120s

echo "Done. Current pods:"
kubectl get pods -n entity-escaper -l app=entity-escaper
