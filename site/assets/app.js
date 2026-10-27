(()=>{
  'use strict';
  const app=document.getElementById('app');
  const qs=new URLSearchParams(location.search);
  const page=qs.get('page')||'home';
  const id=qs.get('id')||'';
  const $=s=>document.querySelector(s);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validImage=x=>{let a=String(x||'');return (/^assets\/images\/[\w./-]+$/.test(a)&&!a.includes('..'))||/^https:\/\/[\w./%?=&+#:-]+$/i.test(a) ? esc(a):'assets/images/prism-logo.webp';};
  const pathTo=i=>`index.html?page=article&amp;id=${encodeURIComponent(i.id)}`;
  const niceDate=x=>{let d=new Date(String(x)+'T12:00:00');return Number.isNaN(d.getTime())?esc(x):d.toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'});};
  const category={news:'NEWS',feature:'FEATURE STORY',editorial:'EDITORIAL',cartoon:'EDITORIAL CARTOONING',infographic:'INFOGRAPHICS',gallery:'PICTURES',sports:'SPORTS NEWS',video:'VIDEOS'};
  const pagemeta={news:['News','Campus updates and reports from student journalists.','news'],features:['Feature Stories','Stories of people, learning, and the school community.','feature'],editorial:['Editorial','Student perspectives, opinion, and responsible commentary.','editorial'],cartoons:['Editorial Cartooning','Visual commentary that makes readers think.','cartoon'],infographics:['Infographics','Information presented visually and accessibly.','infographic'],gallery:['Photo Gallery','School moments told through photographs.','gallery'],sports:['Sports','Athletics, teamwork, and school spirit.','sports'],videos:['Videos','Student-produced multimedia and recorded stories.','video']};
  let entries=[];
  const find=(t)=>entries.find(x=>x.type===t);
  const thumb=(i,loading='lazy')=>`<img src="${validImage(i.image)}" alt="${esc(i.imageAlt||i.title)}" loading="${loading}">`;
  const sample='<span class="demo-hint" title="Demonstration content. Replace with verified school publication content.">SAMPLE CONTENT</span>';
  const link=(i,txt='Read more')=>`<a class="inline-action" href="${pathTo(i)}">${esc(txt)} <span aria-hidden="true">→</span></a>`;
  function setNav(){document.querySelectorAll('[data-nav]').forEach(a=>{let current=a.dataset.nav===page||page==='article'&&a.dataset.nav===({feature:'features',cartoon:'cartoons',infographic:'infographics',gallery:'gallery'}[entries.find(x=>x.id===id)?.type]||entries.find(x=>x.id===id)?.type);a.classList.toggle('active',!!current);if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
  function sectionHead(name,url){return `<div class="section-head"><h2>${esc(name)}</h2>${url?`<a href="index.html?page=${url}" aria-label="View all ${esc(name)}">View all <span aria-hidden="true">→</span></a>`:''}</div>`;}
  function home(){
    const heroList=[find('news'),find('feature'),find('sports')].filter(Boolean);
    const cartoon=find('cartoon'), info=find('infographic'),pic=find('gallery'),opinion=find('editorial'),sports=find('sports');
    const featureSlide=i=>`<div class="hero-slide"><img src="${validImage(i.image)}" alt="${esc(i.imageAlt||i.title)}" fetchpriority="high"><div class="hero-overlay"></div><div class="hero-copy"><span class="ribbon">${esc(category[i.type]||i.type.toUpperCase())}</span><h1>${esc(i.title)}</h1><p>${esc(i.excerpt)}</p><a class="read-btn" href="${pathTo(i)}">Read More <span>→</span></a></div></div>`;
    const featured=document.getElementById('featured-header');
    featured.innerHTML=`${heroList.map((i,n)=>`<div class="hero-pane ${n?'':'shown'}" data-slide="${n}">${featureSlide(i)}</div>`).join('')}<div class="hero-controls" aria-label="Featured story carousel"><div class="dots">${heroList.map((_,n)=>`<button class="dot ${n?'':'active'}" data-dot="${n}" aria-label="Featured story ${n+1}" aria-pressed="${!n}"></button>`).join('')}</div><button id="prev-slide" aria-label="Previous featured story">‹</button><button id="next-slide" aria-label="Next featured story">›</button></div>`;
    featured.hidden=false;
    document.querySelector('.app-shell')?.classList.add('home-top-feature');
    app.innerHTML=`<div class="home-grid">
      <section class="home-card compact-card cartoon-tile">${sectionHead('EDITORIAL CARTOONING','cartoons')}${cartoon?`<a class="tile-image" href="${pathTo(cartoon)}">${thumb(cartoon,'eager')}</a><div class="tile-copy"><h3>${esc(cartoon.title)}</h3><p>${esc(cartoon.excerpt)}</p>${link(cartoon,'Read Editorial')}</div>`:''}</section>
      <section class="home-card compact-card info-tile">${sectionHead('INFOGRAPHICS','infographics')}${info?`<a class="tile-image" href="${pathTo(info)}">${thumb(info,'eager')}</a><div class="tile-copy">${link(info,'View Infographics')}</div>`:''}</section>
      <section class="home-card compact-card gallery-tile">${sectionHead('PICTURES','gallery')}<div class="gallery-preview"><a class="gallery-primary" href="index.html?page=gallery"><img src="assets/images/gallery-treeplanting.webp" alt="Illustration of students planting a tree"></a><div class="gallery-strip"><a href="index.html?page=gallery"><img src="assets/images/gallery-event.webp" alt="Photo gallery preview of school activity"></a><a href="index.html?page=gallery"><img src="assets/images/gallery-community.webp" alt="Photo gallery preview of community activity"></a><a href="index.html?page=gallery"><img src="assets/images/gallery-camp.webp" alt="Photo gallery preview of students outdoors"></a></div></div></section>
      <section class="home-card compact-card opinion-tile">${sectionHead('EDITORIAL','editorial')}${opinion?`<a class="tile-image" href="${pathTo(opinion)}">${thumb(opinion,'eager')}</a><div class="tile-copy"><h3>${esc(opinion.title)}</h3><p>${esc(opinion.excerpt)}</p>${link(opinion,'Read Editorial')}</div>`:''}</section>
      <section class="home-card compact-card sports-tile">${sectionHead('SPORTS NEWS','sports')}${sports?`<a class="tile-image" href="${pathTo(sports)}">${thumb(sports,'eager')}</a><div class="tile-copy"><h3>${esc(sports.title)}</h3><p>${esc(sports.excerpt)}</p>${link(sports,'Read More')}</div>`:''}</section>
    </div>`;
    let slide=0;
    const showSlide=x=>{if(!heroList.length)return;slide=(x+heroList.length)%heroList.length;featured.querySelectorAll('.hero-pane').forEach((e,n)=>e.classList.toggle('shown',n===slide));featured.querySelectorAll('.dot').forEach((e,n)=>{e.classList.toggle('active',n===slide);e.setAttribute('aria-pressed',String(n===slide));});};
    featured.querySelector('#prev-slide')?.addEventListener('click',()=>showSlide(slide-1));
    featured.querySelector('#next-slide')?.addEventListener('click',()=>showSlide(slide+1));
    featured.querySelectorAll('[data-dot]').forEach(b=>b.addEventListener('click',()=>showSlide(Number(b.dataset.dot))));
  }
  function listing(section){
    const [label,desc,type]=pagemeta[section],list=entries.filter(i=>i.type===type);
    document.title=`${label} | The Prism`;
    app.innerHTML=`<div class="inner-page"><div class="page-title"><div><span class="eyebrow">THE PRISM · ${esc(category[type]||label)}</span><h1>${label}</h1><p>${desc}</p></div>${sample}</div><div class="story-list">${list.map(i=>`<article class="list-card"><a class="list-img" href="${pathTo(i)}">${thumb(i)}</a><div class="list-content"><span class="label-chip">${esc(category[i.type]||'ARTICLE')}</span><h2><a href="${pathTo(i)}">${esc(i.title)}</a></h2><div class="meta">By ${esc(i.author)} · ${niceDate(i.date)}</div><p>${esc(i.excerpt)}</p>${link(i,i.type==='cartoon'?'See Cartoon':'Read Full Story')}</div></article>`).join('')||'<p>No stories are published in this section yet.</p>'}</div></div>`;
  }
  function article(){
    const i=entries.find(x=>x.id===id);
    if(!i){app.innerHTML='<div class="inner-page"><h1>Story not found</h1><p>The story may be unpublished.</p><a href="index.html">← Home</a></div>';return;}
    const type=i.type==='cartoon'?'cartoons':Object.keys(pagemeta).find(p=>pagemeta[p][2]===i.type)||'features';
    document.title=`${i.title} | The Prism`;
    app.innerHTML=`<div class="inner-page article-page"><nav class="breadcrumbs"><a href="index.html">Home</a> › <a href="index.html?page=${type}">${esc(pagemeta[type][0])}</a> › ${esc(i.title)}</nav><div class="article-layout"><figure class="article-photo ${i.type==='cartoon'?'cartoon-photo':''}">${thumb(i,'eager')}<figcaption>${esc(i.caption||'Sample publication image.')}</figcaption></figure><article class="article-text"><span class="label-chip">${esc(category[i.type]||'ARTICLE')}</span><h1>${esc(i.title)}</h1><div class="meta">By <strong>${esc(i.author)}</strong> · ${niceDate(i.date)}</div><div class="sample-alert">Demonstration article — replace with verified text and approved photo credits before publication.</div>${(Array.isArray(i.body)?i.body:[i.body||'']).map(t=>`<p>${esc(t)}</p>`).join('')}<a class="inline-action" href="index.html?page=${type}">← Back to ${esc(pagemeta[type][0])}</a></article></div></div>`;
  }
  function about(contact=false){
    document.title=(contact?'Contact':'About Us')+' | The Prism';
    app.innerHTML=`<div class="inner-page"><div class="about-panel"><img src="assets/images/prism-logo.webp" alt="The Prism logo"><div><span class="eyebrow">CALBAYOG CITY NATIONAL HIGH SCHOOL</span><h1>${contact?'Contact The Prism':'About The Prism'}</h1><p>${contact?'For news tips, corrections, submissions, and school-publication concerns, reach out through the school’s official communication channels. This sample site deliberately does not display unverified contact details or collect personal information.':'The Prism is a platform for the creative voices and responsible reporting of CCNHS student journalists, artists, photographers, and contributors.'}</p><p>${contact?'The editorial team can add approved contact information after the website is launched.':'We value truth, fairness, student expression, respectful conversation, photo permissions, and thoughtful editorial review.'}</p><a class="inline-action" href="admin.html">Editorial dashboard →</a><p class="muted-note">All sample stories and dates on this website are demonstration content.</p></div></div></div>`;
  }
  function active(){
    let key=page;if(page==='article'){const t=entries.find(x=>x.id===id)?.type;key={feature:'features',cartoon:'cartoons',infographic:'infographics'}[t]||t||'home';}
    document.querySelectorAll('[data-nav]').forEach(el=>{let hit=el.dataset.nav===key;el.classList.toggle('active',hit);if(hit)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  }
  async function init(){
    try{const response=await fetch('content/articles.json',{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);const data=await response.json();entries=(Array.isArray(data.items)?data.items:[]).filter(i=>i.status==='published').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      if(page==='home')home();else if(pagemeta[page])listing(page);else if(page==='article')article();else if(page==='about'||page==='contact')about(page==='contact');else app.innerHTML='<div class="inner-page"><h1>Page not found</h1><a href="index.html">Return Home</a></div>';
      active();
    }catch(e){app.innerHTML='<div class="inner-page"><h1>Unable to load publication content.</h1><p>Use a local web server or GitHub Pages to view the website. Check that <code>content/articles.json</code> is present.</p></div>';console.error(e);}
  }
  const menu=$('#menu-toggle');menu?.addEventListener('click',()=>{let open=$('#side-nav').classList.toggle('opened');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰';});
  document.addEventListener('click',e=>{if(!e.target.closest('#side-nav')&&!e.target.closest('#menu-toggle')){const nav=$('#side-nav');nav?.classList.remove('opened');menu?.setAttribute('aria-expanded','false');if(menu)menu.textContent='☰';}});
  const warning=$('#network-warning');const connection=()=>{warning.hidden=navigator.onLine;};window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
  init();
})();