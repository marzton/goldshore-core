import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { Account, BalanceSnapshot, PositionSnapshot } from '@goldshore/types'

const app = new Hono()

app.get('/', (c) => c.text('Goldshore API MVP'))

// MVP Routes with mock data

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
  }
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
  netLiq: 54000.50,
  cash: 5000.00,
  settledCash: 5000.00,
  buyingPower: 100000.00,
  optionBuyingPower: 50000.00,
  maintenanceExcess: 25000.00,
  marginUsed: 0
}

app.get('/accounts/:id/balances/latest', (c) => {
  const id = c.req.param('id')
  const balance: BalanceSnapshot = {
    ...MOCK_BALANCE,
    accountId: id,
    timestamp: new Date().toISOString(),
  }
  return c.json({ balance })
})

const MOCK_POSITIONS: Omit<PositionSnapshot, 'accountId' | 'timestamp'>[] = [
  {
    id: 'pos_123',
    instrumentId: 'inst_AAPL',
    quantity: 100,
    avgOpenPrice: 150.00,
    markPrice: 155.00,
    marketValue: 15500.00,
    unrealizedPnL: 500.00,
    realizedPnL: 0,
    dayPnL: 100.00,
    costBasis: 15000.00
  }
]

app.get('/accounts/:id/positions', (c) => {
  const id = c.req.param('id')
  const timestamp = new Date().toISOString()
  const positions: PositionSnapshot[] = MOCK_POSITIONS.map(p => ({
    ...p,
    accountId: id,
    timestamp
  }))
  return c.json({ positions })
})

const MOCK_PORTFOLIO_OVERVIEW = {
  totalNetLiq: 54000.50,
  totalBuyingPower: 100000.00,
  totalDayPnL: 100.00
}

app.get('/portfolio/overview', (c) => {
  return c.json(MOCK_PORTFOLIO_OVERVIEW)
})

const port = process.env.PORT ? Number(process.env.PORT) : 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
