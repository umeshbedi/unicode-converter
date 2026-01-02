const $ = (id) => document.getElementById(id);

let mappings = {};
let currentLang = 'default';
let editingKey = null; // if set, indicates a key being edited/renamed
// Session persistence for manage page
const SESSION_KEY = 'uc:session';
function saveSessionManage(){
  try{
    const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    sess.manage = sess.manage || {};
    sess.manage.currentLang = currentLang;
    const s = $('searchInput'); const f = $('fromInput'); const t = $('toInput');
    if (s) sess.manage.search = s.value;
    if (f) sess.manage.from = f.value;
    if (t) sess.manage.to = t.value;
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
  }catch(e){console.warn('saveSessionManage failed', e)}
}

function loadSessionManage(){ try{ const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); return sess.manage || {}; }catch(e){return{}} }

function matchesFilter(key, value, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  return (key && key.toLowerCase().includes(t)) || (value && value.toLowerCase().includes(t));
}

function renderMappingsList() {
  const container = $('mappingsList');
  container.innerHTML = '';
  const searchTerm = $('searchInput') ? $('searchInput').value.trim() : '';
  const keys = Object.keys(mappings).sort((a,b)=>b.length - a.length).filter(k=>matchesFilter(k, mappings[k], searchTerm));
  if (keys.length === 0) {
    container.textContent = '(no mappings yet)';
    return;
  }
  const table = document.createElement('table');
  table.className = 'min-w-full divide-y divide-slate-100';
  keys.forEach(k=>{
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = k;
    td1.className = 'px-4 py-3 text-sm font-medium text-slate-800';
    const td2 = document.createElement('td'); td2.textContent = mappings[k];
    td2.className = 'px-4 py-3 text-sm text-slate-600';
    const td3 = document.createElement('td'); td3.className = 'px-4 py-3 text-right space-x-2';
    const edit = document.createElement('button'); edit.textContent = 'Edit';
    edit.className = 'bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded text-sm';
    edit.onclick = ()=>{
      // populate inputs for editing
      $('fromInput').value = k;
      $('toInput').value = mappings[k] || '';
      editingKey = k;
      // enable Update button
      const upd = $('updateMappingBtn'); if (upd) upd.disabled = false;
    };
    const del = document.createElement('button'); del.textContent = 'Delete';
    del.className = 'bg-rose-500 hover:bg-rose-600 text-white px-2 py-1 rounded text-sm';
    del.onclick = async ()=>{
      delete mappings[k];
      await window.api.saveMappings(currentLang, mappings);
      renderMappingsList();
    };
    td3.appendChild(edit);
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
    // restore previous selection if present
    const sess = loadSessionManage();
    currentLang = sess.currentLang && langs.includes(sess.currentLang) ? sess.currentLang : langs[0];
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
  editingKey = null;
  const upd = $('updateMappingBtn'); if (upd) upd.disabled = true;
  renderMappingsList();
  // restore manage inputs from session
  try{
    const sess = loadSessionManage();
    const sEl = $('searchInput'); const fEl = $('fromInput'); const tEl = $('toInput');
    if (sess.search && sEl) sEl.value = sess.search;
    if (sess.from && fEl) fEl.value = sess.from;
    if (sess.to && tEl) tEl.value = sess.to;
  }catch(e){}
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
    saveSessionManage();
  };

  $('languageSelect').onchange = async (e)=>{
    await loadMappings(e.target.value);
    saveSessionManage();
  };

  $('addMappingBtn').onclick = async ()=>{
    const from = $('fromInput').value;
    const to = $('toInput').value;
    if (!from) return alert('from is required');
    mappings[from] = to;
    await window.api.saveMappings(currentLang, mappings);
    $('fromInput').value=''; $('toInput').value='';
    editingKey = null;
    const upd = $('updateMappingBtn'); if (upd) upd.disabled = true;
    renderMappingsList();
    saveSessionManage();
  };

  // Update mapping (rename or change value)
  const updateBtn = $('updateMappingBtn');
  if (updateBtn) {
    updateBtn.onclick = async ()=>{
      if (!editingKey) return alert('No mapping selected to update');
      const from = $('fromInput').value;
      const to = $('toInput').value;
      if (!from) return alert('from is required');
      // if key changed, remove old
      if (from !== editingKey) delete mappings[editingKey];
      mappings[from] = to;
      await window.api.saveMappings(currentLang, mappings);
      editingKey = null;
      $('fromInput').value=''; $('toInput').value='';
      updateBtn.disabled = true;
      renderMappingsList();
    };
  }

  $('searchInput').addEventListener('input', ()=>{
    renderMappingsList();
    saveSessionManage();
  });
  $('clearSearchBtn').onclick = ()=>{ const s = $('searchInput'); if (s) { s.value=''; renderMappingsList(); } };

  $('uploadBtn').onclick = async ()=>{
    const ok = confirm(`It will replace all mappings for "${currentLang}". This cannot be undone.`);
    if (!ok) return;
    const fileInput = $('fileInput');
    if (!fileInput.files || fileInput.files.length===0) return alert('Select a JSON file');
    const file = fileInput.files[0];
    const text = await file.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return alert('Invalid JSON'); }
    await window.api.saveMappings(currentLang, parsed);
    await loadMappings(currentLang);
    fileInput.value = '';
    saveSessionManage();
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

  window.addEventListener('beforeunload', ()=>{
    saveSessionManage();
  });
});
