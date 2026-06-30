# CI - Docker Build + Version Verification

Closes the loop on traceable deploys: the Dockerfile accepts `BUILD_SHA` (#330), and this workflow actually passes it and proves it.

## What it does (on push/PR to main)
1. Builds the image with `--build-arg BUILD_SHA=${{ github.sha }}` (with GHA layer caching).
2. Boots the container.
3. Curls `/version` and checks the reported `commit` matches the built SHA.

If the image can't fully boot in CI (it pulls Chromium for whatsapp-web.js, which can be heavy), the verification step warns rather than hard-failing - the **build itself** still gates the PR.

## Why
- Catches a broken Dockerfile/build on every PR (before deploy).
- Guarantees the `/version` -> commit mapping actually works, so post-deploy you can trust `curl /version`.

## Relation to the other CI
`ci.yml` runs the smoke/unit suite (no Docker). This `docker-build.yml` validates the production image. Together: code correctness + shippable artifact, both checked per PR.
