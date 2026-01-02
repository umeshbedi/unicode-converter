const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

async function ensureMappingsDir() {
  const dir = path.join(app.getPath('userData'), 'mappings');
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });

  // If there's a default mapping in the app folder, copy it into userData on first run
  const defaultSrc = path.join(__dirname, 'mappings', 'default.json');
  const defaultDst = path.join(dir, 'default.json');
  if (!fsSync.existsSync(defaultDst) && fsSync.existsSync(defaultSrc)) {
    fsSync.copyFileSync(defaultSrc, defaultDst);
  }
}

app.whenReady().then(async () => {
  await ensureMappingsDir();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('list-languages', async () => {
  const dir = path.join(app.getPath('userData'), 'mappings');
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('load-mappings', async (event, lang) => {
  const userFile = path.join(app.getPath('userData'), 'mappings', `${lang}.json`);
  const appFile = path.join(__dirname, 'mappings', `${lang}.json`);
  try {
    if (fsSync.existsSync(userFile)) {
      const txt = await fs.readFile(userFile, 'utf8');
      return JSON.parse(txt);
    }
    if (fsSync.existsSync(appFile)) {
      const txt = await fs.readFile(appFile, 'utf8');
      return JSON.parse(txt);
    }
    return {};
  } catch (e) {
    console.error('load-mappings error', e);
    return {};
  }
});

ipcMain.handle('save-mapping', async (event, lang, from, to) => {
  const dir = path.join(app.getPath('userData'), 'mappings');
  const file = path.join(dir, `${lang}.json`);

  let mappings = {};
  try {
    if (fsSync.existsSync(file)) {
      mappings = JSON.parse(await fs.readFile(file, 'utf8'));
    }
  } catch (e) {
    mappings = {};
  }

  mappings[from] = to;
  await fs.writeFile(file, JSON.stringify(mappings, null, 2), 'utf8');
  return mappings;
});

ipcMain.handle('save-mappings', async (event, lang, mappings) => {
  const dir = path.join(app.getPath('userData'), 'mappings');
  const file = path.join(dir, `${lang}.json`);
  await fs.writeFile(file, JSON.stringify(mappings, null, 2), 'utf8');
  return true;
});

ipcMain.handle('delete-language', async (event, lang) => {
  const file = path.join(app.getPath('userData'), 'mappings', `${lang}.json`);
  try {
    await fs.unlink(file);
    return true;
  } catch (e) {
    console.warn('delete-language failed', e);
    return false;
  }
});
