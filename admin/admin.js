// ── Config ───────────────────────────────────────────────────
const REPO    = 'jonyphan5210-collab/joshuaphangruber.com';
const BRANCH  = 'main';
// SHA-256 of "JoshJPG2026!" -- change password by updating this hash
const PW_HASH = '03ac0f5d7f1a93c866bb13ace0bbad8582ec937ccc1284210041a5404b281c43';


// ── State ────────────────────────────────────────────────────
let nowData     = [];
let writingData = [];
let nowSha      = '';
let writingSha  = '';


// ── Screens ──────────────────────────────────────────────────
function show(id) {
  ['screen-login','screen-token','screen-admin'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}


// ── Crypto ──────────────────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}


// ── Auth ─────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pw  = document.getElementById('password').value;
  const err = document.getElementById('login-error');
  const hash = await sha256(pw);
  if (hash !== PW_HASH) {
    err.textContent = 'Incorrect password.';
    return;
  }
  sessionStorage.setItem('jpg_admin_ok', '1');
  err.textContent = '';
  checkToken();
});

function checkToken() {
  const tok = localStorage.getItem('jpg_gh_token');
  if (tok) {
    initAdmin();
  } else {
    show('screen-token');
  }
}

document.getElementById('token-form').addEventListener('submit', async e => {
  e.preventDefault();
  const tok = document.getElementById('gh-token').value.trim();
  const err = document.getElementById('token-error');
  if (!tok.startsWith('ghp_') && !tok.startsWith('github_pat_')) {
    err.textContent = 'That doesn\'t look like a valid token.';
    return;
  }
  localStorage.setItem('jpg_gh_token', tok);
  err.textContent = '';
  initAdmin();
});

document.getElementById('btn-logout').addEventListener('click', () => {
  sessionStorage.removeItem('jpg_admin_ok');
  show('screen-login');
  document.getElementById('password').value = '';
});

// Resume session if already logged in
if (sessionStorage.getItem('jpg_admin_ok')) {
  checkToken();
} else {
  show('screen-login');
}


// ── GitHub API ───────────────────────────────────────────────
function token() { return localStorage.getItem('jpg_gh_token') || ''; }

async function ghGet(path) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `token ${token()}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) throw new Error(`GitHub GET failed: ${r.status}`);
  return r.json();
}

async function ghPut(path, content, sha, message) {
  const body = { message, content: btoa(unescape(encodeURIComponent(content))), sha, branch: BRANCH };
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token()}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.message || `GitHub PUT failed: ${r.status}`);
  }
  return r.json();
}

function decodeGhContent(content) {
  return decodeURIComponent(escape(atob(content.replace(/\n/g, ''))));
}


// ── Init ─────────────────────────────────────────────────────
async function initAdmin() {
  show('screen-admin');
  await Promise.all([loadNow(), loadWriting()]);
}


// ── Now ──────────────────────────────────────────────────────
async function loadNow() {
  try {
    const file = await ghGet('data/now.json');
    nowSha  = file.sha;
    nowData = JSON.parse(decodeGhContent(file.content));
    renderNowList();
  } catch (e) {
    document.getElementById('now-list').innerHTML = `<p class="entry-empty">Error loading: ${e.message}</p>`;
  }
}

async function saveNow(statusEl) {
  setStatus(statusEl, 'Saving...', '');
  try {
    const result = await ghPut('data/now.json', JSON.stringify(nowData, null, 2), nowSha, 'Update now.json');
    nowSha = result.content.sha;
    setStatus(statusEl, 'Saved! Site will update in ~30 seconds.', 'success');
  } catch (e) {
    setStatus(statusEl, 'Error: ' + e.message, 'error');
  }
}

function renderNowList() {
  const el = document.getElementById('now-list');
  if (!nowData.length) {
    el.innerHTML = '<p class="entry-empty">No entries yet.</p>';
    return;
  }
  el.innerHTML = nowData.map((e, i) => `
    <div class="entry-item" data-index="${i}">
      ${e.thumb
        ? `<img class="entry-thumb" src="${e.thumb}" alt="" onerror="this.style.display='none'">`
        : `<div class="entry-thumb-placeholder"></div>`}
      <div class="entry-info">
        <span class="entry-tag tag-${e.tag}">${e.tag}</span>
        <div class="entry-title">${e.title}</div>
      </div>
      <div class="entry-actions">
        <button class="btn-edit" onclick="editNow(${i})">Edit</button>
        <button class="btn-delete" onclick="deleteNow(${i})">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-add-now').addEventListener('click', () => openNowForm());

document.getElementById('btn-now-cancel').addEventListener('click', () => {
  document.getElementById('now-form-wrap').classList.add('hidden');
  clearNowForm();
});

document.getElementById('now-thumb').addEventListener('input', function() {
  const prev = document.getElementById('now-thumb-preview');
  prev.innerHTML = this.value ? `<img src="${this.value}" alt="">` : '';
});

document.getElementById('btn-now-save').addEventListener('click', async () => {
  const statusEl = document.getElementById('now-status');
  const title = document.getElementById('now-title').value.trim();
  const body  = document.getElementById('now-body').value.trim();
  if (!title || !body) { setStatus(statusEl, 'Title and note are required.', 'error'); return; }

  const editId = document.getElementById('now-edit-id').value;
  const entry = {
    id:    editId || slugify(title),
    tag:   document.getElementById('now-tag').value,
    title,
    url:   document.getElementById('now-url').value.trim(),
    thumb: document.getElementById('now-thumb').value.trim(),
    body
  };

  if (editId) {
    const idx = nowData.findIndex(e => e.id === editId);
    if (idx >= 0) nowData[idx] = entry;
  } else {
    nowData.unshift(entry);
  }

  renderNowList();
  await saveNow(statusEl);
  document.getElementById('now-form-wrap').classList.add('hidden');
  clearNowForm();
});

function openNowForm(entry = null) {
  const wrap = document.getElementById('now-form-wrap');
  document.getElementById('now-form-title').textContent = entry ? 'Edit entry' : 'New entry';
  document.getElementById('now-edit-id').value  = entry ? entry.id    : '';
  document.getElementById('now-tag').value       = entry ? entry.tag   : 'reading';
  document.getElementById('now-title').value     = entry ? entry.title : '';
  document.getElementById('now-url').value       = entry ? entry.url   : '';
  document.getElementById('now-thumb').value     = entry ? entry.thumb : '';
  document.getElementById('now-body').value      = entry ? entry.body  : '';
  document.getElementById('now-thumb-preview').innerHTML = entry && entry.thumb ? `<img src="${entry.thumb}" alt="">` : '';
  document.getElementById('now-status').textContent = '';
  wrap.classList.remove('hidden');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearNowForm() {
  ['now-edit-id','now-title','now-url','now-thumb','now-body'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('now-tag').value = 'reading';
  document.getElementById('now-thumb-preview').innerHTML = '';
  document.getElementById('now-status').textContent = '';
}

window.editNow = function(i) { openNowForm(nowData[i]); };

window.deleteNow = async function(i) {
  if (!confirm(`Delete "${nowData[i].title}"?`)) return;
  nowData.splice(i, 1);
  renderNowList();
  const statusEl = document.getElementById('now-status');
  document.getElementById('now-form-wrap').classList.add('hidden');
  await saveNow(statusEl);
  document.getElementById('now-status').textContent = '';
};


// ── Writing ──────────────────────────────────────────────────
async function loadWriting() {
  try {
    const file = await ghGet('data/writing.json');
    writingSha  = file.sha;
    writingData = JSON.parse(decodeGhContent(file.content));
    renderWritingList();
  } catch (e) {
    document.getElementById('writing-list').innerHTML = `<p class="entry-empty">Error loading: ${e.message}</p>`;
  }
}

async function saveWriting(statusEl) {
  setStatus(statusEl, 'Saving...', '');
  try {
    const result = await ghPut('data/writing.json', JSON.stringify(writingData, null, 2), writingSha, 'Update writing.json');
    writingSha = result.content.sha;
    setStatus(statusEl, 'Saved! Site will update in ~30 seconds.', 'success');
  } catch (e) {
    setStatus(statusEl, 'Error: ' + e.message, 'error');
  }
}

function renderWritingList() {
  const el = document.getElementById('writing-list');
  if (!writingData.length) {
    el.innerHTML = '<p class="entry-empty">No posts yet.</p>';
    return;
  }
  el.innerHTML = writingData.map((p, i) => `
    <div class="entry-item" data-index="${i}">
      <div class="entry-thumb-placeholder"></div>
      <div class="entry-info">
        <div class="entry-title">${p.title}</div>
        <div class="entry-date">${p.date}</div>
      </div>
      <div class="entry-actions">
        <button class="btn-edit" onclick="editPost(${i})">Edit</button>
        <button class="btn-delete" onclick="deletePost(${i})">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-add-post').addEventListener('click', () => openWritingForm());

document.getElementById('btn-writing-cancel').addEventListener('click', () => {
  document.getElementById('writing-form-wrap').classList.add('hidden');
  clearWritingForm();
});

document.getElementById('btn-writing-save').addEventListener('click', async () => {
  const statusEl = document.getElementById('writing-status');
  const title = document.getElementById('writing-title').value.trim();
  const date  = document.getElementById('writing-date').value.trim();
  const desc  = document.getElementById('writing-desc').value.trim();
  const raw   = document.getElementById('writing-body').value.trim();

  if (!title || !date || !desc || !raw) {
    setStatus(statusEl, 'All fields are required.', 'error');
    return;
  }

  // Convert blank-line-separated paragraphs to <p> tags
  const body = raw.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, ' ').trim()}</p>`).join('');

  const editSlug = document.getElementById('writing-edit-slug').value;
  const post = {
    slug:        editSlug || slugify(title),
    title, date, description: desc, body
  };

  if (editSlug) {
    const idx = writingData.findIndex(p => p.slug === editSlug);
    if (idx >= 0) writingData[idx] = post;
  } else {
    writingData.unshift(post);
  }

  renderWritingList();
  await saveWriting(statusEl);
  document.getElementById('writing-form-wrap').classList.add('hidden');
  clearWritingForm();
});

function openWritingForm(post = null) {
  const wrap = document.getElementById('writing-form-wrap');
  document.getElementById('writing-form-title').textContent = post ? 'Edit post' : 'New post';
  document.getElementById('writing-edit-slug').value = post ? post.slug        : '';
  document.getElementById('writing-title').value     = post ? post.title       : '';
  document.getElementById('writing-date').value      = post ? post.date        : '';
  document.getElementById('writing-desc').value      = post ? post.description : '';

  // Convert <p> tags back to plain paragraphs for editing
  const rawBody = post
    ? post.body.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n').trim()
    : '';
  document.getElementById('writing-body').value = rawBody;
  document.getElementById('writing-status').textContent = '';

  wrap.classList.remove('hidden');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearWritingForm() {
  ['writing-edit-slug','writing-title','writing-date','writing-desc','writing-body'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('writing-status').textContent = '';
}

window.editPost = function(i) { openWritingForm(writingData[i]); };

window.deletePost = async function(i) {
  if (!confirm(`Delete "${writingData[i].title}"?`)) return;
  writingData.splice(i, 1);
  renderWritingList();
  const statusEl = document.getElementById('writing-status');
  document.getElementById('writing-form-wrap').classList.add('hidden');
  await saveWriting(statusEl);
  document.getElementById('writing-status').textContent = '';
};


// ── Helpers ──────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className = 'form-status' + (type ? ' ' + type : '');
}
