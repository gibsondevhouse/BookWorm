# Stage 02: Core Runtime and Auth

## Purpose

Create the running application shell and the first security boundary so all later work is built on real request handling and authenticated server behavior.

## Current Status

Completed. The API boots through the Express runtime shell, loads validated environment configuration, exposes operational health checks, and resolves the current actor from a server-managed session cookie for admin routes.

## Parts

1. Express Runtime Shell
2. Session Authentication Skeleton
3. Config and Ops Baseline

## Outputs

- running Express and TypeScript server baseline
- request pipeline and health endpoint
- session handling foundation
- initial role resolution path
- environment loading and operational sanity checks

## Exit Criteria

- the app boots in development
- health checks pass
- session creation and validation are wired
- protected routes can identify the current role
