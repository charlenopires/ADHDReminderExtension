// Ações de tarefa compartilhadas (popup e nova aba usam as mesmas regras).
import { PRIORITIES, updateTask, removeTask } from './store.js';
import { openMenu } from './ui.js';

export function taskHandlers({ mutate, getState, refresh, onManageTags }) {
  const find = (id) => getState()?.tasks.find((t) => t.id === id);
  return {
    refresh,
    toggle: (id) =>
      mutate((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (t) updateTask(s, id, { done: !t.done, doneAt: t.done ? null : Date.now() });
      }),
    delete: (id) => mutate((s) => removeTask(s, id)),
    edit: (id, text) => mutate((s) => updateTask(s, id, { text })),
    prio: (id, btn) => {
      const task = find(id);
      openMenu(
        btn,
        Object.entries(PRIORITIES).map(([key, p]) => ({
          label: p.label,
          swatch: p.color,
          active: task?.priority === key,
          onSelect: () => mutate((s) => updateTask(s, id, { priority: key }))
        }))
      );
    },
    tag: (id, btn) => {
      const task = find(id);
      const tags = getState()?.tags || [];
      const items = [
        { label: 'Sem classificador', active: !task?.tagId, onSelect: () => mutate((s) => updateTask(s, id, { tagId: null })) },
        ...tags.map((tag) => ({
          label: tag.name,
          swatch: tag.color,
          active: task?.tagId === tag.id,
          onSelect: () => mutate((s) => updateTask(s, id, { tagId: tag.id }))
        }))
      ];
      if (onManageTags) items.push({ label: '+ Gerenciar classificadores', onSelect: onManageTags });
      else if (!tags.length) items.push({ label: 'Crie classificadores no popup', onSelect: () => {} });
      openMenu(btn, items);
    }
  };
}
