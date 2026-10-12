export const BOC_RATE_URL = "https://www.boc.cn/sourcedb/whpj/";
export const CURRENCY_NAMES = {
  CNY: "人民币", AUD: "澳大利亚元", NZD: "新西兰元", USD: "美元",
  EUR: "欧元", GBP: "英镑", HKD: "港币", JPY: "日元",
  CAD: "加拿大元", SGD: "新加坡元", CHF: "瑞士法郎", THB: "泰国铢"
};

export function normalizeExpenseCurrency(body) {
  const currency = String(body.currency || "CNY").toUpperCase();
  if (!Object.hasOwn(CURRENCY_NAMES, currency)) return { error: "币种无效" };
  const amount = Number(body.amount);
  const originalAmount = Number(body.original_amount ?? (currency === "CNY" ? amount : NaN));
  const exchangeRate = Number(body.exchange_rate ?? (currency === "CNY" ? 1 : NaN));
  if (!Number.isFinite(originalAmount) || originalAmount <= 0 || originalAmount > 100000000) return { error: "原币金额无效" };
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 10000) return { error: "请填写有效汇率" };
  if (currency === "CNY" && exchangeRate !== 1) return { error: "人民币汇率必须为1" };
  const originalCents = Math.round(originalAmount * 100);
  const rateUnits = Math.round(exchangeRate * 100000000);
  // Preserve the former API's rounding when an old client supplies only amount.
  if (body.original_amount != null && Math.abs(originalAmount - originalCents / 100) > 0.0000001) return { error: "原币金额最多保留两位小数" };
  if (rateUnits <= 0 || Math.abs(exchangeRate - rateUnits / 100000000) > 0.00000000001) return { error: "汇率最多保留八位小数" };
  const convertedCents = Number((BigInt(originalCents) * BigInt(rateUnits) + 50000000n) / 100000000n);
  if (convertedCents <= 0 || convertedCents > 10000000000) return { error: "折合人民币金额无效" };
  if (!Number.isFinite(amount) || Math.round(amount * 100) !== convertedCents) return { error: "人民币金额与外币折算结果不一致" };
  const source = currency === "CNY" ? "manual" : String(body.exchange_rate_source || "manual");
  if (!["manual", "BOC"].includes(source)) return { error: "汇率来源无效" };
  const rateDate = source === "BOC" ? String(body.exchange_rate_date || "") : "";
  if (source === "BOC" && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(rateDate) || !Number.isFinite(Date.parse(rateDate)))) return { error: "请保留银行牌价的发布时间" };
  return { value: {
    amount: convertedCents / 100, currency, original_amount: originalCents / 100,
    exchange_rate: rateUnits / 100000000, exchange_rate_source: source, exchange_rate_date: rateDate
  } };
}

export function parseBankRates(html) {
  const rates = {};
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => cell[1].replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/g, " ").trim());
    const currency = Object.keys(CURRENCY_NAMES).find((code) => CURRENCY_NAMES[code] === cells[0]);
    if (!currency || currency === "CNY" || cells.length < 7) continue;
    const sellPrice = Number(cells[3]);
    if (!cells[3] || !Number.isFinite(sellPrice) || sellPrice <= 0 || !/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(cells[6])) continue;
    const publishedAt = cells[6].replaceAll("/", "-").replace(" ", "T") + "+08:00";
    if (!Number.isFinite(Date.parse(publishedAt))) continue;
    if (!rates[currency] || publishedAt > rates[currency].published_at) {
      // BOC quotes RMB per 100 foreign units; the expense form uses RMB per 1.
      rates[currency] = { rate: Number((sellPrice / 100).toFixed(8)), published_at: publishedAt };
    }
  }
  if (!Object.keys(rates).length) throw new Error("Bank page did not contain usable exchange rates");
  return rates;
}

let cache = null;
let pending = null;
export async function getBankRates() {
  if (cache && Date.now() - cache.loadedAt < 10 * 60 * 1000) return cache.payload;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch(BOC_RATE_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Bank exchange rate request failed");
    const rates = parseBankRates(await response.text());
    const payload = { rates, source: "中国银行现汇卖出价", source_url: BOC_RATE_URL, unit: "CNY per 1 foreign unit", fetched_at: new Date().toISOString() };
    cache = { payload, loadedAt: Date.now() };
    return payload;
  })();
  try { return await pending; } finally { pending = null; }
}
