#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

git config core.hooksPath .githooks
chmod +x .githooks/post-commit
