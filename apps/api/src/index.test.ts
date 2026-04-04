import { test } from 'node:test'
import assert from 'node:assert'
import { app } from './index.ts'

test('GET /accounts', async () => {
  const res = await app.request('/accounts')
  assert.strictEqual(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.accounts))
  assert.strictEqual(data.accounts.length, 1)
  assert.strictEqual(data.accounts[0].id, 'acc_123')
  assert.ok(data.accounts[0].createdAt)
  assert.ok(data.accounts[0].updatedAt)
})

test('GET /accounts/:id/balances/latest', async () => {
  const id = 'acc_123'
  const res = await app.request(`/accounts/${id}/balances/latest`)
  assert.strictEqual(res.status, 200)
  const data = await res.json()
  assert.strictEqual(data.balance.accountId, id)
  assert.ok(data.balance.timestamp)
})

test('GET /accounts/:id/balances/latest with special chars', async () => {
  // The current implementation uses ID_REGEX = /^acc_[a-zA-Z0-9]+$/
  // If it doesn't match, it uses escapeJson.
  const id = 'acc_123"quote\\'
  const res = await app.request(`/accounts/${encodeURIComponent(id)}/balances/latest`)
  assert.strictEqual(res.status, 200)
  const data = await res.json()
  assert.strictEqual(data.balance.accountId, id)
})

test('GET /accounts/:id/positions', async () => {
  const id = 'acc_123'
  const res = await app.request(`/accounts/${id}/positions`)
  assert.strictEqual(res.status, 200)
  const data = await res.json()
  assert.ok(Array.isArray(data.positions))
  assert.strictEqual(data.positions[0].accountId, id)
  assert.ok(data.positions[0].timestamp)
})

test('GET /portfolio/overview', async () => {
  const res = await app.request('/portfolio/overview')
  assert.strictEqual(res.status, 200)
  const data = await res.json()
  assert.strictEqual(typeof data.totalNetLiq, 'number')
})
