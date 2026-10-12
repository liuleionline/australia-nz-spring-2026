import test from "node:test";
import assert from "node:assert/strict";
import { normalizeExpenseCurrency, parseBankRates } from "./expense-currency.mjs";

const foreign = (overrides = {}) => ({ amount: 376.72, currency: "NZD", original_amount: 100, exchange_rate: 3.7672, ...overrides });

test("foreign amounts keep the original amount and settle in RMB", () => {
  assert.deepEqual(normalizeExpenseCurrency(foreign()).value, {
    amount: 376.72, currency: "NZD", original_amount: 100, exchange_rate: 3.7672,
    exchange_rate_source: "manual", exchange_rate_date: ""
  });
});

test("half-cent values round up consistently without binary multiplication drift", () => {
  assert.equal(normalizeExpenseCurrency(foreign({ original_amount: 1, exchange_rate: 1.005, amount: 1.01 })).value.amount, 1.01);
  assert.equal(normalizeExpenseCurrency(foreign({ original_amount: 120.5, exchange_rate: 3.75, amount: 451.88 })).value.amount, 451.88);
  assert.equal(normalizeExpenseCurrency(foreign({ currency: "JPY", original_amount: 10000, exchange_rate: 0.042431, amount: 424.31 })).value.amount, 424.31);
});

test("legacy RMB clients remain compatible", () => {
  const row = normalizeExpenseCurrency({ amount: 123.456 }).value;
  assert.equal(row.currency, "CNY");
  assert.equal(row.amount, 123.46);
  assert.equal(row.original_amount, 123.46);
  assert.equal(row.exchange_rate, 1);
});

test("invalid, excessive or mismatched conversion data is rejected", () => {
  for (const body of [
    foreign({ amount: 100 }), foreign({ currency: "ZZZ" }), foreign({ exchange_rate: 0 }),
    foreign({ exchange_rate: -1 }), foreign({ exchange_rate: Infinity }), foreign({ exchange_rate: 3.123456789 }),
    foreign({ original_amount: 1.234 }), foreign({ original_amount: -1 }), foreign({ original_amount: Infinity }),
    foreign({ original_amount: 100000000, exchange_rate: 10000, amount: 1000000000000 }),
    foreign({ original_amount: 0.01, exchange_rate: 0.00000001, amount: 0 }),
    { amount: 100, currency: "NZD" }, { amount: 100, currency: "CNY", exchange_rate: 2 }
  ]) assert(normalizeExpenseCurrency(body).error, JSON.stringify(body));
});

test("a bank rate retains its timestamp; manual overrides clear bank provenance", () => {
  const timestamp = "2026-10-12T14:12:15+08:00";
  assert.equal(normalizeExpenseCurrency(foreign({ exchange_rate_source: "BOC", exchange_rate_date: timestamp })).value.exchange_rate_date, timestamp);
  assert(normalizeExpenseCurrency(foreign({ exchange_rate_source: "BOC" })).error);
  assert(normalizeExpenseCurrency(foreign({ exchange_rate_source: "unverified" })).error);
  assert.equal(normalizeExpenseCurrency(foreign({ exchange_rate_source: "manual", exchange_rate_date: timestamp })).value.exchange_rate_date, "");
});

test("bank suggestions use the sell column divided by 100, including JPY", () => {
  const html = `<table>
    <tr><th>货币名称</th><th>现汇买入价</th></tr>
    <tr data-currency='澳大利亚元'><td>澳大利亚元</td><td>465.7</td><td>465.7</td><td>469.4</td><td>469.4</td><td>469.12</td><td class="pjrq">2026/10/12 14:22:15</td><td>14:22:15</td></tr>
    <tr><td>日元</td><td>4.2105</td><td>4.2105</td><td>4.2431</td><td>4.2431</td><td>4.2506</td><td>2026/10/12 14:12:15</td><td>14:12:15</td></tr>
    <tr><td>澳大利亚元</td><td>460</td><td>460</td><td>464</td><td>464</td><td>464</td><td>2026/10/12 13:00:00</td><td>13:00:00</td></tr>
    <tr><td>新西兰元</td><td>373</td><td>373</td><td>&nbsp;</td><td>376</td><td>376</td><td>2026/10/12 14:12:15</td><td>14:12:15</td></tr>
  </table>`;
  const rates = parseBankRates(html);
  assert.deepEqual(rates.AUD, { rate: 4.694, published_at: "2026-10-12T14:22:15+08:00" });
  assert.equal(rates.JPY.rate, 0.042431);
  assert.equal(rates.NZD, undefined);
  assert.throws(() => parseBankRates("<html>Upstream unavailable</html>"));
});
