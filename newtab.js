// Nova aba: hoje + 2 dias, fase da lua e tarefas. Tudo começa oculto e só é
// decifrado depois do código de acesso; ao trancar, o estado sai da memória.
import { icon, logo } from './lib/icons.js';
import { moonPhase, moonSVG } from './lib/moon.js';
import { Vault, dateKey, addDays, parseKey, tasksFor, addTask, moveTask, TIME_RE } from './lib/store.js';
import { taskHandlers } from './lib/actions.js';
import { QUOTES } from './lib/quotes.js';
import { CURRENCIES, getRates } from './lib/rates.js';
import { $, esc, h, taskItem, bindTaskEvents, enableDnD, askAccessCode, weekdayLabel, dayMonthLabel } from './lib/ui.js';

const AUTO_LOCK_MS = 2 * 60 * 1000; // aba em segundo plano por 2 min → tranca

let vault = null;
let state = null;
let today = dateKey();
let hiddenTimer = null;

const daysEl = $('#days');
const eyeBtn = $('#eye');

$('#brand').innerHTML = logo(40);

function renderHeader() {
  const unlocked = !!state;
  document.body.classList.toggle('is-locked', !unlocked);
  eyeBtn.innerHTML = unlocked ? icon('eyeOff', 20) : icon('eye', 20);
  eyeBtn.setAttribute('aria-pressed', String(unlocked));
  eyeBtn.title = unlocked ? 'Ocultar conteúdo' : 'Mostrar conteúdo';
  eyeBtn.setAttribute('aria-label', eyeBtn.title);

  const project = $('#project');
  if (!unlocked) {
    project.textContent = '•••• •••••• ••••';
    project.classList.add('is-masked');
  } else {
    project.classList.remove('is-masked');
    project.classList.toggle('is-empty', !state.project);
    project.textContent = state.project || 'Defina um projeto no popup';
  }
}

function dayTitle(offset, date) {
  if (offset === 0) return 'Hoje';
  if (offset === 1) return 'Amanhã';
  return weekdayLabel(date);
}

function renderDays() {
  daysEl.replaceChildren();
  for (let offset = 0; offset < 3; offset++) {
    const key = addDays(today, offset);
    const date = parseKey(key);
    const moon = moonPhase(date);
    const tasks = state ? tasksFor(state, key) : [];
    const pending = tasks.filter((t) => !t.done).length;
    const hot = tasks.filter((t) => !t.done && t.priority === 'high').length;

    const col = h(`
      <section class="day${offset === 0 ? ' is-today' : ''}" aria-label="${esc(dayTitle(offset, date))}">
        <header class="day-head">
          <div class="day-title">
            <span class="eyebrow">${offset === 0 ? esc(weekdayLabel(date)) : `+${offset} dia${offset > 1 ? 's' : ''}`}</span>
            <h2>${esc(dayTitle(offset, date))}</h2>
            <span class="day-date mono">${esc(dayMonthLabel(date))}</span>
          </div>
          <div class="day-moon" title="${esc(moon.name)} · ${Math.round(moon.illumination * 100)}% iluminada">
            ${moonSVG(date, 52)}
            <div class="moon-text">
              <span>${esc(moon.name)}</span>
              <span class="mono">${Math.round(moon.illumination * 100)}%</span>
            </div>
          </div>
        </header>
        <div class="day-stats">
          ${state ? `<span class="mono">${pending} pendente${pending === 1 ? '' : 's'}</span>${hot ? `<span class="stat-hot">${icon('flame', 12)}${hot} alta${hot === 1 ? '' : 's'}</span>` : ''}` : '<span class="mono">— oculto —</span>'}
        </div>
        <div class="day-body"></div>
        ${state ? `<form class="quick-add" data-date="${key}"><span>${icon('plus', 16)}</span><input class="quick-input" name="text" placeholder="Adicionar tarefa…" autocomplete="off" maxlength="200" required /><input class="quick-time mono" name="time" type="time" required aria-label="Horário (hora e minuto)" title="Horário (hora e minuto)" /></form>` : ''}
      </section>`);

    const body = col.querySelector('.day-body');
    if (!state) {
      body.append(
        h(`<div class="locked-placeholder" aria-hidden="true">
             ${[78, 56, 68].map((w) => `<div class="skeleton"><i></i><b style="width:${w}%"></b></div>`).join('')}
           </div>`)
      );
    } else {
      const list = h(`<ul class="task-list" data-date="${key}"></ul>`);
      tasks.forEach((t) => list.append(taskItem(t, state, { editable: true })));
      if (!tasks.length) list.append(h(`<li class="empty">${icon('sparkle', 18)}<span>Dia livre</span></li>`));
      body.append(list);
    }
    daysEl.append(col);
  }
}

// Coluna de frases: não é cifrada, fica visível mesmo com o conteúdo oculto.
const quotesEl = $('#quotes');

// Uma frase sorteada a cada aba aberta (o botão sorteia outra, sem repetir a atual).
let quoteIdx = -1;

function renderQuote() {
  let i;
  do i = Math.floor(Math.random() * QUOTES.length);
  while (i === quoteIdx && QUOTES.length > 1);
  quoteIdx = i;
  const [text, author] = QUOTES[i];
  quotesEl.replaceChildren(
    h(`
      <header class="quotes-head">
        <div class="day-title">
          <span class="eyebrow">Sabedoria · foco</span>
          <h2>Persista</h2>
          <span class="day-date mono">${String(i + 1).padStart(3, '0')} / ${QUOTES.length}</span>
        </div>
        <button class="eye-btn quotes-shuffle" type="button" title="Outra frase" aria-label="Outra frase">${icon('sparkle', 18)}</button>
      </header>`),
    h(`
      <figure class="quote">
        <blockquote>${esc(text)}</blockquote>
        <figcaption>— ${esc(author)}</figcaption>
      </figure>`)
  );
}

quotesEl.addEventListener('click', (e) => {
  if (e.target.closest('.quotes-shuffle')) renderQuote();
});

// Cotações do dia: públicas, não cifradas, visíveis mesmo com o conteúdo oculto.
const ratesEl = $('#rates');
const brl = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function renderRates() {
  const data = await getRates();
  const at = data ? new Date(data.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  ratesEl.title = data ? `Cotação de compra em R$ · atualizada às ${at}` : 'Cotações indisponíveis';
  ratesEl.replaceChildren(
    ...CURRENCIES.map(({ code, label, symbol }) => {
      const r = data?.rates[code];
      const dir = !r || r.pct === 0 ? '' : r.pct > 0 ? ' is-up' : ' is-down';
      return h(`
        <div class="rate${dir}" aria-label="${esc(label)}">
          <span class="eyebrow">${esc(label)} <b>${esc(symbol)}</b></span>
          <span class="rate-value mono">${r ? `R$ ${brl(r.bid)}` : '—'}</span>
          ${r ? `<span class="rate-pct mono">${r.pct > 0 ? '+' : ''}${brl(r.pct)}%</span>` : ''}
        </div>`);
    })
  );
}

function render() {
  renderHeader();
  renderDays();
}

async function mutate(fn) {
  if (!vault) return;
  state = await vault.mutate(fn);
  render();
}

function lock() {
  vault = null;
  state = null;
  render();
}

async function unlock() {
  const result = await askAccessCode();
  if (!result) return;
  vault = new Vault(result.key);
  state = await vault.load();
  render();
}

eyeBtn.addEventListener('click', () => (state ? lock() : unlock()));

bindTaskEvents(daysEl, taskHandlers({ mutate, getState: () => state, refresh: render }));

enableDnD(daysEl, (id, date, index) => mutate((s) => moveTask(s, id, date, index)));

daysEl.addEventListener('submit', (e) => {
  const form = e.target.closest('.quick-add');
  if (!form) return;
  e.preventDefault();
  const text = form.text.value.trim();
  const time = form.time.value;
  if (!text) return;
  if (!TIME_RE.test(time)) return form.time.focus();
  const date = form.dataset.date;
  mutate((s) => addTask(s, { text, date, time, priority: 'medium' })).then(() => {
    daysEl.querySelector(`.quick-add[data-date="${date}"] input`)?.focus();
  });
});

// Mudanças feitas no popup ou em outra aba.
Vault.onExternalChange(async () => {
  if (!vault) return;
  state = await vault.load();
  render();
});

// Relógio + virada de dia (as tarefas pendentes passam sozinhas para o novo hoje).
function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $('#today-label').textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }).replace('.', '');
  if (dateKey(now) !== today) {
    today = dateKey(now);
    if (vault) vault.load().then((s) => ((state = s), render()));
    else render();
  }
}
tick();
setInterval(tick, 5000);

document.addEventListener('visibilitychange', () => {
  clearTimeout(hiddenTimer);
  if (document.hidden && state) hiddenTimer = setTimeout(lock, AUTO_LOCK_MS);
  if (!document.hidden) tick(), renderRates();
});

renderQuote();
renderRates();
render();
