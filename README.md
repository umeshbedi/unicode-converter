# Unicode Converter (Electron)

Simple desktop app that converts characters according to user-defined mappings. Mappings are stored as JSON files per language.

Quick start

1. Install dependencies:

```powershell
npm install
```

2. Run the app:

```powershell
npm start
```

Notes

- Mappings are saved to your OS user data directory under `mappings/`. This keeps user changes persistent across app updates.
- You can create new languages, add/delete mappings, and convert text in two directions: "To Unicode" or "From Unicode".

Files

- `main.js` — Electron main process and IPC to read/write mappings
- `preload.js` — safe IPC exposed to renderer
- `renderer.js` — UI logic
- `mappings/default.json` — sample mapping

