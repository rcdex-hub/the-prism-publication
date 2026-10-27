(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DRAFT_KEY = 'prism_cms_local_draft_v1';
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
  let searchText = '';
  let statusFilter = 'all';
  let pending = new Map(); // Temporary image uploads only. Never stores GitHub credentials.
  let busy = false;
  let connectedSha = null;
  let signedIn = false;
  const EDITOR_OWNER = 'rcdex-hub';
  const EDITOR_REPO = 'the-prism-publication';
  const EDITOR_BRANCH = 'main';

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
      ['Total articles', items.length],
      ['Published', items.filter(i => i.status === 'published').length],
      ['Drafts', items.filter(i => i.status !== 'published').length],
      ['Photos to upload', pendingCount()]
    ].map(([label,num]) => `<div class="stat"><b>${num}</b><span>${esc(label)}</span></div>`).join('');
  }
  function renderList() {
    const matchesType = i => filter === 'all' || (filter === 'drafts' ? i.status !== 'published' : filter === 'news' ? ['news','feature'].includes(i.type) : filter === 'editorial' ? ['editorial','cartoon'].includes(i.type) : i.type === filter);
    const filtered = items.filter(i => matchesType(i) && (statusFilter === 'all' || i.status === statusFilter) && (!searchText || [i.title,i.author,i.excerpt,i.type].some(value => String(value||'').toLowerCase().includes(searchText)))).slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
    const labels={all:'All content',news:'News & Features',editorial:'Editorial & Cartoons',sports:'Sports',gallery:'Homepage Gallery',drafts:'Drafts'};
    $('filter-chip').textContent = labels[filter] || filter;
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
    $('editor-title').textContent = 'Edit ' + (item.type === 'cartoon' ? 'Editorial Cartoon' : item.type === 'gallery' ? 'Gallery Photo' : 'Article');
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
    const item = {id:'draft-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),type,title:'',author:'',date,image:'assets/images/story-placeholder.svg',imageAlt:'',caption:'',excerpt:'',body:[],status:'draft',featured:false};
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
    notice('Saved in this browser only. Use Publish saved changes to commit to GitHub and trigger Vercel.');
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
    if (!signedIn) throw new Error('Sign in as an authorized GitHub editor first.');
    const token = $('github-token').value.trim();
    if (!token) throw new Error('Session expired. Sign in again to publish.');
    return {owner:EDITOR_OWNER,repo:EDITOR_REPO,branch:EDITOR_BRANCH,token};
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
    if (!confirm('Publish all saved local changes to GitHub? Published entries will appear after Vercel deploys.')) return;
    setBusy(true);result('Checking repository…');
    try {
      // Capture current editor form changes only after Save local draft was used.
      const {d,remote,parsed} = await checkRepo();
      if (JSON.stringify(parsed.items) !== JSON.stringify(original.items)) {
        throw new Error('GitHub content changed since this editor loaded. Reload the editor before publishing to avoid overwriting another editor’s work.');
      }
      const outgoing = clone(items);
      for (const item of outgoing) {
        if (!item.id || !item.title?.trim() || !item.author?.trim() || !item.date || !item.excerpt?.trim() || !Array.isArray(item.body) || !item.body.length) {
          throw new Error('Complete and save every entry, including new drafts, before publishing. Missing details: '+(item.title||item.id||'Untitled'));
        }
      }
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
        item.image = filename.replace(/^site\//,''); // public path is relative to Vercel outputDirectory=site
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
      result('Published successfully! Vercel will deploy the new content.');
      notice('GitHub accepted your changes. Check the Vercel deployment; once Ready, the public website will show the updated articles.');
    } catch(err) {
      result(err.message,true);
      notice('Publish failed: '+err.message,true);
    } finally {setBusy(false);}
  }
  async function start() {
    if (!signedIn) return;
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
      $('github-owner').value=EDITOR_OWNER;
      $('github-repo').value=EDITOR_REPO;
      $('github-branch').value=EDITOR_BRANCH;
      render();if(items.length)selectItem(items[0].id);
    } catch(err) {notice(err.message+'. CMS requires a website served over HTTPS or localhost.',true);}
  }
  $('new-feature').addEventListener('click',() => newItem('news'));
  $('new-gallery').addEventListener('click',() => newItem('gallery'));
  $('new-cartoon').addEventListener('click',() => newItem('cartoon'));
  $('editor-form').addEventListener('submit',saveItem);
  $('delete-article').addEventListener('click',removeItem);
  $('restore-button').addEventListener('click',restore);
  $('search-content').addEventListener('input',e=>{searchText=e.target.value.toLowerCase().trim();renderList();});
  $('status-filter').addEventListener('change',e=>{statusFilter=e.target.value;renderList();});
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
  $('export-draft').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({...original,items},null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='the-prism-content-backup.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice('A JSON backup of your current local edits has been exported.');
  });
  $('preview-article').addEventListener('click',()=>{
    const title=$('article-title').value.trim()||'Untitled article';
    const author=$('article-author').value.trim()||'Unknown author';
    const date=$('article-date').value;
    const body=$('article-body').value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    const caption=$('article-caption').value.trim();
    const src=pending.get($('article-id').value)?.dataUrl||safeImage($('article-image').value);
    $('preview-content').innerHTML='<span class="chip neutral">Unpublished preview</span><h2>'+esc(title)+'</h2><p class="cms-preview-meta">By '+esc(author)+' · '+esc(date||'Date not set')+'</p><figure><img alt="'+esc(caption||title)+'" src="'+esc(src)+'"><figcaption>'+esc(caption)+'</figcaption></figure>'+body.map(p=>'<p>'+esc(p)+'</p>').join('');
    const dialog=$('preview-dialog'); if(dialog.showModal)dialog.showModal(); else dialog.setAttribute('open','');
  });
  $('close-preview').addEventListener('click',()=>$('preview-dialog').close());
  $('test-github').addEventListener('click',testRepo);
  $('publish-github').addEventListener('click',publish);

  async function signIn(event) {
    event.preventDefault();
    const token=$('cms-access-token').value.trim();
    const button=$('cms-access-submit');
    if (!token) return;
    button.disabled=true;button.textContent='Checking GitHub permissions…';
    $('cms-access-error').hidden=true;
    try {
      const headers={
        Accept:'application/vnd.github+json',
        Authorization:'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28'
      };
      const [identityResponse,repoResponse]=await Promise.all([
        fetch('https://api.github.com/user',{headers,cache:'no-store'}),
        fetch('https://api.github.com/repos/'+EDITOR_OWNER+'/'+EDITOR_REPO,{headers,cache:'no-store'})
      ]);
      if(!identityResponse.ok||!repoResponse.ok) {
        throw new Error('GitHub could not verify this token. Check that it is active and permitted for The Prism repository.');
      }
      const [identity,repository]=await Promise.all([identityResponse.json(),repoResponse.json()]);
      if(!identity.login||repository.full_name?.toLowerCase()!==(EDITOR_OWNER+'/'+EDITOR_REPO).toLowerCase()||repository.permissions?.push!==true){
        throw new Error('This GitHub account does not have write access to The Prism repository.');
      }
      // This is an in-memory client gate, not a server-side session.
      signedIn=true;
      $('github-token').value=token;
      $('cms-access-token').value='';
      $('cms-editor-identity').textContent='Verified GitHub editor: @'+identity.login;
      $('cms-workspace').hidden=false;
      $('cms-access').hidden=true;
      await start();
    }catch(error){
      signedIn=false;
      $('github-token').value='';
      const message=error instanceof TypeError?'Cannot connect to GitHub. Check your internet connection and try again.':error.message;
      $('cms-access-error').textContent=message;
      $('cms-access-error').hidden=false;
    }finally{button.disabled=false;button.textContent='Verify access & open dashboard';}
  }
  function signOut(){
    if (pending.size && !confirm('Unpublished photo uploads will be lost when you sign out. Browser text drafts stay saved. Sign out?')) return;
    signedIn=false;connectedSha=null;pending.clear();
    $('github-token').value='';
    $('cms-access-token').value='';
    $('cms-workspace').hidden=true;
    $('cms-access').hidden=false;
    $('cms-editor-identity').textContent='';
    $('cms-access-error').hidden=true;
    window.scrollTo({top:0,behavior:'instant'});
  }
  $('cms-access-form').addEventListener('submit',signIn);
  $('cms-sign-out').addEventListener('click',signOut);
})();