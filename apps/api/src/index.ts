import { randomUUID } from 'crypto'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import {
  Account,
  BalanceSnapshot,
  DEFAULT_TELEMETRY_ERROR_CODE,
  PositionSnapshot,
  TELEMETRY_HEADER_MAP,
  TelemetryEnvelope,
} from '@goldshore/types'

export const app = new Hono()

app.use('*', async (c, next) => {
  const startedAt = performance.now()

  const traceId = c.req.header(TELEMETRY_HEADER_MAP.trace_id) ?? randomUUID()
  const requestId = c.req.header(TELEMETRY_HEADER_MAP.request_id) ?? randomUUID()
  const tenant = c.req.header(TELEMETRY_HEADER_MAP.tenant) ?? 'unknown'
  const authSubject = c.req.header(TELEMETRY_HEADER_MAP.auth_subject) ?? 'anonymous'
  const route = c.req.header(TELEMETRY_HEADER_MAP.route) ?? c.req.path

  try {
    await next()
  } catch (error) {
    c.status(500)
    const envelope: TelemetryEnvelope = {
      trace_id: traceId,
      request_id: requestId,
      route,
      tenant,
      auth_subject: authSubject,
      latency_ms: Math.round(performance.now() - startedAt),
      status_code: 500,
      error_code: 'UNHANDLED_EXCEPTION',
    }
    console.error(JSON.stringify({ event: 'core_request_telemetry', envelope, error }))
    throw error
  }

  const statusCode = c.res.status
  const envelope: TelemetryEnvelope = {
    trace_id: traceId,
    request_id: requestId,
    route,
    tenant,
    auth_subject: authSubject,
    latency_ms: Math.round(performance.now() - startedAt),
    status_code: statusCode,
    error_code: c.res.headers.get(TELEMETRY_HEADER_MAP.error_code) ?? DEFAULT_TELEMETRY_ERROR_CODE,
  }

  c.res.headers.set(TELEMETRY_HEADER_MAP.trace_id, traceId)
  c.res.headers.set(TELEMETRY_HEADER_MAP.request_id, requestId)

  console.info(JSON.stringify({ event: 'core_request_telemetry', envelope }))
})

const MOCK_ACCOUNTS: Omit<Account, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'acc_123',
    broker: 'tos',
    brokerAccountId: 'TOS88192',
    name: 'Primary Margin',
    accountType: 'MARGIN',
    baseCurrency: 'USD',
    marginEnabled: true,
    optionsLevel: 3,
    closeOnly: false,
    pdtTracked: true,
    iraRestricted: false,
  },
]

app.get('/accounts', (c) => {
  const now = new Date().toISOString()
  const accounts = MOCK_ACCOUNTS.map(acc => ({
    ...acc,
    createdAt: now,
    updatedAt: now
  }))
  return c.json({ accounts })
})

const MOCK_BALANCE: Omit<BalanceSnapshot, 'accountId' | 'timestamp'> = {
  id: 'bal_123',
  netLiq: 54000.5,
  cash: 5000.0,
  settledCash: 5000.0,
  buyingPower: 100000.0,
  optionBuyingPower: 50000.0,
  maintenanceExcess: 25000.0,
  marginUsed: 0,
}

app.get('/accounts/:id/balances/latest', (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()
  return c.json({
    balance: {
      ...MOCK_BALANCE,
      accountId: id,
      timestamp: now
    }
  })
})

const MOCK_POSITIONS: Omit<PositionSnapshot, 'accountId' | 'timestamp'>[] = [
  {
    id: 'pos_123',
    instrumentId: 'inst_AAPL',
    quantity: 100,
    avgOpenPrice: 150.0,
    markPrice: 155.0,
    marketValue: 15500.0,
    unrealizedPnL: 500.0,
    realizedPnL: 0,
    dayPnL: 100.0,
    costBasis: 15000.0,
  },
]

app.get('/accounts/:id/positions', (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()
  const positions = MOCK_POSITIONS.map(p => ({
    ...p,
    accountId: id,
    timestamp: now
  }))
  return c.json({ positions })
  const escapedId = ID_REGEX.test(id) ? id : escapeJson(id);
  const positions = PRE_SERIALIZED_POSITIONS.map(p => p + escapedId + '","timestamp":"' + now + '"} ');
  const res = '{"positions":[' + positions.join(',') + ']}';
  return c.body(res, 200, {
    'Content-Type': 'application/json'
  })
})

app.get('/accounts/:id/positions', (c) => {
  const now = new Date().toISOString()
  const positions: PositionSnapshot[] = MOCK_POSITIONS.map((position) => ({
    ...position,
    accountId: c.req.param('id'),
    timestamp: now,
  }))
  return c.json({ positions })
})

app.get('/portfolio/overview', (c) => {
  return c.json({
    totalNetLiq: 54000.5,
    totalBuyingPower: 100000.0,
    totalDayPnL: 100.0,
  })
})

const port = process.env.PORT ? Number(process.env.PORT) : 3000

if (process.env.NODE_ENV !== 'test') {
  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port,
  })
}

export { app }
