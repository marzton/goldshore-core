/**
 * pol-quant.ts — Political Quantification Engine
 *
 * Uses the Hugging Face Inference API to run zero-shot or sentiment
 * classification on political text blocks (legislative filings, social
 * media, polling summaries) and produces a normalised Volatility Score
 * plus a Policy Shift Alert when the score crosses a threshold.
 *
 * Environment variable required: HF_API_TOKEN
 */

import { MarketSignal } from '@goldshore/types';

export const POLICY_SHIFT_THRESHOLD = 65;

export type PoliticalSector = 'defense' | 'tech' | 'energy' | 'healthcare' | 'finance';

export interface PolQuantInput {
  text: string;
  sector: PoliticalSector;
  source?: string;
}

export interface PolQuantResult {
  sector: PoliticalSector;
  /** Normalised Volatility Score 0–100 */
  volatilityScore: number;
  /** True when volatilityScore >= POLICY_SHIFT_THRESHOLD */
  policyShiftAlert: boolean;
  /** Raw HuggingFace classification label */
  rawLabel: string;
  /** Raw HuggingFace confidence score */
  rawConfidence: number;
  signal: Omit<MarketSignal, 'id' | 'createdAt'>;
}

/** Maps HuggingFace sentiment labels to a directional multiplier */
const LABEL_MULTIPLIER: Record<string, number> = {
  POSITIVE: 0.3,
  NEGATIVE: 1.0,
  NEUTRAL: 0.5,
};

/**
 * Calls the HuggingFace text-classification endpoint for the supplied text
 * and converts the result into a Volatility Score.
 *
 * @param input   Text block and sector metadata
 * @param hfToken HuggingFace API token (defaults to HF_API_TOKEN env var)
 */
export async function scorePolQuant(
  input: PolQuantInput,
  hfToken = process.env.HF_API_TOKEN,
): Promise<PolQuantResult> {
  if (!hfToken) {
    throw new Error('HF_API_TOKEN is required for political quantification');
  }

  const response = await fetch(
    'https://api-inference.huggingface.co/models/ProsusAI/finbert',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: input.text }),
    },
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
  }

  const results = (await response.json()) as Array<Array<{ label: string; score: number }>>;
  const top = results[0]?.sort((a, b) => b.score - a.score)[0];

  if (!top) {
    throw new Error('Unexpected empty response from HuggingFace');
  }

  const multiplier = LABEL_MULTIPLIER[top.label.toUpperCase()] ?? 0.5;
  const volatilityScore = Math.min(100, Math.round(top.score * multiplier * 100));
  const policyShiftAlert = volatilityScore >= POLICY_SHIFT_THRESHOLD;

  return {
    sector: input.sector,
    volatilityScore,
    policyShiftAlert,
    rawLabel: top.label,
    rawConfidence: top.score,
    signal: {
      signalType: 'political',
      score: volatilityScore,
      metadata: {
        sector: input.sector,
        source: input.source ?? null,
        policyShiftAlert,
        rawLabel: top.label,
        rawConfidence: top.score,
      },
    },
  };
}

/**
 * Convenience wrapper: scans multiple text blocks and returns only the
 * signals that crossed the Policy Shift threshold.
 */
export async function scanPolicyShifts(
  inputs: PolQuantInput[],
  hfToken?: string,
): Promise<PolQuantResult[]> {
  const results = await Promise.all(inputs.map((i) => scorePolQuant(i, hfToken)));
  return results.filter((r) => r.policyShiftAlert);
}
