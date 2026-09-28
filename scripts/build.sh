#!/usr/bin/env bash
# Builds the Docker image locally.
# Usage: ./scripts/build.sh [tag]
set -euo pipefail

IMAGE_NAME="html-css-entity-escaper"
TAG="${1:-local}"

cd "$(dirname "$0")/.."

echo "Building ${IMAGE_NAME}:${TAG} ..."
docker build -f docker/Dockerfile -t "${IMAGE_NAME}:${TAG}" .

echo "Done. Run it with:"
echo "  docker run -d -p 8080:80 --name entity-escaper ${IMAGE_NAME}:${TAG}"
