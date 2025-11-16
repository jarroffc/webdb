// ============================ // script.js — Admin Panel (Client-side) // Backend mode (option 3): gunakan Express backend yang berjalan di API. // Ubah variabel API di bawah kalau servermu di tempat lain. // ============================

const API = (function(){ // Ganti URL ini sesuai alamat server backend (contoh: https://panel.example.com) return localStorage.getItem('API_URL') || 'http://localhost:3000'; })();

// --- Helper UI: toast kecil (non-blocking) --- function makeToastContainer(){ if (document.getElementById('toast-container')) return; const c = document.createElement('div'); c.id = 'toast-container'; c.style.position = 'fixed'; c.style.right = '20px'; c.style.bottom = '20px'; c.style.zIndex = 9999; document.body.appendChild(c); }

function toast(message, type = 'info', ttl = 3500){ makeToastContainer(); const el = document.createElement('div'); el.textContent = message; el.style.marginTop = '8px'; el.style.padding = '10px 14px'; el.style.borderRadius = '10px'; el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'; el.style.fontFamily = "'JetBrains Mono', monospace"; el.style.fontSize = '13px'; el.style.color = '#fff'; el.style.opacity = '0'; el.style.transition = 'opacity .25s ease, transform .25s ease';

switch(type){ case 'success': el.style.background = '#10b981'; break; // green-500 case 'error': el.style.background = '#ef4444'; break;   // red-500 case 'warn': el.style.background = '#f59e0b'; break;    // amber-500 default: el.style.background = '#6366f1'; // purple-500 }

document.getElementById('toast-container').appendChild(el); requestAnimationFrame(()=>{ el.style.opacity = '1'; el.style.transform = 'translateY(-4px)'; }); setTimeout(()=>{ el.style.opacity = '0'; el.style.transform = 'translateY(4px)'; setTimeout(()=>el.remove(), 300); }, ttl); }

// --- Small helpers --- function elm(id){ return document.getElementById(id); } function setDisabled(bool){ elm('btnAdd').disabled = bool; elm('btnDel').disabled = bool; elm('btnList').disabled = bool; }

// --- Core: fetch wrapper that sends password header and handles errors --- async function apiFetch(path, options = {}){ try{ const headers = options.headers || {}; // selalu pakai JSON headers['Content-Type'] = 'application/json';

const res = await fetch(API + path, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });

// Jika response bukan JSON, ambil text (server kerap mengirim pesan singkat)
const text = await res.text();
try{ // coba parse json
  const json = JSON.parse(text);
  if (!res.ok) throw new Error(json.error || JSON.stringify(json));
  return json;
}catch(err){
  if (!res.ok) throw new Error(text || res.statusText);
  // jika berhasil dan bukan json, return raw text
  return text;
}

}catch(e){ throw e; } }

// --- Actions --- async function addNumber(){ const number = elm('number').value.trim(); const pw = elm('pw').value.trim(); if (!number) return toast('Nomor tidak boleh kosong', 'warn'); if (!pw) return toast('Password wajib diisi', 'warn');

try{ setDisabled(true); toast('Mengirim request add...', 'info');

const result = await apiFetch('/add', { method: 'POST', headers: { password: pw }, body: { number } });

// server biasanya mengembalikan JSON
toast('Berhasil menambah nomor', 'success');
elm('number').value = '';
loadList();

}catch(e){ toast('Gagal add: ' + e.message, 'error'); }finally{ setDisabled(false); } }

async function deleteNumber(){ const number = elm('number').value.trim(); const pw = elm('pw').value.trim(); if (!number) return toast('Nomor tidak boleh kosong', 'warn'); if (!pw) return toast('Password wajib diisi', 'warn');

if (!confirm(Hapus nomor ${number} dari database?)) return;

try{ setDisabled(true); toast('Mengirim request delete...', 'info');

const result = await apiFetch('/delete', { method: 'POST', headers: { password: pw }, body: { number } });

toast('Berhasil menghapus nomor', 'success');
elm('number').value = '';
loadList();

}catch(e){ toast('Gagal delete: ' + e.message, 'error'); }finally{ setDisabled(false); } }

async function loadList(){ const pw = elm('pw').value.trim(); if (!pw) return toast('Isi password dulu untuk melihat list', 'warn');

const ul = elm('list'); ul.innerHTML = '<li>Loading...</li>';

try{ setDisabled(true); const data = await apiFetch('/list', { method: 'GET', headers: { password: pw } });

ul.innerHTML = '';
if (!data.nomor || data.nomor.length === 0){
  ul.innerHTML = '<li>Tidak ada nomor dalam database</li>';
  return;
}

// tambahkan tombol copy & delete kecil untuk tiap nomor
data.nomor.forEach(n => {
  const li = document.createElement('li');
  li.className = 'flex justify-between items-center gap-3 py-1';

  const left = document.createElement('div');
  left.textContent = n;

  const right = document.createElement('div');

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.className = 'px-2 py-1 rounded text-sm bg-indigo-500 text-white';
  copyBtn.onclick = () => { navigator.clipboard.writeText(n).then(()=>toast('Disalin ke clipboard','success')); };

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Hapus';
  delBtn.className = 'ml-2 px-2 py-1 rounded text-sm bg-red-500 text-white';
  delBtn.onclick = async () => {
    if (!confirm(`Hapus nomor ${n}?`)) return;
    try{
      setDisabled(true);
      await apiFetch('/delete', { method: 'POST', headers: { password: elm('pw').value.trim() }, body: { number: n } });
      toast('Terhapus', 'success');
      loadList();
    }catch(e){ toast('Gagal hapus: '+e.message,'error'); }
    finally{ setDisabled(false); }
  };

  right.appendChild(copyBtn);
  right.appendChild(delBtn);

  li.appendChild(left);
  li.appendChild(right);

  ul.appendChild(li);
});

}catch(e){ ul.innerHTML = '<li>Gagal load list</li>'; toast('Gagal load list: ' + e.message, 'error'); }finally{ setDisabled(false); } }

// --- Init listeners --- document.addEventListener('DOMContentLoaded', ()=>{ elm('btnAdd').addEventListener('click', addNumber); elm('btnDel').addEventListener('click', deleteNumber); elm('btnList').addEventListener('click', loadList);

// shortcut Enter key untuk input nomor (tambah) elm('number').addEventListener('keydown', (e)=>{ if (e.key === 'Enter') addNumber(); });

// optional: tekan Ctrl+L untuk reload list document.addEventListener('keydown', (e)=>{ if (e.ctrlKey && e.key.toLowerCase() === 'l') loadList(); });

// tampilkan API di console agar developer tahu console.log('Admin panel client initialized. API =', API); });

// --- Utility: allow changing API base quickly via console --- window.__AdminPanel = { setApi(url){ localStorage.setItem('API_URL', url); toast('API updated: '+url,'info'); }, getApi(){ return localStorage.getItem('API_URL') || API } };