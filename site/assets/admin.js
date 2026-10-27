(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DRAFT_KEY = 'prism_cms_local_draft_v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeImage = value => {
    const v = String(value || '').trim();
    return /^(assets\/images\/[a-zA-Z0-9_./-]+|https:\/\/[^\s"'<>]+)$/.test(v) && !v.includes('../') ? (v.startsWith('assets/')?'/'+v:v) : '/assets/images/story-placeholder.svg';
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
  let signedIn = true;
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
  async function cmsApi(action,payload) {
    const response=await fetch('/api/cms?action='+encodeURIComponent(action),{
      method:payload===undefined?'GET':'POST',cache:'no-store',credentials:'same-origin',
      headers:payload===undefined?{}:{'Content-Type':'application/json'},
      body:payload===undefined?undefined:JSON.stringify(payload)
    });
    const data=await response.json().catch(()=>({}));
    if(response.status===401){location.replace('/admin.html');throw new Error('Please sign in again.');}
    if(!response.ok)throw new Error(data.error||'CMS server error ('+response.status+')');
    return data;
  }
  async function checkRepo(){
    const remote=await cmsApi('content');
    connectedSha=remote.sha;
    const parsed=remote.data;
    if(!Array.isArray(parsed?.items))throw new Error('Invalid remote articles');
    result('Publishing permissions verified by the server.');
    return {remote,parsed};
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
  async function publish(){
    if(busy)return;
    if(!confirm('Publish approved articles? Unpublished drafts remain on this device.'))return;
    setBusy(true);result('Checking published content…');
    try{
      const {remote,parsed}=await checkRepo();
      if(JSON.stringify(parsed.items)!==JSON.stringify(original.items))
        throw new Error('Website articles changed elsewhere. Reload and reconcile your edits before publishing.');
      const outgoing=clone(items);
      const published=outgoing.filter(i=>i.status==='published');
      const drafts=outgoing.filter(i=>i.status!=='published');
      for(const item of published){
        if(!item.id||!item.title?.trim()||!item.author?.trim()||!item.date||!item.excerpt?.trim()||!Array.isArray(item.body)||!item.body.length)
          throw new Error('Complete this article before publishing: '+(item.title||item.id||'Untitled'));
        const staged=pending.get(item.id);
        if(staged){result('Uploading photo for '+item.title+'…'); const uploaded=await cmsApi('upload',{id:item.id,dataUrl:staged.dataUrl});item.image=uploaded.path;}
      }
      result('Publishing approved articles…');
      await cmsApi('publish',{items:published,expectedSha:remote.sha});
      original={...parsed,items:published};
      items=[...drafts,...published];pending.clear();connectedSha=null;
      if(drafts.length)persist();else localStorage.removeItem(DRAFT_KEY);
      render();if(items.find(i=>i.id===selectedId))selectItem(selectedId);
      result('Published to GitHub. Vercel will deploy the website.');
      notice('Published entries were updated. Unpublished browser drafts remain local on this device.');
    }catch(error){result(error.message,true);notice('Publish failed: '+error.message,true);}
    finally{setBusy(false);}
  }
  async function start() {
    if (!signedIn) return;
    try {
      const response=await fetch('/api/auth?action=session',{cache:'no-store',credentials:'same-origin'});
      if(!response.ok){location.replace('/admin.html');return;}
      const identity=await response.json();
      const isAdmin=identity.role==='admin';
      $('cms-editor-identity').textContent='Signed in: '+identity.user+' · '+(isAdmin?'Administrator':'Editor');
      if(!isAdmin){
        $('publish-github').disabled=true;
        $('test-github').disabled=true;
        $('show-publishing').disabled=true;
        $('publishing-panel').hidden=true;
        $('publish-result').textContent='Editor role: drafts and previews only. Ask an administrator to publish approved work.';
      }
      const remote=await cmsApi('content');
      if(isAdmin&&!remote.canPublish){
        $('publish-github').disabled=true;
        $('publish-result').textContent='Publishing is not yet configured. Set CMS_GITHUB_TOKEN in Vercel to activate publishing.';
      }
      original=remote.data;
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

  async function signOut(){
    if(pending.size&&!confirm('Unpublished photo selections will be lost. Saved local drafts remain on this device. Sign out?'))return;
    try{await fetch('/api/auth?action=logout',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:'{}'});}
    finally{location.replace('/admin.html');}
  }
  $('cms-sign-out').addEventListener('click',signOut);
  start();
})();