// Cotações do dia (dólar, euro, libra em R$) via AwesomeAPI, sem chave.
// Guarda em cache por 30 min para não buscar a cada aba aberta.
const URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL';
const CACHE_KEY = 'ratesCache';
const TTL_MS = 30 * 60 * 1000;

export const CURRENCIES = [
  { code: 'USD', label: 'Dólar', symbol: 'US$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'Libra', symbol: '£' },
];

async function readCache() {
  try {
    const { [CACHE_KEY]: cache } = await chrome.storage.local.get(CACHE_KEY);
    return cache || null;
  } catch {
    return null;
  }
}

async function fetchRates() {
  const res = await fetch(URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const rates = {};
  for (const { code } of CURRENCIES) {
    const q = data[`${code}BRL`];
    if (q) rates[code] = { bid: Number(q.bid), pct: Number(q.pctChange) };
  }
  return { at: Date.now(), rates };
}

// Devolve o cache se ainda for recente; senão busca. Em falha, usa o cache antigo.
export async function getRates() {
  const cache = await readCache();
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  let fresh;
  try {
    fresh = await fetchRates();
  } catch {
    return cache;
  }
  try {
    await chrome.storage.local.set({ [CACHE_KEY]: fresh });
  } catch {}
  return fresh;
}
