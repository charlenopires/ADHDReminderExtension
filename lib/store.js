// Estado da extensão guardado cifrado em chrome.storage.local ("vault").
// Datas são absolutas (YYYY-MM-DD), então a virada de dia é só uma regra:
// toda tarefa não concluída com data no passado passa para hoje.
import { encryptJSON, decryptJSON, keyFromRaw } from './crypto.js';

export const PRIORITIES = {
  high: { label: 'Alta', rank: 0, color: '#ff3b47' },
  medium: { label: 'Média', rank: 1, color: '#ff9f1c' },
  low: { label: 'Baixa', rank: 2, color: '#3b9eff' }
};

export const TAG_COLORS = ['#22d3ee', '#8b5cf6', '#2dd4a7', '#f472b6', '#facc15', '#60a5fa', '#fb923c', '#a3e635'];

const VAULT_KEY = 'vault';
const SESSION_KEY = 'vaultKey';
const LOCK_NAME = 'extreminder-vault';
const KEEP_DONE_DAYS = 30;

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const addDays = (key, n) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

const emptyState = () => ({ v: 2, project: '', tasks: [], tags: [] });

export function rollover(state, today = dateKey()) {
  let changed = false;
  const cutoff = addDays(today, -KEEP_DONE_DAYS);
  state.tasks = state.tasks.filter((t) => {
    if (t.done && t.date < cutoff) {
      changed = true;
      return false;
    }
    return true;
  });
  const moved = state.tasks.filter((t) => !t.done && t.date < today);
  if (moved.length) {
    // Tarefas adiadas entram no topo de hoje, preservando a ordem relativa.
    const todays = tasksFor(state, today);
    moved.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
    for (const t of moved) {
      t.rolled = (t.rolled || 0) + daysBetween(t.date, today);
      t.originalDate = t.originalDate || t.date;
      t.date = today;
    }
    [...moved, ...todays].forEach((t, i) => (t.order = i));
    changed = true;
  }
  return changed;
}

// Ordem de exibição: manual (drag and drop), concluídas no fim.
export function tasksFor(state, date) {
  return state.tasks
    .filter((t) => t.date === date)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.order - b.order);
}

const renumber = (list) => list.forEach((t, i) => (t.order = i));

export function addTask(state, { text, date, priority = 'medium', tagId = null }) {
  const list = tasksFor(state, date);
  const rank = PRIORITIES[priority].rank;
  // Nova tarefa entra ao fim do seu grupo de prioridade.
  let at = list.findIndex((t) => t.done || PRIORITIES[t.priority].rank > rank);
  if (at === -1) at = list.length;
  const task = {
    id: crypto.randomUUID(),
    text: text.trim(),
    date,
    priority,
    tagId,
    done: false,
    rolled: 0,
    createdAt: Date.now()
  };
  list.splice(at, 0, task);
  renumber(list);
  state.tasks.push(task);
  return task;
}

export function moveTask(state, id, date, index) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  const from = tasksFor(state, task.date).filter((t) => t.id !== id);
  renumber(from);
  const to = task.date === date ? from : tasksFor(state, date);
  task.date = date;
  to.splice(Math.max(0, Math.min(index, to.length)), 0, task);
  renumber(to);
}

export function sortByPriority(state, date) {
  const list = tasksFor(state, date).sort(
    (a, b) => Number(a.done) - Number(b.done) || PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank || a.order - b.order
  );
  renumber(list);
}

export const updateTask = (state, id, patch) => Object.assign(state.tasks.find((t) => t.id === id) || {}, patch);
export const removeTask = (state, id) => (state.tasks = state.tasks.filter((t) => t.id !== id));
export const tagById = (state, id) => state.tags.find((t) => t.id === id);

function normalize(data) {
  const s = Object.assign(emptyState(), data);
  s.tasks = (s.tasks || []).filter((t) => t && t.id && t.date && PRIORITIES[t.priority]);
  s.tags = (s.tags || []).filter((t) => t && t.id && t.name && /^#[0-9a-f]{6}$/i.test(t.color));
  s.project = String(s.project || '');
  return s;
}

// --- Migração da versão antiga (IndexedDB / chrome.storage em texto puro) ---
async function readLegacy() {
  const today = dateKey();
  const offsets = { today: 0, tomorrow: 1, afterTomorrow: 2 };
  const state = emptyState();
  const push = (t) => {
    if (!t || !t.text || !(t.day in offsets)) return;
    const text = t.time && t.time !== '--:--' ? `${t.time} · ${t.text}` : t.text;
    const task = addTask(state, { text, date: addDays(today, offsets[t.day]) });
    task.done = !!t.completed;
  };

  const { tasksData } = await chrome.storage.local.get('tasksData');
  if (tasksData) {
    state.project = tasksData.currentProject || '';
    Object.keys(offsets).forEach((day) => (tasksData[day] || []).forEach((t) => push({ ...t, day })));
  }

  const dbs = (await indexedDB.databases?.()) || [];
  if (dbs.some((d) => d.name === 'ADHDTasksDB')) {
    await new Promise((resolve) => {
      const req = indexedDB.open('ADHDTasksDB');
      req.onerror = () => resolve();
      req.onsuccess = () => {
        const db = req.result;
        const stores = ['tasks', 'projects'].filter((n) => db.objectStoreNames.contains(n));
        if (!stores.length) return db.close(), resolve();
        const tx = db.transaction(stores, 'readonly');
        if (stores.includes('tasks')) {
          tx.objectStore('tasks').getAll().onsuccess = (e) => {
            if (!tasksData) e.target.result.forEach(push);
          };
        }
        if (stores.includes('projects')) {
          tx.objectStore('projects').get('current').onsuccess = (e) => {
            if (e.target.result?.name) state.project = e.target.result.name;
          };
        }
        tx.oncomplete = tx.onerror = () => (db.close(), resolve());
      };
    });
  }
  return state;
}

async function clearLegacy() {
  await chrome.storage.local.remove(['tasksData', 'settings']);
  indexedDB.deleteDatabase('ADHDTasksDB');
}

// --- Cofre ---
export class Vault {
  constructor(key) {
    this.key = key;
  }

  static async exists() {
    return !!(await chrome.storage.local.get(VAULT_KEY))[VAULT_KEY];
  }

  // Chave guardada só em memória do navegador (storage.session), com expiração.
  static async fromSession() {
    try {
      const { [SESSION_KEY]: entry } = await chrome.storage.session.get(SESSION_KEY);
      if (!entry || entry.exp < Date.now()) return null;
      return new Vault(await keyFromRaw(entry.raw));
    } catch {
      return null;
    }
  }

  static async remember(raw, ttlMs) {
    await chrome.storage.session.set({ [SESSION_KEY]: { raw, exp: Date.now() + ttlMs } });
  }

  static async touch(ttlMs) {
    const { [SESSION_KEY]: entry } = await chrome.storage.session.get(SESSION_KEY);
    if (entry) await chrome.storage.session.set({ [SESSION_KEY]: { ...entry, exp: Date.now() + ttlMs } });
  }

  static forget() {
    return chrome.storage.session.remove(SESSION_KEY);
  }

  static onExternalChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[VAULT_KEY]) cb();
    });
  }

  async _read() {
    const box = (await chrome.storage.local.get(VAULT_KEY))[VAULT_KEY];
    if (box) return { state: normalize(await decryptJSON(this.key, box)), fresh: false };
    return { state: normalize(await readLegacy()), fresh: true };
  }

  async _write(state) {
    await chrome.storage.local.set({ [VAULT_KEY]: await encryptJSON(this.key, state) });
  }

  load() {
    return navigator.locks.request(LOCK_NAME, async () => {
      const { state, fresh } = await this._read();
      if (rollover(state) || fresh) await this._write(state);
      if (fresh) await clearLegacy();
      return state;
    });
  }

  // Ler-modificar-gravar sob lock, para popup e abas não se sobrescreverem.
  mutate(fn) {
    return navigator.locks.request(LOCK_NAME, async () => {
      const { state, fresh } = await this._read();
      rollover(state);
      await fn(state);
      await this._write(state);
      if (fresh) await clearLegacy();
      return state;
    });
  }

  async replace(data) {
    return this.mutate((s) => Object.assign(s, normalize(data)));
  }
}
