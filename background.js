// Service worker do Extreminder.
// Os dados ficam cifrados e só são lidos pelas páginas depois do código de acesso,
// então a virada de dia acontece quando a nova aba/popup carrega o cofre.

// Deixa a chave do popup (storage.session) inacessível a content scripts.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });
});
