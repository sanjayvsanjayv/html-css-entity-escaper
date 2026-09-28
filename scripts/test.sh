#!/usr/bin/env bash
# Runs the lightweight test suite. Used locally and by Jenkins.
# Usage: ./scripts/test.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run tests (no other dependency needed)." >&2
  exit 1
fi

node tests/test.js
