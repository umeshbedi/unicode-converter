// Renderer process

const $ = (id) => document.getElementById(id);

let mappings = {};
let currentLang = 'default';

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
  renderLanguageOptions(updatedLangs);
  if (updatedLangs.length>0) await loadMappings(updatedLangs[0]);

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

  $('convertBtn').onclick = ()=>{
    const input = $('inputText').value;
    const dir = $('directionSelect').value;
    const out = convertText(input, dir);
    $('outputText').value = out;
  };

  $('refreshBtn').onclick = async ()=>{
    await loadMappings(currentLang);
  };

});
