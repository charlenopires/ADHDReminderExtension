# Extreminder

A Chrome extension (Manifest V3) that shows your **project in focus** and your tasks for **today and the next 2 days** on every new tab, along with the **moon phase** for each day and a **quote** to keep you going. Everything starts **hidden and encrypted**.

## Features

- **New tab**: project at the top, 3 columns (Today, Tomorrow, +2) with moon phase and illumination %, plus counts of pending and high-priority tasks. Fits the screen without scrolling and collapses to a single column on narrow screens.
- **Quotes**: a side column shows one randomly picked quote per tab, in a large font — 300 quotes about finishing what you start and persisting to the end, from Stoics and classics, tech entrepreneurs and Eastern thinkers. The shuffle button picks another one (never repeating the current). Quotes are not encrypted and stay visible even while the content is hidden.
- **Privacy**: content starts hidden. The eye button asks for the **access code** and then reveals the project and tasks. Click again to hide. The tab locks itself after 2 minutes in the background.
- **Automatic day rollover**: a task not completed on its day moves to the next day and gets a `↻ Nd` badge showing how many days it has been postponed. Completed tasks are kept for 30 days.
- **Heat-scale priorities**: High (red), Medium (orange), Low (cool blue).
- **Drag and drop**: reorder within a day or drag to another day (columns on the new tab, day tabs in the popup). "Sort by priority" reorganizes the day.
- **Labels**: create your own (e.g. IFPI, Personal, Startup), with a color, and apply them to tasks.
- **Popup** (`Ctrl/Cmd+Shift+U`): project, add tasks with priority and label, edit with double-click, JSON backup.

> The UI and quotes are in Brazilian Portuguese.

## Security

- The access code is **not stored in plain text in the source code**. Only a PBKDF2-SHA256 verifier exists (310k iterations, salted).
- Project, tasks and labels are **encrypted with AES-GCM** in `chrome.storage.local`. The key is derived from the access code with a different salt.
- The popup remembers the unlock for 15 minutes of inactivity, in browser memory only (`chrome.storage.session`, restricted to trusted contexts). The new tab always starts locked.
- Data from the old version (IndexedDB and `tasksData`) is migrated into the encrypted vault on first unlock and then deleted.
- Minimal permissions: only `storage`.

## Design

- Dark palette on a 12-step scale in the style of Radix Colors (slate as the base, cyan/violet as accents). Tokens live in `styles/tokens.css`.
- Typography: Geist and Geist Mono.
- Inline SVG icons (`lib/icons.js`). The extension icons are generated from `icons/icon.svg` and `icons/icon-small.svg`:

```bash
rsvg-convert -w 128 -h 128 icons/icon.svg -o icons/icon128.png
```

## Installation

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Structure

```
manifest.json      background.js
newtab.html/js     popup.html/js
lib/  crypto.js (access code + AES-GCM) · store.js (vault, day rollover, ordering)
      moon.js (moon phase) · quotes.js (quotes) · ui.js (components, DnD, dialog)
      actions.js · icons.js
styles/ tokens.css · app.css · newtab.css · popup.css
icons/  icon.svg · icon-small.svg · PNGs 16/32/48/128
```

## License

See [LICENSE](LICENSE).
