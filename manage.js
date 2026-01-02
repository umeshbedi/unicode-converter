const $ = (id) => document.getElementById(id);

let mappings = {};
let currentLang = 'default';

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

async function refreshLanguages() {
  const langs = await window.api.listLanguages();
  const sel = $('languageSelect');
  sel.innerHTML = '';
  langs.forEach(l=>{
    const opt = document.createElement('option'); opt.value = l; opt.textContent = l;
    sel.appendChild(opt);
  });
  if (langs.length>0) {
    currentLang = langs[0];
    sel.value = currentLang;
    await loadMappings(currentLang);
  } else {
    currentLang = 'default';
    $('langLabel').textContent = currentLang;
    mappings = {};
    renderMappingsList();
  }
}

async function loadMappings(lang) {
  mappings = await window.api.loadMappings(lang);
  currentLang = lang;
  $('langLabel').textContent = lang;
  renderMappingsList();
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await refreshLanguages();

  $('backBtn').onclick = ()=>{ window.location = 'index.html'; };

  $('createLangBtn').onclick = async ()=>{
    const newLang = $('newLanguageInput').value.trim();
    if (!newLang) return alert('Enter a language id');
    await window.api.saveMappings(newLang, {});
    $('newLanguageInput').value='';
    await refreshLanguages();
  };

  $('languageSelect').onchange = async (e)=>{
    await loadMappings(e.target.value);
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

  $('uploadBtn').onclick = async ()=>{
    const fileInput = $('fileInput');
    if (!fileInput.files || fileInput.files.length===0) return alert('Select a JSON file');
    const file = fileInput.files[0];
    const text = await file.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return alert('Invalid JSON'); }
    await window.api.saveMappings(currentLang, parsed);
    await loadMappings(currentLang);
    fileInput.value = '';
  };

  $('exportBtn').onclick = async ()=>{
    const data = await window.api.loadMappings(currentLang);
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentLang}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  $('deleteLangBtn').onclick = async ()=>{
    const ok = confirm(`Delete language file for "${currentLang}"? This cannot be undone.`);
    if (!ok) return;
    const res = await window.api.deleteLanguage(currentLang);
    if (!res) return alert('Delete failed');
    await refreshLanguages();
  };
});
