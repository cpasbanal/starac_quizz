#!/bin/bash
# Usage: ./update.sh ["Artifact link shared.zip"] ["message"]
set -e
cd "$(dirname "$0")"
ZIP="${1:-Starac quizz.zip}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

unzip -o -q "$ZIP" -d "$TMP"

# deploy/ may be at the zip root or nested (e.g. "Artifact link shared/deploy/")
DEPLOY="$(find "$TMP" -type d -name deploy -print -quit)"
if [ -z "$DEPLOY" ]; then
  echo "No deploy/ folder found in $ZIP" >&2
  exit 1
fi

cp -R "$DEPLOY/." .

(cd "$DEPLOY" && find . -type f | sed 's|^\./||') | while IFS= read -r f; do
  git add -- "$f"
done

if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "${2:-Update from design}"
git push
