
// @ts-nocheck
const MOCK_ACCOUNTS = [
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

const MOCK_BALANCE = {
  id: 'bal_123',
  netLiq: 54000.50,
  cash: 5000.00,
  settledCash: 5000.00,
  buyingPower: 100000.00,
  optionBuyingPower: 50000.00,
  maintenanceExcess: 25000.00,
  marginUsed: 0
}

const MOCK_POSITIONS = [
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

// Baseline implementations
function original_accounts() {
  const now = new Date().toISOString()
  const accounts = MOCK_ACCOUNTS.map(acc => ({
    ...acc,
    createdAt: now,
    updatedAt: now
  }))
  return { accounts }
}

function original_balances(id) {
  const balance = {
    ...MOCK_BALANCE,
    accountId: id,
    timestamp: new Date().toISOString(),
  }
  return { balance }
}

function original_positions(id) {
  const timestamp = new Date().toISOString()
  const positions = MOCK_POSITIONS.map(p => ({
    ...p,
    accountId: id,
    timestamp
  }))
  return { positions }
}

// Optimized implementations (Safe pre-serialized)
const PRE_SERIALIZED_ACCOUNTS = MOCK_ACCOUNTS.map(acc => {
    const s = JSON.stringify(acc);
    return s.slice(0, -1) + `,"createdAt":"`;
});

const PRE_SERIALIZED_BALANCE = (() => {
    const s = JSON.stringify(MOCK_BALANCE);
    return s.slice(0, -1) + `,"accountId":"`;
})();

const PRE_SERIALIZED_POSITIONS = MOCK_POSITIONS.map(p => {
    const s = JSON.stringify(p);
    return s.slice(0, -1) + `,"accountId":"`;
});

const ID_REGEX = /^acc_[a-zA-Z0-9]+$/

function escapeJson(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function optimized_accounts() {
    const now = new Date().toISOString()
    let res = '{"accounts":[';
    for (let i = 0; i < PRE_SERIALIZED_ACCOUNTS.length; i++) {
        res += PRE_SERIALIZED_ACCOUNTS[i] + now + `","updatedAt":"` + now + `"} `;
        if (i < PRE_SERIALIZED_ACCOUNTS.length - 1) res += ',';
    }
    res += ']}';
    return res;
}

function optimized_balances(id) {
    const now = new Date().toISOString()
    const escapedId = ID_REGEX.test(id) ? id : escapeJson(id);
    return `{"balance":${PRE_SERIALIZED_BALANCE}${escapedId}","timestamp":"${now}"}}`;
}

function optimized_positions(id) {
    const now = new Date().toISOString()
    const escapedId = ID_REGEX.test(id) ? id : escapeJson(id);
    let res = '{"positions":[';
    for (let i = 0; i < PRE_SERIALIZED_POSITIONS.length; i++) {
        res += PRE_SERIALIZED_POSITIONS[i] + escapedId + `","timestamp":"` + now + `"} `;
        if (i < PRE_SERIALIZED_POSITIONS.length - 1) res += ',';
    }
    res += ']}';
    return res;
}

const ITERATIONS = 1_000_000

console.log(`Running ${ITERATIONS} iterations...`)

console.time('ACCOUNTS: original + JSON.stringify')
for (let i = 0; i < ITERATIONS; i++) {
    JSON.stringify(original_accounts())
}
console.timeEnd('ACCOUNTS: original + JSON.stringify')

console.time('ACCOUNTS: optimized_json')
for (let i = 0; i < ITERATIONS; i++) {
    optimized_accounts()
}
console.timeEnd('ACCOUNTS: optimized_json')

console.time('BALANCES: original + JSON.stringify')
for (let i = 0; i < ITERATIONS; i++) {
    JSON.stringify(original_balances('acc_123'))
}
console.timeEnd('BALANCES: original + JSON.stringify')

console.time('BALANCES: optimized_json')
for (let i = 0; i < ITERATIONS; i++) {
    optimized_balances('acc_123')
}
console.timeEnd('BALANCES: optimized_json')

console.time('POSITIONS: original + JSON.stringify')
for (let i = 0; i < ITERATIONS; i++) {
    JSON.stringify(original_positions('acc_123'))
}
console.timeEnd('POSITIONS: original + JSON.stringify')

console.time('POSITIONS: optimized_json')
for (let i = 0; i < ITERATIONS; i++) {
    optimized_positions('acc_123')
}
console.timeEnd('POSITIONS: optimized_json')
