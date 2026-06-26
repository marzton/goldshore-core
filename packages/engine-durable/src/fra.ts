/**
 * fra.ts — Financial Risk Assessment (FRA)
 *
 * Evaluates five dimensions of financial uncertainty across a position set:
 *   - interest_rate  – Duration-weighted sensitivity to rate movements
 *   - credit         – Counterparty and issuer default probability
 *   - currency       – Foreign-exchange exposure on non-USD positions
 *   - liquidity      – Bid-ask spread and market-depth risk
 *   - concentration  – Sector / single-name concentration (HHI-based)
 *
 * Produces a composite FRAResult with per-dimension scores (0–100) and an
 * overall classification suitable for ingestion by the Risk Radar engine.
 */

import { FRADimension, FRADimensionScore, FRAResult } from '@goldshore/types';

export type InstrumentType = 'equity' | 'option' | 'etf' | 'bond' | 'cash';

export interface FRAPositionInput {
  symbol: string;
  instrumentType: InstrumentType;
  /** Current mark-to-market value in USD */
  marketValue: number;
  sector?: string;
  /** Modified duration in years — meaningful for bonds; omit for equities */
  durationYears?: number;
  /** S&P-style credit rating, e.g. 'AAA', 'BB+', 'CCC' */
  creditRating?: string;
  /** ISO 4217 currency code; absent or 'USD' means no FX exposure */
  currencyIso?: string;
  /** Bid-ask spread expressed as a percentage of mid-price */
  bidAskSpreadPct?: number;
}

export interface FRAInput {
  accountId: string;
  positions: FRAPositionInput[];
}

const CREDIT_RISK_MAP: Record<string, number> = {
  AAA: 2, 'AA+': 4, AA: 5, 'AA-': 6,
  'A+': 10, A: 12, 'A-': 14,
  'BBB+': 20, BBB: 25, 'BBB-': 30,
  'BB+': 40, BB: 48, 'BB-': 55,
  'B+': 62, B: 70, 'B-': 78,
  'CCC+': 85, CCC: 90, 'CCC-': 95,
  CC: 97, C: 99, D: 100,
};

function creditRisk(rating?: string): number {
  if (!rating) return 20;
  return CREDIT_RISK_MAP[rating.toUpperCase()] ?? 20;
}

function defaultSpread(type: InstrumentType): number {
  switch (type) {
    case 'equity': return 0.05;
    case 'etf':    return 0.02;
    case 'option': return 1.5;
    case 'bond':   return 0.5;
    case 'cash':   return 0;
  }
}

function emptyDimension(dimension: FRADimension): FRADimensionScore {
  return { dimension, score: 0, rationale: 'No positions.', contributingFactors: {} };
}

function interestRateDimension(positions: FRAPositionInput[]): FRADimensionScore {
  const total = positions.reduce((s, p) => s + p.marketValue, 0);
  if (total === 0) return emptyDimension('interest_rate');

  const weightedDuration = positions.reduce((sum, p) => {
    const dur = p.durationYears ?? (p.instrumentType === 'bond' ? 5 : 0);
    return sum + (p.marketValue / total) * dur;
  }, 0);

  // A 10-year weighted duration maps to a score of ~80/100
  const score = Math.min(100, Math.round(weightedDuration * 8));
  const factors: Record<string, number> = {};
  positions.forEach((p) => {
    if ((p.durationYears ?? 0) > 0) factors[p.symbol] = p.durationYears!;
  });

  return {
    dimension: 'interest_rate',
    score,
    rationale: `Weighted portfolio duration is ${weightedDuration.toFixed(2)} years.`,
    contributingFactors: factors,
  };
}

function creditDimension(positions: FRAPositionInput[]): FRADimensionScore {
  const total = positions.reduce((s, p) => s + p.marketValue, 0);
  if (total === 0) return emptyDimension('credit');

  const score = Math.round(
    positions.reduce((sum, p) => sum + (p.marketValue / total) * creditRisk(p.creditRating), 0),
  );
  const factors: Record<string, number> = {};
  positions.forEach((p) => {
    if (p.creditRating) factors[p.symbol] = creditRisk(p.creditRating);
  });

  return {
    dimension: 'credit',
    score,
    rationale: 'Weighted credit risk score based on issuer ratings.',
    contributingFactors: factors,
  };
}

function currencyDimension(positions: FRAPositionInput[]): FRADimensionScore {
  const total = positions.reduce((s, p) => s + p.marketValue, 0);
  if (total === 0) return emptyDimension('currency');

  const fxValue = positions
    .filter((p) => p.currencyIso && p.currencyIso.toUpperCase() !== 'USD')
    .reduce((s, p) => s + p.marketValue, 0);

  const fxPct = fxValue / total;
  // 83%+ non-USD positions saturates at score 100
  const score = Math.min(100, Math.round(fxPct * 120));
  const factors: Record<string, number> = {};
  positions.forEach((p) => {
    if (p.currencyIso && p.currencyIso.toUpperCase() !== 'USD') {
      factors[p.currencyIso] = (factors[p.currencyIso] ?? 0) + p.marketValue;
    }
  });

  return {
    dimension: 'currency',
    score,
    rationale: `${(fxPct * 100).toFixed(1)}% of portfolio is non-USD denominated.`,
    contributingFactors: factors,
  };
}

function liquidityDimension(positions: FRAPositionInput[]): FRADimensionScore {
  const total = positions.reduce((s, p) => s + p.marketValue, 0);
  if (total === 0) return emptyDimension('liquidity');

  const weightedSpread = positions.reduce((sum, p) => {
    const spread = p.bidAskSpreadPct ?? defaultSpread(p.instrumentType);
    return sum + (p.marketValue / total) * spread;
  }, 0);

  // A 5% weighted spread maps to a score of 100
  const score = Math.min(100, Math.round(weightedSpread * 20));
  const factors: Record<string, number> = {};
  positions.forEach((p) => {
    factors[p.symbol] = p.bidAskSpreadPct ?? defaultSpread(p.instrumentType);
  });

  return {
    dimension: 'liquidity',
    score,
    rationale: `Weighted average bid-ask spread is ${weightedSpread.toFixed(2)}%.`,
    contributingFactors: factors,
  };
}

function concentrationDimension(positions: FRAPositionInput[]): FRADimensionScore {
  const total = positions.reduce((s, p) => s + p.marketValue, 0);
  if (total === 0) return emptyDimension('concentration');

  const sectorMap: Record<string, number> = {};
  positions.forEach((p) => {
    const sector = p.sector ?? 'UNKNOWN';
    sectorMap[sector] = (sectorMap[sector] ?? 0) + p.marketValue;
  });

  // Herfindahl-Hirschman Index: 1/n = fully diversified, 1 = fully concentrated
  const hhi = Object.values(sectorMap).reduce((sum, v) => {
    const w = v / total;
    return sum + w * w;
  }, 0);

  const score = Math.min(100, Math.round(hhi * 100));
  const factors: Record<string, number> = {};
  Object.entries(sectorMap).forEach(([sector, val]) => {
    factors[sector] = Math.round((val / total) * 100);
  });

  return {
    dimension: 'concentration',
    score,
    rationale: `Sector HHI is ${hhi.toFixed(3)}.`,
    contributingFactors: factors,
  };
}

const DIMENSION_WEIGHTS: Record<FRADimension, number> = {
  interest_rate: 0.25,
  credit:        0.25,
  currency:      0.15,
  liquidity:     0.20,
  concentration: 0.15,
};

function classify(score: number): FRAResult['classification'] {
  if (score < 25) return 'BENIGN';
  if (score < 50) return 'MODERATE';
  if (score < 75) return 'STRESSED';
  return 'ACUTE';
}

/**
 * Runs the full five-dimension Financial Risk Assessment for the supplied
 * account and position set.
 */
export function assessFinancialRisk(input: FRAInput): FRAResult {
  const { accountId, positions } = input;

  const dimensions: FRADimensionScore[] = [
    interestRateDimension(positions),
    creditDimension(positions),
    currencyDimension(positions),
    liquidityDimension(positions),
    concentrationDimension(positions),
  ];

  const compositeScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * DIMENSION_WEIGHTS[d.dimension], 0),
  );

  return {
    accountId,
    timestamp: new Date().toISOString(),
    compositeScore,
    classification: classify(compositeScore),
    dimensions,
  };
}
