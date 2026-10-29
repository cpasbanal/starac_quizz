#!/bin/bash
# Publish: commit every change and push. Vercel redeploys the site from GitHub.
# Usage: ./update.sh ["commit message"]
set -e
cd "$(dirname "$0")"
git add -A
if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi
git commit -m "${1:-Update Quiz Party}"
git push
