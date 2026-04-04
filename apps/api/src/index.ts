import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { Account, BalanceSnapshot, PositionSnapshot } from '@goldshore/types'
import { escapeJson } from './utils.ts'

export { escapeJson }
export const app = new Hono()

app.get('/', (c) => c.text('Goldshore API MVP'))

// MVP Routes with mock data

app.get('/accounts', (c) => {
  const accounts: Account[] = [
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
  return c.json({ accounts })
})

app.get('/accounts/:id/balances/latest', (c) => {
  const id = c.req.param('id')
  const balance: BalanceSnapshot = {
    id: 'bal_123',
    accountId: id,
    timestamp: new Date().toISOString(),
    netLiq: 54000.50,
    cash: 5000.00,
    settledCash: 5000.00,
    buyingPower: 100000.00,
    optionBuyingPower: 50000.00,
    maintenanceExcess: 25000.00,
    marginUsed: 0
  }
  return c.json({ balance })
})

app.get('/accounts/:id/positions', (c) => {
  const id = c.req.param('id')
  const positions: PositionSnapshot[] = [
    {
      id: 'pos_123',
      accountId: id,
      instrumentId: 'inst_AAPL',
      timestamp: new Date().toISOString(),
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
  return c.json({ positions })
})

app.get('/portfolio/overview', (c) => {
  return c.json({
    totalNetLiq: 54000.50,
    totalBuyingPower: 100000.00,
    totalDayPnL: 100.00
  })
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
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
  }
]

const PRE_SERIALIZED_ACCOUNTS = MOCK_ACCOUNTS.map(acc => {
  const s = JSON.stringify(acc);
  return s.slice(0, -1) + `,"createdAt":"`;
});

app.get('/accounts', (c) => {
  const now = new Date().toISOString()
  let res = '{"accounts":[';
  for (let i = 0; i < PRE_SERIALIZED_ACCOUNTS.length; i++) {
    res += PRE_SERIALIZED_ACCOUNTS[i] + now + `","updatedAt":"` + now + `"} `;
    if (i < PRE_SERIALIZED_ACCOUNTS.length - 1) res += ',';
  }
  res += ']}';
  return c.body(res, 200, {
    'Content-Type': 'application/json'
  })
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

const PRE_SERIALIZED_BALANCE = (() => {
  const s = JSON.stringify(MOCK_BALANCE);
  return s.slice(0, -1) + `,"accountId":"`;
})();

export const ID_REGEX = /^acc_[a-zA-Z0-9]+$/

app.get('/accounts/:id/balances/latest', (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()
  const escapedId = ID_REGEX.test(id) ? id : escapeJson(id);
  const res = `{"balance":${PRE_SERIALIZED_BALANCE}${escapedId}","timestamp":"${now}"}}`;
  return c.body(res, 200, {
    'Content-Type': 'application/json'
  })
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

const PRE_SERIALIZED_POSITIONS = MOCK_POSITIONS.map(p => {
  const s = JSON.stringify(p);
  return s.slice(0, -1) + `,"accountId":"`;
});

app.get('/accounts/:id/positions', (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()
  const escapedId = ID_REGEX.test(id) ? id : escapeJson(id);
  const positions = PRE_SERIALIZED_POSITIONS.map(p => p + escapedId + '","timestamp":"' + now + '"} ');
  const res = '{"positions":[' + positions.join(',') + ']}';
  return c.body(res, 200, {
    'Content-Type': 'application/json'
  })
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

if (process.env.NODE_ENV !== 'test') {
  console.log(`Server is running on port ${port}`)

  serve({
    fetch: app.fetch,
    port
  })
}
