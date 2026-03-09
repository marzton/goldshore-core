import { pgTable, text, timestamp, boolean, integer, doublePrecision, pgEnum } from 'drizzle-orm/pg-core';

export const brokerEnum = pgEnum('broker', ['tos', 'fidelity', 'robinhood']);
export const accountTypeEnum = pgEnum('account_type', ['IND', 'IRA', 'ROTH_IRA', 'CASH', 'MARGIN']);
export const orderStatusEnum = pgEnum('order_status', ['new', 'queued', 'partial', 'filled', 'cancelled', 'rejected']);
export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderEffectEnum = pgEnum('order_effect', ['open', 'close']);
export const orderTypeEnum = pgEnum('order_type', ['market', 'limit', 'stop', 'stop_limit']);
export const tifEnum = pgEnum('tif', ['day', 'gtc']);
export const assetTypeEnum = pgEnum('asset_type', ['equity', 'option', 'etf']);
export const optionTypeEnum = pgEnum('option_type', ['call', 'put']);

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  broker: brokerEnum('broker').notNull(),
  brokerAccountId: text('broker_account_id').notNull(),
  name: text('name').notNull(),
  accountType: accountTypeEnum('account_type').notNull(),
  baseCurrency: text('base_currency').notNull().default('USD'),
  marginEnabled: boolean('margin_enabled').notNull(),
  optionsLevel: integer('options_level'),
  closeOnly: boolean('close_only').notNull(),
  pdtTracked: boolean('pdt_tracked').notNull(),
  iraRestricted: boolean('ira_restricted').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const instruments = pgTable('instruments', {
  id: text('id').primaryKey(),
  symbol: text('symbol').notNull(),
  assetType: assetTypeEnum('asset_type').notNull(),
  underlyingSymbol: text('underlying_symbol'),
  optionType: optionTypeEnum('option_type'),
  strike: doublePrecision('strike'),
  expiry: timestamp('expiry'),
  multiplier: integer('multiplier'),
});

export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  instrumentId: text('instrument_id').notNull().references(() => instruments.id),
  timestamp: timestamp('timestamp').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  avgOpenPrice: doublePrecision('avg_open_price').notNull(),
  markPrice: doublePrecision('mark_price'),
  marketValue: doublePrecision('market_value'),
  unrealizedPnL: doublePrecision('unrealized_pnl'),
  realizedPnL: doublePrecision('realized_pnl'),
  dayPnL: doublePrecision('day_pnl'),
  costBasis: doublePrecision('cost_basis'),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  brokerOrderId: text('broker_order_id'),
  status: orderStatusEnum('status').notNull(),
  symbol: text('symbol').notNull(),
  side: orderSideEnum('side').notNull(),
  effect: orderEffectEnum('effect').notNull(),
  orderType: orderTypeEnum('order_type').notNull(),
  tif: tifEnum('tif').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  limitPrice: doublePrecision('limit_price'),
  stopPrice: doublePrecision('stop_price'),
  submittedAt: timestamp('submitted_at'),
  filledAt: timestamp('filled_at'),
});
