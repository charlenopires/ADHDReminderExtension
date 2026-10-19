// Popup: adicionar/organizar tarefas, projeto e classificadores.
import { icon, logo } from './lib/icons.js';
import { Vault, dateKey, addDays, parseKey, tasksFor, addTask, moveTask, tagById, TAG_COLORS, TIME_RE } from './lib/store.js';
import { $, esc, h, taskItem, bindTaskEvents, enableDnD, openMenu, askAccessCode, toast, weekdayLabel, dayMonthLabel } from './lib/ui.js';
import { taskHandlers } from './lib/actions.js';

// O popup lembra o desbloqueio só na memória do navegador, por 15 min de inatividade.
const SESSION_TTL = 15 * 60 * 1000;

let vault = null;
let state = null;
let selectedDate = dateKey();
let selectedTagId = null;
let selectedColor = TAG_COLORS[0];

const views = { locked: $('#view-locked'), main: $('#view-main'), settings: $('#view-settings') };
const show = (name) => Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));

// Ícones estáticos
$('#locked-logo').innerHTML = logo(64);
$('#bar-logo').innerHTML = logo(22);
$('#unlock').innerHTML = `${icon('lock', 16)}Desbloquear`;
$('#lock').innerHTML = icon('lock', 17);
$('#open-settings').innerHTML = icon('settings', 17);
$('#back').innerHTML = icon('arrowLeft', 17);
$('#project-icon').innerHTML = icon('target', 16);
$('#add-btn').innerHTML = icon('plus', 18);
$('#export').innerHTML = `${icon('download', 16)}Exportar`;
$('#import').innerHTML = `${icon('upload', 16)}Importar`;

async function mutate(fn) {
  if (!vault) return;
  state = await vault.mutate(fn);
  Vault.touch(SESSION_TTL);
  render();
}

// --- Render ---
function renderTabs() {
  const today = dateKey();
  const nav = $('#day-tabs');
  nav.replaceChildren();
  for (let i = 0; i < 3; i++) {
    const key = addDays(today, i);
    const date = parseKey(key);
    const pending = tasksFor(state, key).filter((t) => !t.done).length;
    const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : weekdayLabel(date, 'short');
    nav.append(
      h(`<button class="day-tab${key === selectedDate ? ' is-active' : ''}" role="tab" aria-selected="${key === selectedDate}" data-key="${key}" data-drop-date="${key}">
           <span class="day-tab-label">${esc(label)}</span>
           <span class="day-tab-date mono">${esc(dayMonthLabel(date))}</span>
           ${pending ? `<span class="day-tab-count mono">${pending}</span>` : ''}
         </button>`)
    );
  }
}

function renderTagPicker() {
  const tag = selectedTagId && tagById(state, selectedTagId);
  if (!tag) selectedTagId = null;
  $('#tag-picker').innerHTML = tag
    ? `<i class="swatch" style="--tag:${esc(tag.color)}"></i><span>${esc(tag.name)}</span>`
    : `${icon('tag', 14)}<span>Classificador</span>`;
}

function renderList() {
  const list = $('#task-list');
  list.dataset.date = selectedDate;
  const tasks = tasksFor(state, selectedDate);
  list.replaceChildren(...tasks.map((t) => taskItem(t, state, { editable: true })));
  if (!tasks.length) list.append(h(`<li class="empty">${icon('sparkle', 18)}<span>Nenhuma tarefa neste dia</span></li>`));
  const pending = tasks.filter((t) => !t.done).length;
  $('#list-count').textContent = `${pending} pendente${pending === 1 ? '' : 's'} · ${tasks.length - pending} feita${tasks.length - pending === 1 ? '' : 's'}`;
}

function renderTags() {
  $('#tag-colors').replaceChildren(
    ...TAG_COLORS.map((c) =>
      h(`<button type="button" class="color-dot${c === selectedColor ? ' is-active' : ''}" role="radio" aria-checked="${c === selectedColor}" aria-label="Cor ${c}" data-color="${c}" style="--tag:${c}"></button>`)
    )
  );
  const list = $('#tag-list');
  list.replaceChildren(
    ...state.tags.map((tag) => {
      const count = state.tasks.filter((t) => t.tagId === tag.id && !t.done).length;
      return h(`<li class="tag-row">
          <button type="button" class="color-dot" data-tag-color="${esc(tag.id)}" style="--tag:${esc(tag.color)}" title="Mudar cor" aria-label="Mudar cor de ${esc(tag.name)}"></button>
          <input class="tag-name-input" data-tag-name="${esc(tag.id)}" value="${esc(tag.name)}" maxlength="24" autocomplete="off" spellcheck="false" aria-label="Nome do classificador" />
          <span class="mono tag-count">${count} ativa${count === 1 ? '' : 's'}</span>
          <button class="icon-btn" data-del-tag="${esc(tag.id)}" aria-label="Excluir ${esc(tag.name)}">${icon('trash', 15)}</button>
        </li>`);
    })
  );
  if (!state.tags.length) list.append(h('<li class="empty">Nenhum classificador ainda</li>'));
}

function render() {
  if (!state) return;
  renderTabs();
  renderTagPicker();
  renderList();
  if (!views.settings.hidden) renderTags();
  const project = $('#project');
  if (document.activeElement !== project) project.value = state.project;
}

// --- Bloqueio ---
async function enter(v) {
  vault = v;
  state = await vault.load();
  show('main');
  render();
  $('#task-text').focus();
}

$('#unlock').addEventListener('click', async () => {
  const result = await askAccessCode();
  if (!result) return;
  await Vault.remember(result.raw, SESSION_TTL);
  enter(new Vault(result.key));
});

$('#lock').addEventListener('click', async () => {
  await Vault.forget();
  vault = null;
  state = null;
  show('locked');
});

// --- Eventos principais ---
$('#day-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.day-tab');
  if (!tab) return;
  selectedDate = tab.dataset.key;
  render();
});

$('#add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#task-text');
  const timeInput = $('#task-time');
  const text = input.value.trim();
  const time = timeInput.value;
  if (!text) return;
  if (!TIME_RE.test(time)) return toast('Defina o horário (hora e minuto)'), timeInput.focus();
  const priority = e.target.priority.value;
  input.value = '';
  timeInput.value = '';
  mutate((s) => addTask(s, { text, date: selectedDate, time, priority, tagId: selectedTagId })).then(() => input.focus());
});

$('#tag-picker').addEventListener('click', (e) => {
  openMenu(e.currentTarget, [
    { label: 'Sem classificador', active: !selectedTagId, onSelect: () => ((selectedTagId = null), renderTagPicker()) },
    ...state.tags.map((tag) => ({
      label: tag.name,
      swatch: tag.color,
      active: selectedTagId === tag.id,
      onSelect: () => ((selectedTagId = tag.id), renderTagPicker())
    })),
    { label: '+ Gerenciar classificadores', onSelect: openSettings }
  ]);
});


let projectTimer;
$('#project').addEventListener('input', (e) => {
  clearTimeout(projectTimer);
  const value = e.target.value;
  projectTimer = setTimeout(() => mutate((s) => (s.project = value.trim())), 400);
});

bindTaskEvents($('#task-list'), taskHandlers({ mutate, getState: () => state, refresh: render, onManageTags: openSettings }));
enableDnD(views.main, (id, date, index) => mutate((s) => moveTask(s, id, date, index)));

// --- Classificadores ---
function openSettings() {
  show('settings');
  renderTags();
  $('#tag-name').focus();
}

$('#open-settings').addEventListener('click', openSettings);
$('#back').addEventListener('click', () => (show('main'), render()));

$('#tag-colors').addEventListener('click', (e) => {
  const dot = e.target.closest('[data-color]');
  if (!dot) return;
  selectedColor = dot.dataset.color;
  renderTags();
});

$('#tag-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#tag-name').value.trim();
  if (!name) return;
  if (state.tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return toast('Esse classificador já existe');
  $('#tag-name').value = '';
  const color = selectedColor;
  selectedColor = TAG_COLORS[(TAG_COLORS.indexOf(color) + 1) % TAG_COLORS.length];
  mutate((s) => s.tags.push({ id: crypto.randomUUID(), name, color }));
});

const COLOR_NAMES = {
  '#22d3ee': 'Ciano',
  '#8b5cf6': 'Violeta',
  '#2dd4a7': 'Verde',
  '#f472b6': 'Rosa',
  '#facc15': 'Amarelo',
  '#60a5fa': 'Azul',
  '#fb923c': 'Laranja',
  '#a3e635': 'Lima'
};

// Editar classificador: renomear no próprio campo, trocar cor pelo ponto.
$('#tag-list').addEventListener('change', (e) => {
  const input = e.target.closest('[data-tag-name]');
  if (!input) return;
  const id = input.dataset.tagName;
  const name = input.value.trim();
  const tag = tagById(state, id);
  if (!tag) return;
  if (!name) return (input.value = tag.name);
  if (state.tags.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
    input.value = tag.name;
    return toast('Esse classificador já existe');
  }
  if (name !== tag.name) mutate((s) => (tagById(s, id).name = name)).then(renderTags);
});

$('#tag-list').addEventListener('keydown', (e) => {
  const input = e.target.closest('[data-tag-name]');
  if (!input) return;
  if (e.key === 'Enter') input.blur();
  if (e.key === 'Escape') (input.value = tagById(state, input.dataset.tagName)?.name || ''), input.blur();
});

$('#tag-list').addEventListener('click', (e) => {
  const dot = e.target.closest('[data-tag-color]');
  if (dot) {
    const id = dot.dataset.tagColor;
    const current = tagById(state, id)?.color;
    return openMenu(
      dot,
      TAG_COLORS.map((color) => ({
        label: COLOR_NAMES[color] || color,
        swatch: color,
        active: color === current,
        onSelect: () => mutate((s) => (tagById(s, id).color = color)).then(renderTags)
      }))
    );
  }
  const btn = e.target.closest('[data-del-tag]');
  if (!btn) return;
  const id = btn.dataset.delTag;
  mutate((s) => {
    s.tags = s.tags.filter((t) => t.id !== id);
    s.tasks.forEach((t) => t.tagId === id && (t.tagId = null));
  });
});

// --- Backup ---
$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = h(`<a download="extreminder-${dateKey()}.json"></a>`);
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.tasks)) throw new Error('formato');
    state = await vault.replace(data);
    render();
    renderTags();
    toast('Backup importado');
  } catch {
    toast('Arquivo inválido');
  }
});

// --- Inicialização ---
Vault.onExternalChange(async () => {
  if (vault) (state = await vault.load()), render();
});

const cached = await Vault.fromSession();
if (cached) {
  try {
    await enter(cached);
  } catch {
    await Vault.forget();
    show('locked');
  }
} else {
  show('locked');
}
