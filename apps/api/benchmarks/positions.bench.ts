
import { PositionSnapshot } from '@goldshore/types'

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

function original(id: string) {
  const timestamp = new Date().toISOString()
  const positions: PositionSnapshot[] = MOCK_POSITIONS.map(p => ({
    ...p,
    accountId: id,
    timestamp
  }))
  return positions
}

const PRE_ALLOCATED_POSITIONS = MOCK_POSITIONS.map(p => ({
    ...p,
    accountId: '',
    timestamp: ''
}))

function optimized(id: string) {
    const timestamp = new Date().toISOString()
    for (const p of PRE_ALLOCATED_POSITIONS) {
        p.accountId = id
        p.timestamp = timestamp
    }
    return PRE_ALLOCATED_POSITIONS
}

// Note: The optimized version above is actually DANGEROUS if called concurrently or if the returned data is modified.
// However, in a single-threaded Node.js request handler, if we immediately serialize it to JSON, it MIGHT be okay,
// BUT Hono might not serialize it immediately.
// Actually, the "optimized" way suggested in many places is to avoid the spread operator and map if possible,
// or at least reuse what we can.

function optimized_safe(id: string) {
    const timestamp = new Date().toISOString()
    const positions = new Array(MOCK_POSITIONS.length)
    for (let i = 0; i < MOCK_POSITIONS.length; i++) {
        const p = MOCK_POSITIONS[i]
        positions[i] = {
            id: p.id,
            instrumentId: p.instrumentId,
            quantity: p.quantity,
            avgOpenPrice: p.avgOpenPrice,
            markPrice: p.markPrice,
            marketValue: p.marketValue,
            unrealizedPnL: p.unrealizedPnL,
            realizedPnL: p.realizedPnL,
            dayPnL: p.dayPnL,
            costBasis: p.costBasis,
            accountId: id,
            timestamp: timestamp
        }
    }
    return positions
}

const ITERATIONS = 1_000_000

console.log(`Running ${ITERATIONS} iterations...`)

console.time('original')
for (let i = 0; i < ITERATIONS; i++) {
    original('acc_123')
}
console.timeEnd('original')

console.time('optimized_safe')
for (let i = 0; i < ITERATIONS; i++) {
    optimized_safe('acc_123')
}
console.timeEnd('optimized_safe')
