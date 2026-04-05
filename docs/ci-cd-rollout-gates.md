# CI/CD Rollout Gates for Edge → Core Promotion

Before promoting each endpoint group from legacy to core, all of the following must hold for the immediately preceding 24-hour window:

1. **Parity mismatch** `< 0.5%`
2. **Error-rate delta (core - legacy)** `< 0.2%`
3. **p95 latency increase** `< 20%`
4. **Write success rate** must be stable and non-regressive vs. baseline

## Suggested Pipeline Gate (Pseudo-config)

```yaml
rollout_gates:
  window: 24h
  endpoint_group: ${ENDPOINT_GROUP}
  checks:
    - metric: parity_mismatch_pct
      op: <
      value: 0.5
    - metric: error_rate_delta_pct
      op: <
      value: 0.2
    - metric: p95_latency_increase_pct
      op: <
      value: 20
    - metric: write_success_rate_delta_pct
      op: <=
      value: 0
  on_fail:
    action: halt_promotion
    notify: [slack:#goldshore-core-rollout, pagerduty:core-oncall]
```

## Promotion Policy

- Promote endpoint groups incrementally (smallest blast-radius first).
- Any gate breach blocks promotion and triggers rollback to legacy routing for the affected group.
- A promotion can only resume after one full clean 24-hour window.
