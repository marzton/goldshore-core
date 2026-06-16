# Shared Cloudflare Route and Binding Repair Plan

## Repository
`marzton/goldshore-core`

## Objective
Document shared infrastructure expectations so app repos can fail deployment when required Cloudflare resources are missing.

## Required checks
- Required KV, D1, R2, queue, and service binding names are defined.
- Environment separation exists for staging and production.
- DNS and routed host expectations are documented for downstream repos.
- CI fails when required Cloudflare dependencies are absent.

## Intended use
This repo serves as the shared reference for static-first apex routing plus explicit worker ownership on subdomains.
