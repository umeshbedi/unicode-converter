const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listLanguages: () => ipcRenderer.invoke('list-languages'),
  loadMappings: (lang) => ipcRenderer.invoke('load-mappings', lang),
  saveMapping: (lang, from, to) => ipcRenderer.invoke('save-mapping', lang, from, to),
  saveMappings: (lang, mappings) => ipcRenderer.invoke('save-mappings', lang, mappings),
  deleteLanguage: (lang) => ipcRenderer.invoke('delete-language', lang)
});
