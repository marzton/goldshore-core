export interface Account {
  id: string;
  broker: 'tos' | 'fidelity' | 'robinhood';
  brokerAccountId: string;
  name: string;
  accountType: 'IND' | 'IRA' | 'ROTH_IRA' | 'CASH' | 'MARGIN';
  baseCurrency: 'USD';
  marginEnabled: boolean;
  optionsLevel: number | null;
  closeOnly: boolean;
  pdtTracked: boolean;
  iraRestricted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceSnapshot {
  id: string;
  accountId: string;
  timestamp: string;
  netLiq: number;
  cash: number;
  settledCash: number | null;
  buyingPower: number | null;
  optionBuyingPower: number | null;
  maintenanceExcess: number | null;
  marginUsed: number | null;
}

export interface Instrument {
  id: string;
  symbol: string;
  assetType: 'equity' | 'option' | 'etf';
  underlyingSymbol: string | null;
  optionType: 'call' | 'put' | null;
  strike: number | null;
  expiry: string | null;
  multiplier: number | null;
}

export interface PositionSnapshot {
  id: string;
  accountId: string;
  instrumentId: string;
  timestamp: string;
  quantity: number;
  avgOpenPrice: number;
  markPrice: number | null;
  marketValue: number | null;
  unrealizedPnL: number | null;
  realizedPnL: number | null;
  dayPnL: number | null;
  costBasis: number | null;
}

export interface OptionSnapshot {
  id: string;
  instrumentId: string;
  timestamp: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  last: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  openInterest: number | null;
  volume: number | null;
}

export interface Order {
  id: string;
  accountId: string;
  brokerOrderId: string | null;
  status: 'new' | 'queued' | 'partial' | 'filled' | 'cancelled' | 'rejected';
  symbol: string;
  side: 'buy' | 'sell';
  effect: 'open' | 'close';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  tif: 'day' | 'gtc';
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  submittedAt: string | null;
  filledAt: string | null;
}

export interface Fill {
  id: string;
  orderId: string;
  accountId: string;
  timestamp: string;
  quantity: number;
  price: number;
  fees: number | null;
}

export interface TaxLot {
  id: string;
  accountId: string;
  instrumentId: string;
  openedAt: string;
  quantityOpen: number;
  quantityRemaining: number;
  price: number;
}

export interface AccountRestriction {
  id: string;
  accountId: string;
  timestamp: string;
  closeOnly: boolean;
  noNakedOptions: boolean;
  noMarginExpansion: boolean;
  settledCashOnly: boolean;
  pdtRemainingTrades: number | null;
  notes: string | null;
}

export interface ResearchDocument {
  id: string;
  symbol: string;
  source: string;
  title: string;
  publishedAt: string | null;
  rating: string | null;
  targetPrice: number | null;
  summary: string | null;
  fileUrl: string | null;
}

export interface Signal {
  id: string;
  symbol: string;
  strategy: string;
  timeframe: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  thesis: string;
  invalidation: string;
  createdAt: string;
}

export interface ExecutionPlan {
  id: string;
  signalId: string | null;
  accountId: string;
  action: 'buy_stock' | 'sell_stock' | 'sell_call' | 'sell_put' | 'close_position';
  allowed: boolean;
  blockedReason: string | null;
  proposedQuantity: number;
  limitPrice: number | null;
  notes: string | null;
}

export type MarketSignalType = 'political' | 'risk';

export interface MarketSignal {
  id: string;
  signalType: MarketSignalType;
  /** Volatility or risk score in the range 0–100 */
  score: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type RiskAssetClass = 'sports' | 'tcg' | 'equities';

export interface RiskRadarSnapshot {
  id: string;
  accountId: string;
  timestamp: string;
  /** Total mark-to-market value at risk across all asset classes */
  totalExposure: number;
  /** Exposure broken out per asset class */
  exposureByClass: Record<RiskAssetClass, number>;
  /** 0–100 score: how quickly holdings can be converted to cash */
  liquidityScore: number;
  /** 0–100 composite threat level from market volatility + political instability */
  externalThreatLevel: number;
}
