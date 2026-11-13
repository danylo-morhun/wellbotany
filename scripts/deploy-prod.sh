#!/usr/bin/env bash
# Manual fallback for the Deploy workflow (.github/workflows/deploy.yml).
# Builds the given commit on the VPS in its own release dir and switches to it
# (deploy/vps/wb-deploy). Refuses when migrations are pending — run
# `ssh wb-vps wb-deploy migrate <sha>` first. Needs the `wb-vps` SSH alias.
# Usage: scripts/deploy-prod.sh [ref]
set -euo pipefail

ref="${1:-origin/main}"
git fetch -q origin
sha="$(git rev-parse "$ref^{commit}")"
echo "Deploying $(git log --oneline -1 "$sha") to production…"
ssh wb-vps wb-deploy deploy "$sha"
