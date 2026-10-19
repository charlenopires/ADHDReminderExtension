# Extreminder

Extensão do Chrome (Manifest V3) que mostra, em cada nova aba, o **projeto em foco** e as tarefas de **hoje e dos próximos 2 dias**, com a **fase da lua** de cada dia. Tudo começa **oculto e cifrado**.

## Recursos

- **Nova aba**: projeto no topo, 3 colunas (Hoje, Amanhã, +2) com fase da lua e % de iluminação, contagem de pendentes e de alta prioridade. Cabe na tela sem rolagem e vira coluna única em telas estreitas.
- **Privacidade**: o conteúdo começa oculto. O botão do olho pede o **código de acesso** e então revela projeto e tarefas. Clicar de novo oculta. A aba se tranca sozinha depois de 2 min em segundo plano.
- **Virada de dia automática**: tarefa não concluída no seu dia passa para o dia seguinte e ganha um selo `↻ Nd` com quantos dias foi adiada. Tarefas concluídas ficam guardadas por 30 dias.
- **Prioridades com escala de calor**: Alta (vermelho), Média (laranja), Baixa (azul frio).
- **Drag and drop**: reordene dentro do dia ou arraste para outro dia (colunas na nova aba, abas de dia no popup). "Ordenar por prioridade" reorganiza o dia.
- **Classificadores**: crie os seus (ex.: IFPI, Pessoal, Startup), com cor, e aplique às tarefas.
- **Popup** (`Ctrl/Cmd+Shift+U`): projeto, adicionar tarefas com prioridade e classificador, editar com duplo clique, backup em JSON.

## Segurança

- O código de acesso **não fica no código-fonte em texto puro**. Só existe um verificador PBKDF2-SHA256 (310k iterações, com salt).
- Projeto, tarefas e classificadores ficam **cifrados com AES-GCM** em `chrome.storage.local`. A chave é derivada do código de acesso com outro salt.
- O popup lembra o desbloqueio por 15 min de inatividade, só na memória do navegador (`chrome.storage.session`). A nova aba sempre começa trancada.
- Os dados da versão antiga (IndexedDB e `tasksData`) são migrados para o cofre cifrado no primeiro desbloqueio e depois apagados.
- Permissões mínimas: só `storage`.

## Design

- Paleta dark em escala de 12 passos no estilo Radix Colors (slate como base, cyan/violet como acentos). Os tokens ficam em `styles/tokens.css`.
- Tipografia: Geist e Geist Mono.
- Ícones SVG inline (`lib/icons.js`). Os ícones da extensão são gerados a partir de `icons/icon.svg` e `icons/icon-small.svg`:

```bash
rsvg-convert -w 128 -h 128 icons/icon.svg -o icons/icon128.png
```

## Instalação

1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione esta pasta.

## Estrutura

```
manifest.json      background.js
newtab.html/js     popup.html/js
lib/  crypto.js (código + AES-GCM) · store.js (cofre, virada de dia, ordem)
      moon.js (fase da lua) · ui.js (componentes, DnD, diálogo) · actions.js · icons.js
styles/ tokens.css · app.css · newtab.css · popup.css
icons/  icon.svg · icon-small.svg · PNGs 16/32/48/128
```
