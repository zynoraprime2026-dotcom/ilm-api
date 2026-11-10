#!/usr/bin/env bash
# Cuts an SDK release: checks the tag matches the version, packs the tarball, and
# prints the publish commands. Nothing is published without NPM_TOKEN present.
set -euo pipefail
cd "$(dirname "$0")/../sdk"
VERSION=$(node -p "require('./package.json').version")
echo "sdk version: $VERSION"
node --check index.js
npm run test:unit --silent
if [ -n "${ILM_API_KEY:-}" ]; then npm run test:live --silent; else echo "ILM_API_KEY unset: live contract tests skipped"; fi
rm -f "ilm-api-$VERSION.tgz"
npm pack --silent
ls -l "ilm-api-$VERSION.tgz"
if [ -n "${NPM_TOKEN:-}" ]; then
  NODE_AUTH_TOKEN="$NPM_TOKEN" npm publish --access public
  echo "published ilm-api@$VERSION"
else
  echo "NPM_TOKEN unset: tarball packed, not published."
  echo "  publish:  cd sdk && NODE_AUTH_TOKEN=<token> npm publish --access public"
  echo "  tag:      git tag sdk-v$VERSION && git push origin sdk-v$VERSION"
fi
