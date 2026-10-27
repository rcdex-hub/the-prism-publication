(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DRAFT_KEY = 'prism_cms_local_draft_v1';
  const SETTINGS_KEY = 'prism_cms_repository_v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeImage = value => {
    const v = String(value || '').trim();
    return /^(assets\/images\/[a-zA-Z0-9_./-]+|https:\/\/[^\s"'<>]+)$/.test(v) && !v.includes('../') ? v : 'assets/images/story-placeholder.svg';
  };
  const clone = obj => JSON.parse(JSON.stringify(obj));
  let original = {site:{},items:[]};
  let items = [];
  let selectedId = null;
  let filter = 'all';
  let pending = new Map(); // Temporary image uploads only. Never stores GitHub credentials.
  let busy = false;
  let connectedSha = null;

  function notice(message, isError = false) {
    const el = $('admin-notice');
    el.textContent = message; el.classList.toggle('error', isError); el.hidden = false;
  }
  function result(message, isError = false) {
    const el = $('publish-result'); el.textContent = message; el.style.color = isError ? '#a24131' : '#207348';
  }
  function persist() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(items)); }
    catch { notice('Browser storage is full. Save smaller drafts or publish before closing the page.', true); }
  }
  function pendingCount() { return pending.size; }
  function renderStats() {
    $('admin-stats').innerHTML = [
      ['Published', items.filter(i => i.status === 'published').length],
      ['Feature Stories', items.filter(i => i.type === 'feature').length],
      ['Editorial Cartoons', items.filter(i => i.type === 'cartoon').length],
      ['Local image uploads', pendingCount()]
    ].map(([label,num]) => `<div class="stat"><b>${num}</b><span>${esc(label)}</span></div>`).join('');
  }
  function renderList() {
    const filtered = items.filter(i => filter === 'all' || i.type === filter).slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
    $('filter-chip').textContent = filter === 'all' ? 'All items' : filter === 'cartoon' ? 'Cartoons' : filter.charAt(0).toUpperCase()+filter.slice(1);
    $('admin-list').innerHTML = filtered.length ? filtered.map(item => `<div class="admin-item ${selectedId === item.id ? 'is-selected' : ''}">
        <img src="${esc(safeImage(item.image))}" alt="">
        <div><b>${esc(item.title)}</b><small>${item.type === 'cartoon' ? 'Cartoon' : item.type.charAt(0).toUpperCase()+item.type.slice(1)} · ${esc(item.date)}</small><span class="chip ${item.status === 'published' ? 'published' : 'draft'}">${item.status === 'published' ? 'Published' : 'Draft'}</span>${pending.has(item.id) ? ' <span class="chip neutral">Image pending</span>' : ''}</div>
        <button type="button" data-edit="${esc(item.id)}" aria-label="Edit ${esc(item.title)}">Edit</button></div>`).join('') : `<p class="field-hint">No items in this category. Add one using the button above.</p>`;
    $('admin-list').querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => selectItem(btn.dataset.edit)));
  }
  function render() { renderStats(); renderList(); }
  function showImage(item) {
    const preview = $('image-preview');
    const temporary = pending.get(item.id);
    preview.src = temporary?.dataUrl || safeImage(item.image);
    preview.hidden = false;
    $('image-note').textContent = temporary ? 'Selected image is ready for GitHub upload. Keep this tab open until publishing.' : 'Choose a local JPG, PNG, or WEBP to upload with your next GitHub publish.';
  }
  function selectItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    selectedId = item.id;
    $('editor-title').textContent = 'Edit ' + (item.type === 'cartoon' ? 'Cartoon' : 'Feature Story');
    $('article-id').value = item.id;
    $('article-type').value = item.type;
    $('article-title').value = item.title || '';
    $('article-author').value = item.author || '';
    $('article-date').value = item.date || '';
    $('article-excerpt').value = item.excerpt || '';
    $('article-body').value = Array.isArray(item.body) ? item.body.join('\n\n') : String(item.body || '');
    $('article-caption').value = item.caption || '';
    $('article-image').value = item.image || '';
    $('article-status').value = item.status || 'draft';
    $('article-featured').checked = Boolean(item.featured);
    $('article-file').value = '';
    showImage(item);
    renderList();
  }
  function newItem(type) {
    const date = new Date().toISOString().slice(0,10);
    const item = {id:'draft-'+Date.now(),type,title:'',author:'',date,image:'assets/images/story-placeholder.svg',imageAlt:'',caption:'',excerpt:'',body:[],status:'draft',featured:false};
    items.unshift(item);
    persist();render();selectItem(item.id);
    notice('New item created locally. Fill in its details and select Save local draft.');
    $('article-title').focus();
    if (innerWidth < 760) $('editor-panel').scrollIntoView({behavior:'smooth'});
  }
  function saveItem(event) {
    event.preventDefault();
    const item = items.find(i => i.id === $('article-id').value);
    if (!item) return notice('Select an item to edit.', true);
    if (!$('editor-form').reportValidity()) return;
    item.type = $('article-type').value;
    item.title = $('article-title').value.trim();
    item.author = $('article-author').value.trim();
    item.date = $('article-date').value;
    item.excerpt = $('article-excerpt').value.trim();
    item.body = $('article-body').value.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    item.caption = $('article-caption').value.trim();
    item.image = safeImage($('article-image').value);
    item.imageAlt = item.caption || item.title;
    item.status = $('article-status').value;
    item.featured = $('article-featured').checked;
    persist();render();selectItem(item.id);
    notice('Saved in this browser only. Select Publish saved changes to make it live on GitHub Pages.');
  }
  function removeItem() {
    const item = items.find(i => i.id === $('article-id').value);
    if (!item) return;
    if (!confirm(`Delete "${item.title || 'Untitled'}" from the editorial content? This takes effect publicly only after GitHub publishing.`)) return;
    items = items.filter(i => i.id !== item.id); pending.delete(item.id);
    persist(); render();
    if (items.length) selectItem(items[0].id);
    else {selectedId=null; $('editor-form').reset();$('image-preview').hidden=true;}
    notice('Item deleted from local draft. Publish to remove it from the live site.');
  }
  function restore() {
    if (!confirm('Discard ALL browser-only edits and restore the last loaded website content?')) return;
    items = clone(original.items);pending.clear();localStorage.removeItem(DRAFT_KEY);
    connectedSha = null;
    render();if(items.length)selectItem(items[0].id);
    notice('Local changes discarded. Loaded public website content restored.');
  }
  async function compressImage(file) {
    if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WEBP file.');
    if (file.size > 6 * 1024 * 1024) throw new Error('Use an image smaller than 6 MB.');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve,reject) => {const el = new Image(); el.onload = () => resolve(el);el.onerror = () => reject(new Error('Could not read this image.'));el.src = url;});
      const scale = Math.min(1, 1500 / img.width, 1400 / img.height);
      const canvas = document.createElement('canvas');canvas.width = Math.max(1,Math.round(img.width*scale));canvas.height = Math.max(1,Math.round(img.height*scale));
      const ctx = canvas.getContext('2d');ctx.fillStyle = '#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',.86);
    } finally {URL.revokeObjectURL(url);}
  }
  async function onImageSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const id = $('article-id').value;
    if (!id) {notice('Create or select an entry before adding an image.',true);return;}
    try {
      const dataUrl = await compressImage(file);
      pending.set(id,{dataUrl,name:file.name});
      const item = items.find(i => i.id===id);
      if (item) showImage(item);
      render();
      notice('Image prepared. It will be uploaded when you publish. Keep this editor tab open until then.');
    } catch(err) {event.target.value='';notice(err.message,true);}
  }
  function repoDetails() {
    const owner = $('github-owner').value.trim();
    const repo = $('github-repo').value.trim();
    const branch = $('github-branch').value.trim() || 'main';
    const token = $('github-token').value.trim();
    if (!/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo) || !/^[\w./-]+$/.test(branch) || !token)
      throw new Error('Enter a valid GitHub username, repository name, branch, and access token.');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({owner,repo,branch})); // Never store token.
    return {owner,repo,branch,token};
  }
  function apiUrl(details,path) {
    const p = path.split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(details.owner)}/${encodeURIComponent(details.repo)}/contents/${p}`;
  }
  async function github(details,path,method='GET',body=null) {
    const url = apiUrl(details,path) + (method === 'GET' ? `?ref=${encodeURIComponent(details.branch)}` : '');
    const response = await fetch(url,{
      method,
      headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${details.token}`,'X-GitHub-Api-Version':'2022-11-28',...(body ? {'Content-Type':'application/json'} : {})},
      body: body ? JSON.stringify(body) : undefined,
      cache:'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`GitHub ${response.status}: ${payload.message || 'Request failed'}${response.status === 401 ? ' — check your token.' : ''}`);
    return payload;
  }
  function readBase64Utf8(base64) {
    const raw = atob(base64.replace(/\s/g,''));
    return new TextDecoder().decode(Uint8Array.from(raw, x => x.charCodeAt(0)));
  }
  function base64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  async function checkRepo() {
    const d = repoDetails();
    const remote = await github(d,'site/content/articles.json');
    connectedSha = remote.sha;
    const parsed = JSON.parse(readBase64Utf8(remote.content));
    if (!Array.isArray(parsed.items)) throw new Error('The repository content file has an invalid format.');
    result(`Repository found (${d.owner}/${d.repo}, ${d.branch}).`);
    return {d,remote,parsed};
  }
  function setBusy(value) {
    busy = value;
    $('test-github').disabled=value;
    $('publish-github').disabled=value;
    $('publish-github').textContent=value ? 'Publishing…' : 'Publish saved changes';
  }
  async function testRepo() {
    if (busy) return;
    setBusy(true);result('Checking GitHub connection…');
    try {await checkRepo();notice('GitHub repository connection succeeded. Publishing permissions will be verified when you commit changes.');}
    catch(err) {result(err.message,true);notice(err.message,true);}
    finally {setBusy(false);}
  }
  async function publish() {
    if (busy) return;
    if (!confirm('Publish all saved local changes to your GitHub repository? Published entries will become public after GitHub Pages rebuilds.')) return;
    setBusy(true);result('Checking repository…');
    try {
      // Capture current editor form changes only after Save local draft was used.
      const {d,remote,parsed} = await checkRepo();
      if (JSON.stringify(parsed.items) !== JSON.stringify(original.items)) {
        throw new Error('GitHub content changed since this editor loaded. Reload the editor before publishing to avoid overwriting another editor’s work.');
      }
      const outgoing = clone(items);
      for (const item of outgoing) {
        const staged = pending.get(item.id);
        if (!staged) continue;
        result(`Uploading image for ${item.title || 'untitled entry'}…`);
        const basename = String(item.id).toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,45) || 'new-image';
        const filename = `site/assets/images/uploads/${basename}-${Date.now()}.jpg`;
        await github(d, filename, 'PUT', {
          message:`Add The Prism image: ${item.title || 'New image'}`,
          content:staged.dataUrl.split(',')[1], branch:d.branch
        });
        item.image = filename;
      }
      result('Saving publication content to GitHub…');
      const outgoingData = {...original, items:outgoing};
      await github(d,'site/content/articles.json','PUT',{
        message:'Publish The Prism editorial updates',
        content:base64Utf8(JSON.stringify(outgoingData,null,2)+'\n'),
        sha:remote.sha,branch:d.branch
      });
      original=clone(outgoingData);items=clone(outgoing);pending.clear();localStorage.removeItem(DRAFT_KEY);connectedSha=null;
      render();if(selectedId)selectItem(selectedId);
      result('Published successfully! GitHub Pages will update after deployment.');
      notice('Your GitHub commit succeeded. Check your repository’s Actions / Pages deployment status; the live website may take a short time to reflect changes.');
    } catch(err) {
      result(err.message,true);
      notice('Publish failed: '+err.message,true);
    } finally {setBusy(false);}
  }
  async function start() {
    try {
      const response = await fetch('content/articles.json',{cache:'no-store'});
      if(!response.ok)throw new Error(`Could not load publication JSON (${response.status})`);
      original=await response.json();
      if(!Array.isArray(original.items))throw new Error('Publication data is invalid.');
      items=clone(original.items);
      const stored=localStorage.getItem(DRAFT_KEY);
      if(stored) {
        try {const local=JSON.parse(stored);if(Array.isArray(local)){items=local;notice('Your browser-only draft was recovered. It is not yet public.');}}
        catch {localStorage.removeItem(DRAFT_KEY);}
      }
      const details=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
      $('github-owner').value=details.owner||'';
      $('github-repo').value=details.repo||'';
      $('github-branch').value=details.branch||'main';
      render();if(items.length)selectItem(items[0].id);
    } catch(err) {notice(err.message+'. Admin editing requires the files to be hosted by GitHub Pages or another web server.',true);}
  }
  $('new-feature').addEventListener('click',() => newItem('feature'));
  $('new-cartoon').addEventListener('click',() => newItem('cartoon'));
  $('editor-form').addEventListener('submit',saveItem);
  $('delete-article').addEventListener('click',removeItem);
  $('restore-button').addEventListener('click',restore);
  $('cancel-edit').addEventListener('click',() => { if(items.length)selectItem(items[0].id); });
  $('article-file').addEventListener('change',onImageSelected);
  $('article-image').addEventListener('input',() => {
    const id=$('article-id').value;
    if(pending.has(id)) {pending.delete(id);renderStats();}
    $('image-preview').src=safeImage($('article-image').value);
  });
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click',() => {
    filter=btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('selected',b===btn));renderList();
  }));
  $('show-publishing').addEventListener('click',()=>$('publishing-panel').scrollIntoView({behavior:'smooth'}));
  $('test-github').addEventListener('click',testRepo);
  $('publish-github').addEventListener('click',publish);
  start();
})();