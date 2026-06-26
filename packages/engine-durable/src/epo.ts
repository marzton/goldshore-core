/**
 * epo.ts — Economic Psychological Oscillator (EPO)
 *
 * Blends macro-climate signals (Oceanic Niño Index / El Niño phase) with
 * financial-market sentiment and behavioural economic indicators to produce
 * a composite oscillator reading in the range −100 to +100.
 *
 * A positive oscillator value indicates constructive climate-economic coupling;
 * a negative value signals stress or divergence between climate and economic cycles.
 *
 * Signal sources consumed:
 *   - ONI (Oceanic Niño Index) — NOAA CPC SST anomaly; El Niño / La Niña phase detection
 *   - Normalised VIX            — Market fear / complacency (0–100, higher = more fear)
 *   - Commodity pressure index  — Food and energy price pressure (0–100)
 *   - Consumer confidence index — Behavioural demand proxy (0–100)
 *   - Optional FinBERT text     — Economic narrative sentiment via HF Inference API
 *                                 (reuses the same ProsusAI/finbert model as pol-quant)
 */

import { ClimatePhase, EPOComponents, EPOReading } from '@goldshore/types';

export interface ONIReading {
  /** Three-month rolling period identifier, e.g. 'DJF', 'JFM' */
  period: string;
  /** Sea-surface temperature anomaly in °C; ≥+0.5 = El Niño, ≤−0.5 = La Niña */
  sst: number;
}

export interface EPOInput {
  oni: ONIReading;
  /** Normalised VIX value 0–100 (0 = calm, 100 = extreme fear) */
  normalizedVix?: number;
  /** Commodity price pressure index 0–100 (higher = more upward price pressure) */
  commodityPressureIndex?: number;
  /** Consumer confidence index 0–100 (higher = more confident) */
  consumerConfidenceIndex?: number;
  /**
   * Optional economic narrative text scored by FinBERT for additional sentiment
   * colour.  Requires hfToken to be provided.
   */
  economicSentimentText?: string;
  hfToken?: string;
}

function detectClimatePhase(sst: number): ClimatePhase {
  if (sst >= 0.5)  return 'el_nino';
  if (sst <= -0.5) return 'la_nina';
  return 'neutral';
}

/**
 * Converts an ONI SST anomaly to a climate signal in the range −100 to +100.
 * Uses a ±5°C scale so extreme ONI readings saturate the signal.
 */
function climateSignalFromONI(sst: number): number {
  return Math.max(-100, Math.min(100, Math.round(sst * 20)));
}

/**
 * Inverts a normalised VIX (0–100) into a centred sentiment signal:
 * 0 VIX → +100, 50 VIX → 0, 100 VIX → −100.
 */
function marketSentimentFromVix(normalizedVix: number): number {
  return Math.round((50 - normalizedVix) * 2);
}

/**
 * Converts commodity pressure (0–100, higher = more upward pressure) to a
 * purchasing-power signal.  High commodity pressure suppresses economic
 * confidence and produces a negative EPO contribution.
 */
function commoditySignal(index: number): number {
  return Math.round((50 - index) * 2);
}

/**
 * Converts consumer confidence (0–100) to a centred psychological signal:
 * 50 → 0, 100 → +100, 0 → −100.
 */
function consumerPsychologySignal(index: number): number {
  return Math.round((index - 50) * 2);
}

const LABEL_SENTIMENT: Record<string, number> = {
  POSITIVE: 100,
  NEUTRAL:  0,
  NEGATIVE: -100,
};

async function fetchEconomicSentiment(text: string, hfToken: string): Promise<number> {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/ProsusAI/finbert',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    },
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
  }

  const results = (await response.json()) as Array<Array<{ label: string; score: number }>>;
  const top = results[0]?.sort((a, b) => b.score - a.score)[0];
  if (!top) throw new Error('Unexpected empty response from HuggingFace');

  const direction = LABEL_SENTIMENT[top.label.toUpperCase()] ?? 0;
  return Math.round(direction * top.score);
}

const WEIGHTS = {
  climateSignal:      0.30,
  marketSentiment:    0.25,
  commodityPressure:  0.20,
  consumerPsychology: 0.15,
  economicSentiment:  0.10,
} as const;

function calcAlignment(
  climateSignal: number,
  economicBias: number,
): EPOReading['signalAlignment'] {
  const bothWeak = Math.abs(climateSignal) < 20 && Math.abs(economicBias) < 20;
  if (bothWeak) return 'neutral';
  return Math.sign(climateSignal) === Math.sign(economicBias) ? 'reinforcing' : 'divergent';
}

function buildInterpretation(
  oscillatorValue: number,
  climatePhase: ClimatePhase,
  alignment: EPOReading['signalAlignment'],
): string {
  const phaseLabel =
    climatePhase === 'el_nino' ? 'El Niño' :
    climatePhase === 'la_nina' ? 'La Niña' :
    'neutral climate';

  const polarityLabel =
    oscillatorValue > 20  ? 'constructive' :
    oscillatorValue < -20 ? 'stressed'     :
    'mixed';

  const sign = oscillatorValue > 0 ? '+' : '';
  return (
    `${phaseLabel} conditions with ${alignment} signal alignment; ` +
    `macro-economic-climate coupling is ${polarityLabel} (EPO ${sign}${oscillatorValue}).`
  );
}

/**
 * Computes an EPO reading, optionally enriching it with FinBERT economic
 * sentiment when economicSentimentText and hfToken are supplied.
 */
export async function computeEPO(input: EPOInput): Promise<EPOReading> {
  const {
    oni,
    normalizedVix         = 50,
    commodityPressureIndex = 50,
    consumerConfidenceIndex = 50,
    economicSentimentText,
    hfToken,
  } = input;

  const climateSignal      = climateSignalFromONI(oni.sst);
  const marketSentiment    = marketSentimentFromVix(normalizedVix);
  const commodityPressure  = commoditySignal(commodityPressureIndex);
  const consumerPsychology = consumerPsychologySignal(consumerConfidenceIndex);

  let economicSentiment: number | undefined;
  if (economicSentimentText && hfToken) {
    economicSentiment = await fetchEconomicSentiment(economicSentimentText, hfToken);
  }

  const components: EPOComponents = {
    climateSignal,
    marketSentiment,
    commodityPressure,
    consumerPsychology,
    ...(economicSentiment !== undefined ? { economicSentiment } : {}),
  };

  const hasTextSentiment = economicSentiment !== undefined;
  const totalWeight = hasTextSentiment ? 1.0 : 0.90;
  const rawOscillator =
    climateSignal      * WEIGHTS.climateSignal +
    marketSentiment    * WEIGHTS.marketSentiment +
    commodityPressure  * WEIGHTS.commodityPressure +
    consumerPsychology * WEIGHTS.consumerPsychology +
    (hasTextSentiment ? economicSentiment! * WEIGHTS.economicSentiment : 0);

  const oscillatorValue = Math.round(rawOscillator / totalWeight);

  const climatePhase   = detectClimatePhase(oni.sst);
  const economicBias   = Math.round((marketSentiment + commodityPressure + consumerPsychology) / 3);
  const signalAlignment = calcAlignment(climateSignal, economicBias);

  return {
    timestamp: new Date().toISOString(),
    oscillatorValue,
    climatePhase,
    components,
    signalAlignment,
    interpretation: buildInterpretation(oscillatorValue, climatePhase, signalAlignment),
  };
}

/**
 * Synchronous EPO variant for environments where a network call is not
 * available.  Does not accept economic sentiment text; all four data
 * inputs must be provided inline.
 */
export function computeEPOSync(
  input: Omit<EPOInput, 'economicSentimentText' | 'hfToken'>,
): EPOReading {
  const {
    oni,
    normalizedVix          = 50,
    commodityPressureIndex  = 50,
    consumerConfidenceIndex = 50,
  } = input;

  const climateSignal      = climateSignalFromONI(oni.sst);
  const marketSentiment    = marketSentimentFromVix(normalizedVix);
  const commodityPressure  = commoditySignal(commodityPressureIndex);
  const consumerPsychology = consumerPsychologySignal(consumerConfidenceIndex);

  const components: EPOComponents = { climateSignal, marketSentiment, commodityPressure, consumerPsychology };

  const rawOscillator =
    climateSignal      * WEIGHTS.climateSignal +
    marketSentiment    * WEIGHTS.marketSentiment +
    commodityPressure  * WEIGHTS.commodityPressure +
    consumerPsychology * WEIGHTS.consumerPsychology;

  const oscillatorValue  = Math.round(rawOscillator / 0.90);
  const climatePhase     = detectClimatePhase(oni.sst);
  const economicBias     = Math.round((marketSentiment + commodityPressure + consumerPsychology) / 3);
  const signalAlignment  = calcAlignment(climateSignal, economicBias);

  return {
    timestamp: new Date().toISOString(),
    oscillatorValue,
    climatePhase,
    components,
    signalAlignment,
    interpretation: buildInterpretation(oscillatorValue, climatePhase, signalAlignment),
  };
}
