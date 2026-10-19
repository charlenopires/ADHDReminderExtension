// Código de acesso e criptografia do cofre (WebCrypto).
// O código nunca aparece em texto puro: guardamos apenas um verificador
// PBKDF2-SHA256 (310k iterações). A chave AES-GCM que cifra os dados é
// derivada do mesmo código com outro salt, então sem o código não há leitura.

const ITERATIONS = 310000;
const VERIFY_SALT = '4fcdad366de3fc3f64fb350dc81ddf0c';
const KEY_SALT = '0286aa03f17562b6de6b153a1daf6788';
const VERIFIER = 'e1eefba4de6ce1e5ce232e22eacf764e4bc02bc5a20dd64010cc3e31303c778e';

const enc = new TextEncoder();
const dec = new TextDecoder();

const hexToBytes = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
const bytesToHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
const toB64 = (bytes) => {
  const arr = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i += 0x8000) s += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function pbkdf2(code, saltHex) {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: ITERATIONS }, base, 256);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const importAesKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

// Retorna { key, raw } se o código estiver certo; null caso contrário.
export async function unlockWithCode(code) {
  const attempt = bytesToHex(await pbkdf2(code.trim().toLowerCase(), VERIFY_SALT));
  if (!constantTimeEqual(attempt, VERIFIER)) return null;
  const raw = await pbkdf2(code.trim().toLowerCase(), KEY_SALT);
  return { key: await importAesKey(raw), raw: toB64(raw) };
}

export const keyFromRaw = (rawB64) => importAesKey(fromB64(rawB64));

export async function encryptJSON(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  return { v: 1, iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.ct));
  return JSON.parse(dec.decode(pt));
}
