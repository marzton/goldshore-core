import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { Account, BalanceSnapshot, PositionSnapshot } from '@goldshore/types'

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

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
console.log(`Server is running on port ${port}`)

if (process.env.NODE_ENV !== 'test') {
  console.log(`Server is running on port ${port}`)
  serve({
    fetch: app.fetch,
    port
  })
}
