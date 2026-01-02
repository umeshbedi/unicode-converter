// Renderer process

const $ = (id) => document.getElementById(id);

let mappings = {};
let currentLang = 'default';

// Session persistence (localStorage)
const SESSION_KEY = 'uc:session';
function saveSessionIndex() {
  try {
    const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    sess.index = sess.index || {};
    const inputEl = $('inputText');
    const outputEl = $('outputText');
    const dirEl = $('directionSelect');
    sess.index.currentLang = currentLang;
    if (inputEl) sess.index.input = inputEl.value;
    if (outputEl) sess.index.output = outputEl.value;
    if (dirEl) sess.index.direction = dirEl.value;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
  } catch (e) { console.warn('saveSessionIndex failed', e); }
}

function loadSessionIndex() {
  try {
    const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    return sess.index || {};
  } catch (e) { return {}; }
}

async function listLanguages() {
  const langs = await window.api.listLanguages();
  return langs;
}

function renderLanguageOptions(langs) {
  const sel = $('languageSelect');
  sel.innerHTML = '';
  langs.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = l;
    sel.appendChild(opt);
  });
  if (!langs.includes(currentLang)) currentLang = langs[0] || 'default';
  sel.value = currentLang;
}

async function loadMappings(lang) {
  mappings = await window.api.loadMappings(lang);
  currentLang = lang;
  renderMappingsList();
}

function renderMappingsList() {
  const container = $('mappingsList');
  container.innerHTML = '';
  const keys = Object.keys(mappings).sort((a,b)=>b.length - a.length);
  if (keys.length === 0) {
    container.textContent = '(no mappings yet)';
    return;
  }
  const table = document.createElement('table');
  keys.forEach(k=>{
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = k;
    const td2 = document.createElement('td'); td2.textContent = mappings[k];
    const td3 = document.createElement('td');
    const del = document.createElement('button'); del.textContent = 'Delete';
    del.onclick = async ()=>{
      delete mappings[k];
      await window.api.saveMappings(currentLang, mappings);
      renderMappingsList();
    };
    td3.appendChild(del);
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    table.appendChild(tr);
  });
  container.appendChild(table);
}

function convertText(text, direction='toUnicode') {
  if (!mappings || Object.keys(mappings).length === 0) return text;
  let map = mappings;
  if (direction === 'fromUnicode') {
    map = {};
    Object.keys(mappings).forEach(k=>{ map[mappings[k]] = k; });
  }
  // Sort keys by length desc to prefer longer matches
  const keys = Object.keys(map).sort((a,b)=>b.length - a.length);
  let out = text;
  for (const k of keys) {
    if (!k) continue;
    // escape for regexp
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(esc, 'g');
    out = out.replace(re, map[k]);
  }
  return out;
}

window.addEventListener('DOMContentLoaded', async ()=>{
  const langs = await listLanguages();
  if (langs.length === 0) {
    // Ensure default exists
    await window.api.saveMappings('default', {});
  }
  const updatedLangs = await listLanguages();
  // restore session if available
  const sess = loadSessionIndex();
  if (sess && sess.currentLang && updatedLangs.includes(sess.currentLang)) {
    currentLang = sess.currentLang;
  }
  renderLanguageOptions(updatedLangs);
  if (updatedLangs.length>0) await loadMappings(currentLang || updatedLangs[0]);

  // restore input/output/direction
  try {
    const inputEl = $('inputText'); const outputEl = $('outputText'); const dirEl = $('directionSelect');
    if (sess.input && inputEl) inputEl.value = sess.input;
    if (sess.output && outputEl) outputEl.value = sess.output;
    if (sess.direction && dirEl) dirEl.value = sess.direction;
  } catch(e){}

  $('createLangBtn').onclick = async ()=>{
    const newLang = $('newLanguageInput').value.trim();
    if (!newLang) return alert('Enter a language id');
    await window.api.saveMappings(newLang, {});
    const updated = await listLanguages();
    renderLanguageOptions(updated);
    $('newLanguageInput').value='';
  };

  // Navigate to language management page
  const manageBtn = $('manageBtn');
  if (manageBtn) {
    manageBtn.onclick = ()=>{
      window.location = 'manage.html';
    };
  }

  $('languageSelect').onchange = async (e)=>{
    const lang = e.target.value;
    await loadMappings(lang);
    saveSessionIndex();
  };

  $('addMappingBtn').onclick = async ()=>{
    const from = $('fromInput').value;
    const to = $('toInput').value;
    if (!from) return alert('from is required');
    mappings[from] = to;
    await window.api.saveMappings(currentLang, mappings);
    $('fromInput').value=''; $('toInput').value='';
    renderMappingsList();
  };

  // save input live (debounced)
  const inputEl = $('inputText');
  if (inputEl) {
    let inputTimer = null;
    inputEl.addEventListener('input', ()=>{
      clearTimeout(inputTimer);
      inputTimer = setTimeout(()=> saveSessionIndex(), 400);
    });
  }

  const convertBtnEl = $('convertBtn');
  if (convertBtnEl) {
    convertBtnEl.addEventListener('click', ()=>{
      const input = $('inputText').value;
      const dir = $('directionSelect').value;
      const out = convertText(input, dir);
      $('outputText').value = out;
      saveSessionIndex();
    });
  }

  window.addEventListener('beforeunload', ()=>{
    saveSessionIndex();
  });

  $('refreshBtn').onclick = async ()=>{
    await loadMappings(currentLang);
  };

});

// Copy output to clipboard
document.getElementById("copyBtn").addEventListener("click", () => {
  const output = document.getElementById("outputText");

  output.select();
  output.setSelectionRange(0, 999999); // Windows fix

  navigator.clipboard.writeText(output.value);
});
