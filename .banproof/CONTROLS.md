# BANPROOF COPILOT CONTROLS — Block 1.5

## TOOL_EXPANSION

### 1. Pol-Quant (Political Quantification)
- **Module**: `packages/engine-durable/src/pol-quant.ts`
- **Env**: Reference `HF_API_TOKEN` for sentiment scoring on political text blocks.
- **Model**: `ProsusAI/finbert` via Hugging Face Inference API.
- **Threshold**: `POLICY_SHIFT_THRESHOLD = 65` — triggers a Policy Shift Alert.
- **Sectors**: `defense | tech | energy | healthcare | finance`
- **Output**: `{ volatilityScore: number, policyShiftAlert: boolean, signal: MarketSignal }`

### 2. Risk-Radar (Multi-Asset Risk Calculation)
- **Module**: `packages/engine-durable/src/risk-radar.ts`
- **Data source**: Reference the `market_signals` table in `packages/db` and account position data from the API to pull user activity history and calculate cumulative exposure.
- **Key metrics**:
  - `totalExposure` — total mark-to-market value at risk across Sports, TCG, and Equities
  - `liquidityScore` — 0-100 score for how quickly inventory converts to cash
  - `externalThreatLevel` — composite of market volatility + Pol-Quant political score
- **Risk levels**: `LOW | ELEVATED | HIGH | CRITICAL` (via `classifyRiskLevel()`)

### 3. Visualization (Banproof Dashboard — `apps/banproof-me`)
- **Radar**: `src/components/radar/RiskRadar.tsx`
  - SVG polar-coordinate radar plot with 5 axes (Equities, Sports, TCG, Liquidity Risk, External Threat)
  - Rotating sweep line animated with `requestAnimationFrame` (GSAP-ready: swap RAF for GSAP `gsap.to` on the `sweepRef` line element)
  - "Blinking Cursor" terminal feed below the radar displaying live `RISK_LEVEL`
  - `RISK_LEVEL` header rendered in **Syne** font weight 700
- **Quant Heatmap**: `src/components/quant/SentimentHeatmap.tsx`
  - Framer Motion tile grid; tiles with `alert: true` pulse via keyframe animation
  - Score-driven colour scale: green → lime → yellow → orange → red
  - Sector labels rendered in **Syne** font, scores in IBM Plex Mono
- **Fonts**: Load `Syne` (weights 400/700/800) and `IBM Plex Mono` from Google Fonts in `index.html`

## DATA SCHEMA

### `market_signals` table (PostgreSQL via Drizzle ORM)
| Column        | Type                        | Notes                            |
|---------------|-----------------------------|----------------------------------|
| `id`          | `text` PRIMARY KEY          | Prefixed `ms_` recommended       |
| `signal_type` | `enum(political, risk)`     | Discriminator for query routing  |
| `score`       | `real`                      | 0-100 normalised score           |
| `metadata`    | `jsonb`                     | Sector, source, raw HF fields    |
| `created_at`  | `timestamp` DEFAULT `now()` | Auto-set on insert               |

Migration: `packages/db/drizzle/0001_market_signals.sql`

## INTEGRATION NOTES
- Both engine modules are pure TypeScript with no Cloudflare runtime dependency — they
  can be called from Cloudflare Workers by importing `@goldshore/engine-durable`.
- When wiring into Cloudflare Workflows, wrap `scorePolQuant` inside a Workflow step
  so retries and durable state are handled automatically.
- The `HF_API_TOKEN` secret should be stored as a Cloudflare Workers secret and bound
  to the worker environment — never hard-coded.
