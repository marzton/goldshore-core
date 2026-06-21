/**
 * risk-radar.ts — Multi-Asset Risk Radar Engine
 *
 * Aggregates position data from the Goldshore accounts API and political
 * volatility scores from the Pol-Quant module to build a 360-degree risk
 * snapshot for a given account.
 *
 * Key metrics produced:
 *   - totalExposure         – Total mark-to-market value at risk
 *   - exposureByClass       – Breakdown across sports / TCG / equities
 *   - liquidityScore (0-100) – Speed at which inventory can be converted to cash
 *   - externalThreatLevel (0-100) – Market volatility + political instability
 */

import { RiskRadarSnapshot, RiskAssetClass } from '@goldshore/types';

export interface AssetEntry {
  assetClass: RiskAssetClass;
  /** Current mark-to-market value in USD */
  marketValue: number;
  /** Days typically needed to liquidate this asset (0 = instant) */
  liquidationDays: number;
}

export interface RiskRadarInput {
  accountId: string;
  assets: AssetEntry[];
  /** Latest political volatility score (0-100) from pol-quant */
  politicalScore?: number;
  /** Current market volatility index value (e.g. VIX), normalised 0-100 */
  marketVolatility?: number;
}

/**
 * Liquidity weight: assets that take longer to sell contribute less
 * to the liquidity score.  Uses a simple exponential decay.
 */
function liquidityWeight(liquidationDays: number): number {
  return Math.exp(-liquidationDays / 30);
}

/**
 * Calculates a composite liquidity score (0-100) for the supplied asset
 * list.  A score of 100 means all holdings can be sold instantly.
 */
function calcLiquidityScore(assets: AssetEntry[]): number {
  const totalValue = assets.reduce((sum, a) => sum + a.marketValue, 0);
  if (totalValue === 0) return 100;

  const weightedSum = assets.reduce(
    (sum, a) => sum + a.marketValue * liquidityWeight(a.liquidationDays),
    0,
  );
  return Math.round((weightedSum / totalValue) * 100);
}

/**
 * Produces a composite External Threat Level (0-100) by blending market
 * volatility and political instability.
 */
function calcExternalThreatLevel(
  marketVolatility = 0,
  politicalScore = 0,
): number {
  const blended = marketVolatility * 0.5 + politicalScore * 0.5;
  return Math.min(100, Math.round(blended));
}

/**
 * Builds a RiskRadarSnapshot for a given account and asset list.
 *
 * @param input           Position and signal data
 * @param idGenerator     Optional ID generator (defaults to Date.now hex)
 */
export function buildRiskRadarSnapshot(
  input: RiskRadarInput,
  idGenerator: () => string = () => `rr_${Date.now().toString(16)}`,
): RiskRadarSnapshot {
  const { accountId, assets, politicalScore, marketVolatility } = input;

  const totalExposure = assets.reduce((sum, a) => sum + a.marketValue, 0);

  const exposureByClass = assets.reduce<Record<RiskAssetClass, number>>(
    (acc, a) => {
      acc[a.assetClass] = (acc[a.assetClass] ?? 0) + a.marketValue;
      return acc;
    },
    { sports: 0, tcg: 0, equities: 0 },
  );

  const liquidityScore = calcLiquidityScore(assets);
  const externalThreatLevel = calcExternalThreatLevel(marketVolatility, politicalScore);

  return {
    id: idGenerator(),
    accountId,
    timestamp: new Date().toISOString(),
    totalExposure,
    exposureByClass,
    liquidityScore,
    externalThreatLevel,
  };
}

/**
 * Classifies the overall risk posture based on a snapshot.
 *
 * Returns a human-readable risk label suitable for a dashboard header.
 */
export function classifyRiskLevel(
  snapshot: RiskRadarSnapshot,
): 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' {
  const composite =
    snapshot.externalThreatLevel * 0.6 + (100 - snapshot.liquidityScore) * 0.4;
  if (composite < 25) return 'LOW';
  if (composite < 50) return 'ELEVATED';
  if (composite < 75) return 'HIGH';
  return 'CRITICAL';
}
