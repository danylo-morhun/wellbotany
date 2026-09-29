#!/usr/bin/env bash
# Production deploy by hand (git auto-deploy is off in vercel.json).
# Builds on Vercel from a clean worktree of origin/main, so uncommitted files
# and local .env* never get uploaded. Usage: scripts/deploy-prod.sh [ref]
set -euo pipefail

ref="${1:-origin/main}"
root="$(git rev-parse --show-toplevel)"
dir="$(mktemp -d)/wellbotany-deploy"

git -C "$root" fetch -q origin
git -C "$root" worktree add -q --detach "$dir" "$ref"
trap 'git -C "$root" worktree remove --force "$dir"' EXIT

mkdir -p "$dir/.vercel"
cp "$root/.vercel/project.json" "$dir/.vercel/project.json"

echo "Deploying $(git -C "$dir" log --oneline -1) to production…"
cd "$dir"
npx -y vercel@latest deploy --prod --yes
