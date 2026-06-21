# Edge → Core Telemetry Standard

This document defines the canonical telemetry envelope for all edge-to-core traffic.

## Standard Envelope

All edge adapters and core API request logs must emit the following fields:

- `trace_id`
- `request_id`
- `route`
- `tenant`
- `auth_subject`
- `latency_ms`
- `status_code`
- `error_code`

## Header Contract (Edge → Core)

Edge adapters send the envelope context with these headers:

- `x-gs-trace-id`
- `x-gs-request-id`
- `x-gs-route`
- `x-gs-tenant`
- `x-gs-auth-subject`

Core responds with:

- `x-gs-trace-id`
- `x-gs-request-id`
- `x-gs-error-code` (optional, defaults to `NONE`)

## Operational Queries / Dashboards

Use these queries (or equivalent in your log platform) for endpoint-group rollout decisions.

### 1) Parity (legacy vs core)

```sql
WITH grouped AS (
  SELECT
    endpoint_group,
    SUM(CASE WHEN target = 'legacy' THEN requests ELSE 0 END) AS legacy_requests,
    SUM(CASE WHEN target = 'core' THEN requests ELSE 0 END) AS core_requests,
    SUM(CASE WHEN target = 'legacy' THEN successes ELSE 0 END) AS legacy_successes,
    SUM(CASE WHEN target = 'core' THEN successes ELSE 0 END) AS core_successes
  FROM edge_compare_rollup_5m
  WHERE ts >= NOW() - INTERVAL '24 hours'
  GROUP BY 1
)
SELECT
  endpoint_group,
  ABS((core_successes::float / NULLIF(core_requests, 0)) - (legacy_successes::float / NULLIF(legacy_requests, 0))) * 100 AS parity_mismatch_pct
FROM grouped;
```

### 2) Error-rate delta (core - legacy)

```sql
SELECT
  endpoint_group,
  (
    SUM(CASE WHEN target = 'core' THEN errors ELSE 0 END)::float /
    NULLIF(SUM(CASE WHEN target = 'core' THEN requests ELSE 0 END), 0)
  ) * 100
  -
  (
    SUM(CASE WHEN target = 'legacy' THEN errors ELSE 0 END)::float /
    NULLIF(SUM(CASE WHEN target = 'legacy' THEN requests ELSE 0 END), 0)
  ) * 100 AS error_rate_delta_pct
FROM edge_compare_rollup_5m
WHERE ts >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint_group;
```

### 3) p95 latency delta (core - legacy)

```sql
SELECT
  endpoint_group,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY CASE WHEN target = 'core' THEN latency_ms END)
  - percentile_cont(0.95) WITHIN GROUP (ORDER BY CASE WHEN target = 'legacy' THEN latency_ms END)
  AS p95_latency_delta_ms
FROM request_telemetry
WHERE ts >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint_group;
```

### 4) Write success rate

```sql
SELECT
  endpoint_group,
  SUM(CASE WHEN is_write = true AND status_code BETWEEN 200 AND 299 THEN 1 ELSE 0 END)::float
  / NULLIF(SUM(CASE WHEN is_write = true THEN 1 ELSE 0 END), 0) * 100 AS write_success_rate_pct
FROM request_telemetry
WHERE ts >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint_group;
```
