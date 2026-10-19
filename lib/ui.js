// Componentes compartilhados entre a nova aba e o popup.
import { icon } from './icons.js';
import { PRIORITIES, tagById } from './store.js';
import { unlockWithCode } from './crypto.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// --- Tarefa ---
export function taskItem(task, state, { editable = false } = {}) {
  const tag = task.tagId && tagById(state, task.tagId);
  const prio = PRIORITIES[task.priority];
  const rolled = task.rolled
    ? `<span class="chip chip-rolled" title="Adiada de ${esc(task.originalDate)}">${icon('rollover', 12)}${task.rolled}d</span>`
    : '';
  const tagChip = tag
    ? `<button class="chip chip-tag" data-act="tag" style="--tag:${esc(tag.color)}" ${editable ? '' : 'tabindex="-1" disabled'}>${esc(tag.name)}</button>`
    : editable
      ? `<button class="chip chip-tag chip-empty" data-act="tag" title="Adicionar classificador">${icon('tag', 12)}</button>`
      : '';
  // Horário em coluna própria, grande, à esquerda do texto.
  const time = `<button class="task-time mono${task.time ? '' : ' is-empty'}" data-act="time" ${editable ? `title="${task.time ? 'Mudar horário' : 'Definir horário'}"` : 'tabindex="-1" disabled'}>${task.time ? esc(task.time) : '--:--'}</button>`;
  const meta = (tag ? tagChip : '') + rolled;
  const actions = editable ? `<div class="task-actions">${tag ? '' : tagChip}<button class="icon-btn task-del" data-act="delete" aria-label="Excluir">${icon('trash', 15)}</button></div>` : '';
  return h(`
    <li class="task prio-${task.priority}${task.done ? ' is-done' : ''}" data-id="${esc(task.id)}" draggable="true">
      ${editable ? `<button class="task-prio-bar" data-act="prio" title="Prioridade ${esc(prio.label.toLowerCase())} · clique para mudar" aria-label="Prioridade ${esc(prio.label)}, mudar"></button>` : ''}
      <button class="task-check" data-act="toggle" role="checkbox" aria-checked="${task.done}" aria-label="Concluir">${icon('check', 14)}</button>
      ${time}
      <div class="task-body">
        <span class="task-text" data-act="edit" title="${editable ? 'Duplo clique para editar' : ''}">${esc(task.text)}</span>
        ${meta ? `<div class="task-meta">${meta}</div>` : ''}
      </div>
      ${actions}
    </li>`);
}

// Delegação de eventos de uma lista de tarefas.
export function bindTaskEvents(root, handlers) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const li = e.target.closest('.task');
    if (!btn || !li || btn.dataset.act === 'edit') return;
    handlers[btn.dataset.act]?.(li.dataset.id, btn, e);
  });
  if (!handlers.edit) return;
  root.addEventListener('dblclick', (e) => {
    const span = e.target.closest('.task-text');
    if (!span) return;
    const li = span.closest('.task');
    li.draggable = false;
    span.contentEditable = 'plaintext-only';
    span.focus();
    document.getSelection().selectAllChildren(span);
    const finish = (save) => {
      span.contentEditable = 'false';
      li.draggable = true;
      const text = span.textContent.trim();
      if (save && text) handlers.edit(li.dataset.id, text);
      else handlers.refresh?.();
    };
    span.addEventListener('keydown', function onKey(ev) {
      if (ev.key === 'Enter') ev.preventDefault(), span.removeEventListener('keydown', onKey), span.blur();
      if (ev.key === 'Escape') span.removeEventListener('keydown', onKey), (span.dataset.cancel = '1'), span.blur();
    });
    span.addEventListener('blur', () => finish(!span.dataset.cancel), { once: true });
  });
}

// --- Drag and drop ---
// Listas com [data-date] aceitam reordenação; elementos com [data-drop-date]
// (ex.: abas de dia no popup) aceitam a tarefa no fim daquele dia.
export function enableDnD(root, onDrop) {
  let dragId = null;
  const marker = h('<li class="drop-marker" aria-hidden="true"></li>');

  const clear = () => {
    marker.remove();
    root.querySelectorAll('.is-over').forEach((el) => el.classList.remove('is-over'));
  };

  root.addEventListener('dragstart', (e) => {
    const li = e.target.closest?.('.task');
    if (!li) return;
    dragId = li.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    requestAnimationFrame(() => li.classList.add('is-dragging'));
    root.classList.add('is-dnd');
  });

  root.addEventListener('dragend', (e) => {
    e.target.closest?.('.task')?.classList.remove('is-dragging');
    root.classList.remove('is-dnd');
    clear();
    dragId = null;
  });

  root.addEventListener('dragover', (e) => {
    if (!dragId) return;
    const list = e.target.closest('[data-date]');
    const tab = e.target.closest('[data-drop-date]');
    if (!list && !tab) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    root.querySelectorAll('.is-over').forEach((el) => el !== (list || tab) && el.classList.remove('is-over'));
    (list || tab).classList.add('is-over');
    if (!list) return marker.remove();
    const after = [...list.querySelectorAll('.task:not(.is-dragging)')].find((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if (after) list.insertBefore(marker, after);
    else list.appendChild(marker);
  });

  root.addEventListener('drop', (e) => {
    if (!dragId) return;
    e.preventDefault();
    const list = e.target.closest('[data-date]');
    const tab = e.target.closest('[data-drop-date]');
    let date, index;
    if (list) {
      date = list.dataset.date;
      index = [...list.children].filter((el) => el === marker || (el.classList.contains('task') && !el.classList.contains('is-dragging'))).indexOf(marker);
    } else if (tab) {
      date = tab.dataset.dropDate;
      index = Infinity;
    }
    const id = dragId;
    clear();
    if (date) onDrop(id, date, index < 0 ? Infinity : index);
  });
}

// --- Menu flutuante simples ---
export function openMenu(anchor, items) {
  document.querySelector('.menu')?.remove();
  const menu = h(`<div class="menu" role="menu">${items
    .map((it, i) => `<button role="menuitem" data-i="${i}" class="${it.active ? 'is-active' : ''}">${it.swatch ? `<i class="swatch" style="--tag:${esc(it.swatch)}"></i>` : ''}${esc(it.label)}</button>`)
    .join('')}</div>`);
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  const top = Math.min(r.bottom + 6, innerHeight - menu.offsetHeight - 8);
  menu.style.top = `${Math.max(8, top)}px`;
  menu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8))}px`;
  menu.querySelector('button')?.focus();
  const close = () => (menu.remove(), document.removeEventListener('pointerdown', outside, true));
  const outside = (e) => !menu.contains(e.target) && close();
  document.addEventListener('pointerdown', outside, true);
  menu.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    close();
    items[b.dataset.i].onSelect();
  });
}

// --- Diálogo do código de acesso ---
export function askAccessCode() {
  return new Promise((resolve) => {
    const dlg = h(`
      <dialog class="lock-dialog" aria-labelledby="lock-title">
        <form method="dialog" class="lock-form">
          <div class="lock-icon">${icon('lock', 22)}</div>
          <h2 id="lock-title">Conteúdo protegido</h2>
          <p>Digite o código de acesso para revelar projeto e tarefas.</p>
          <input name="code" type="password" autocomplete="off" spellcheck="false" placeholder="Código de acesso" aria-label="Código de acesso" required />
          <p class="lock-error" role="alert"></p>
          <div class="lock-actions">
            <button type="button" class="btn btn-ghost" value="cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary">${icon('eye', 16)}Revelar</button>
          </div>
        </form>
      </dialog>`);
    document.body.appendChild(dlg);
    const form = dlg.querySelector('form');
    const input = form.code;
    const error = dlg.querySelector('.lock-error');
    const submit = form.querySelector('[type=submit]');
    let result = null;

    form.querySelector('[value=cancel]').addEventListener('click', () => dlg.close());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submit.disabled = true;
      error.textContent = '';
      const unlocked = await unlockWithCode(input.value);
      submit.disabled = false;
      if (!unlocked) {
        error.textContent = 'Código incorreto.';
        input.select();
        dlg.querySelector('.lock-form').animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
          { duration: 260, easing: 'ease-in-out' }
        );
        return;
      }
      result = unlocked;
      dlg.close();
    });
    dlg.addEventListener('close', () => {
      dlg.remove();
      resolve(result);
    });
    dlg.showModal();
    input.focus();
  });
}

export function toast(message) {
  const el = h(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('is-leaving'), 2200);
  setTimeout(() => el.remove(), 2600);
}

export const weekdayLabel = (date, style = 'long') => {
  const w = date.toLocaleDateString('pt-BR', { weekday: style }).replace('.', '');
  return w.charAt(0).toUpperCase() + w.slice(1);
};
export const dayMonthLabel = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
