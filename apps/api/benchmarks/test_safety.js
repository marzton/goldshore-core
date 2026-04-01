
const ID_REGEX = /^acc_[a-zA-Z0-9]+$/

function escapeJson(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getBalanceRes(id, PRE_SERIALIZED_BALANCE, now) {
  const escapedId = ID_REGEX.test(id) ? id : escapeJson(id);
  return `{"balance":${PRE_SERIALIZED_BALANCE}${escapedId}","timestamp":"${now}"}}`;
}

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
const PRE_SERIALIZED_BALANCE = JSON.stringify(MOCK_BALANCE).slice(0, -1) + `,"accountId":"`;
const now = "2024-01-01T00:00:00.000Z";

const res1 = getBalanceRes("acc_123", PRE_SERIALIZED_BALANCE, now);
console.log("Normal:", res1);
JSON.parse(res1);

const res2 = getBalanceRes('acc_123"injected"', PRE_SERIALIZED_BALANCE, now);
console.log("Injected:", res2);
const parsed = JSON.parse(res2);
console.log("Parsed accountId:", parsed.balance.accountId);

if (parsed.balance.accountId === 'acc_123"injected"') {
    console.log("SUCCESS: ID correctly escaped");
} else {
    console.log("FAILURE: ID NOT correctly escaped");
    process.exit(1);
}
