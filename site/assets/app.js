(()=>{
  'use strict';
  const app=document.getElementById('app');
  const qs=new URLSearchParams(location.search);
  const page=qs.get('page')||'home';
  const oldRoutes={features:'news',infographics:'news',gallery:'news',videos:'news',cartoons:'editorial',about:'home',contact:'home'};
  const section=oldRoutes[page]||page;
  const id=qs.get('id')||'';
  const $=s=>document.querySelector(s);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validImage=x=>{let a=String(x||'');return (/^assets\/images\/[\w./-]+$/.test(a)&&!a.includes('..'))||/^https:\/\/[\w./%?=&+#:-]+$/i.test(a) ? esc(a):'assets/images/prism-logo.webp';};
  const pathTo=i=>`index.html?page=article&amp;id=${encodeURIComponent(i.id)}`;
  const niceDate=x=>{let d=new Date(String(x)+'T12:00:00');return Number.isNaN(d.getTime())?esc(x):d.toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'});};
  const category={news:'NEWS',feature:'FEATURE STORY',editorial:'EDITORIAL',cartoon:'EDITORIAL CARTOONING',infographic:'INFOGRAPHICS',gallery:'PICTURES',sports:'SPORTS NEWS',video:'VIDEOS'};
  const pagemeta={news:['News','Campus updates, feature stories, and reports from student journalists.','news'],editorial:['Editorial','Student perspectives, opinions, and editorial cartooning.','editorial'],sports:['Sports','Athletics, teamwork, and school spirit.','sports']};
  const topLevelForType=type=>(type==='editorial'||type==='cartoon')?'editorial':type==='sports'?'sports':'news';
  let entries=[];
  const find=(t)=>entries.find(x=>x.type===t);
  const thumb=(i,loading='lazy')=>`<img src="${validImage(i.image)}" alt="${esc(i.imageAlt||i.title)}" loading="${loading}">`;
  const sample='<span class="demo-hint" title="Demonstration content. Replace with verified school publication content.">SAMPLE CONTENT</span>';
  const link=(i,txt='Read more')=>`<a class="inline-action" href="${pathTo(i)}">${esc(txt)} <span aria-hidden="true">→</span></a>`;
  function sectionHead(name,url){return `<div class="section-head"><h2>${esc(name)}</h2>${url?`<a href="index.html?page=${url}" aria-label="View all ${esc(name)}">View all <span aria-hidden="true">→</span></a>`:''}</div>`;}
  function home(){
    const heroList=[find('news'),find('feature'),find('sports')].filter(Boolean);
    const cartoon=find('cartoon'),opinion=find('editorial'),sports=find('sports');
    const featureSlide=i=>`<div class="hero-slide"><img src="${validImage(i.image)}" alt="${esc(i.imageAlt||i.title)}" fetchpriority="high"><div class="hero-overlay"></div><div class="hero-copy"><span class="ribbon">${esc(category[i.type]||i.type.toUpperCase())}</span><h1>${esc(i.title)}</h1><p>${esc(i.excerpt)}</p><a class="read-btn" href="${pathTo(i)}">Read More <span>→</span></a></div></div>`;
    const featured=document.getElementById('featured-header');
    featured.innerHTML=`${heroList.map((i,n)=>`<div class="hero-pane ${n?'':'shown'}" data-slide="${n}">${featureSlide(i)}</div>`).join('')}<div class="hero-controls" aria-label="Featured story carousel"><div class="dots">${heroList.map((_,n)=>`<button class="dot ${n?'':'active'}" data-dot="${n}" aria-label="Featured story ${n+1}" aria-pressed="${!n}"></button>`).join('')}</div><button id="prev-slide" aria-label="Previous featured story">‹</button><button id="next-slide" aria-label="Next featured story">›</button></div>`;
    featured.hidden=false;
    document.querySelector('.app-shell')?.classList.add('home-top-feature');
    // Published CMS articles provide a click-through, auto-scrolling headline strip.
    const ticker=document.getElementById('headline-ticker');
    const headlineItems=entries.filter(item=>['news','feature','sports','editorial','cartoon'].includes(item.type)).slice(0,8);
    if(ticker && headlineItems.length){
      const renderHeadline=item=>'<a class="ticker-item" href="'+pathTo(item)+'"><span class="ticker-kind">'+esc(category[item.type]||item.type)+'</span><span class="ticker-title">'+esc(item.title)+'</span></a>';
      const oneSet=headlineItems.map(renderHeadline).join('<span class="ticker-separator" aria-hidden="true">✦</span>');
      ticker.innerHTML='<span class="ticker-label">LATEST HEADLINES</span><div class="ticker-viewport"><div class="ticker-motion"><div class="ticker-set">'+oneSet+'</div><div class="ticker-set" aria-hidden="true" inert>'+oneSet+'</div></div></div>';
      ticker.hidden=false;
    }
    app.innerHTML='<div class="home-grid"><div id="secondary-carousel-root" class="story-carousel-root"></div></div>';
    if(window.PrismCarousel) {
      window.PrismCarousel.mount(document.getElementById('secondary-carousel-root'),[cartoon,opinion,sports].filter(Boolean),{
        esc:esc,validImage:validImage,pathTo:pathTo,category:category
      });
    }
    let slide=0,rotationTimer=null;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let userPaused=reducedMotion.matches;
    let hoverPaused=featured.matches(':hover');
    let focusPaused=featured.contains(document.activeElement);
    const controls=featured.querySelector('.hero-controls');
    const rotationButton=heroList.length>1?document.createElement('button'):null;
    if(rotationButton){
      rotationButton.type='button';
      rotationButton.id='toggle-slideshow';
      controls.append(rotationButton);
    }
    featured.setAttribute('aria-live','off');
    const updateRotationButton=()=>{
      if(!rotationButton)return;
      const label=userPaused?'Play automatic slideshow':'Pause automatic slideshow';
      rotationButton.textContent=userPaused?'▶':'Ⅱ';
      rotationButton.setAttribute('aria-label',label);
      rotationButton.title=label;
    };
    const stopRotation=()=>{window.clearTimeout(rotationTimer);rotationTimer=null;};
    const scheduleRotation=()=>{
      stopRotation();
      if(heroList.length<2||userPaused||hoverPaused||focusPaused||document.hidden)return;
      rotationTimer=window.setTimeout(()=>{showSlide(slide+1);scheduleRotation();},6000);
    };
    const showSlide=x=>{
      if(!heroList.length)return;
      slide=(x+heroList.length)%heroList.length;
      featured.querySelectorAll('.hero-pane').forEach((el,n)=>{
        const active=n===slide;
        el.classList.toggle('shown',active);
        el.inert=!active;
        el.setAttribute('aria-hidden',String(!active));
        el.setAttribute('role','group');
        el.setAttribute('aria-roledescription','slide');
        el.setAttribute('aria-label',`Featured story ${n+1} of ${heroList.length}`);
      });
      featured.querySelectorAll('.dot').forEach((el,n)=>{
        el.classList.toggle('active',n===slide);
        el.setAttribute('aria-pressed',String(n===slide));
      });
    };
    const navigate=x=>{showSlide(x);scheduleRotation();};
    featured.querySelector('#prev-slide')?.addEventListener('click',()=>navigate(slide-1));
    featured.querySelector('#next-slide')?.addEventListener('click',()=>navigate(slide+1));
    featured.querySelectorAll('[data-dot]').forEach(button=>button.addEventListener('click',()=>navigate(Number(button.dataset.dot))));
    rotationButton?.addEventListener('click',()=>{
      userPaused=!userPaused;
      focusPaused=false;
      updateRotationButton();
      scheduleRotation();
    });
    featured.addEventListener('mouseenter',()=>{hoverPaused=true;stopRotation();});
    featured.addEventListener('mouseleave',()=>{hoverPaused=false;scheduleRotation();});
    featured.addEventListener('focusin',()=>{focusPaused=true;stopRotation();});
    featured.addEventListener('focusout',event=>{
      if(!featured.contains(event.relatedTarget)){focusPaused=false;scheduleRotation();}
    });
    document.addEventListener('visibilitychange',scheduleRotation);
    window.addEventListener('pagehide',stopRotation);
    window.addEventListener('pageshow',scheduleRotation);
    reducedMotion.addEventListener('change',event=>{
      if(event.matches){userPaused=true;updateRotationButton();scheduleRotation();}
    });
    showSlide(0);
    updateRotationButton();
    scheduleRotation();
  }
  function listing(section){
    const [label,desc,type]=pagemeta[section];
    const list=entries.filter(i=>section==='news'?(i.type==='news'||i.type==='feature'):section==='editorial'?(i.type==='editorial'||i.type==='cartoon'):i.type==='sports');
    document.title=`${label} | The Prism`;
    app.innerHTML=`<div class="inner-page"><div class="page-title"><div><span class="eyebrow">THE PRISM · ${esc(category[type]||label)}</span><h1>${label}</h1><p>${desc}</p></div>${sample}</div><div class="story-list">${list.map(i=>`<article class="list-card"><a class="list-img" href="${pathTo(i)}">${thumb(i)}</a><div class="list-content"><span class="label-chip">${esc(category[i.type]||'ARTICLE')}</span><h2><a href="${pathTo(i)}">${esc(i.title)}</a></h2><div class="meta">By ${esc(i.author)} · ${niceDate(i.date)}</div><p>${esc(i.excerpt)}</p>${link(i,i.type==='cartoon'?'See Cartoon':'Read Full Story')}</div></article>`).join('')||'<p>No stories are published in this section yet.</p>'}</div></div>`;
  }
  function article(){
    const i=entries.find(x=>x.id===id);
    if(!i){app.innerHTML='<div class="inner-page"><h1>Story not found</h1><p>The story may be unpublished.</p><a href="index.html">← Home</a></div>';return;}
    const type=topLevelForType(i.type);
    document.title=`${i.title} | The Prism`;
    app.innerHTML=`<div class="inner-page article-page"><nav class="breadcrumbs"><a href="index.html">Home</a> › <a href="index.html?page=${type}">${esc(pagemeta[type][0])}</a> › ${esc(i.title)}</nav><div class="article-layout"><figure class="article-photo ${i.type==='cartoon'?'cartoon-photo':''}">${thumb(i,'eager')}<figcaption>${esc(i.caption||'Sample publication image.')}</figcaption></figure><article class="article-text"><span class="label-chip">${esc(category[i.type]||'ARTICLE')}</span><h1>${esc(i.title)}</h1><div class="meta">By <strong>${esc(i.author)}</strong> · ${niceDate(i.date)}</div><div class="sample-alert">Demonstration article — replace with verified text and approved photo credits before publication.</div>${(Array.isArray(i.body)?i.body:[i.body||'']).map(t=>`<p>${esc(t)}</p>`).join('')}<a class="inline-action" href="index.html?page=${type}">← Back to ${esc(pagemeta[type][0])}</a></article></div></div>`;
  }
  function about(contact=false){
    document.title=(contact?'Contact':'About Us')+' | The Prism';
    app.innerHTML=`<div class="inner-page"><div class="about-panel"><img src="assets/images/prism-logo.webp" alt="The Prism logo"><div><span class="eyebrow">CALBAYOG CITY NATIONAL HIGH SCHOOL</span><h1>${contact?'Contact The Prism':'About The Prism'}</h1><p>${contact?'For news tips, corrections, submissions, and school-publication concerns, reach out through the school’s official communication channels. This sample site deliberately does not display unverified contact details or collect personal information.':'The Prism is a platform for the creative voices and responsible reporting of CCNHS student journalists, artists, photographers, and contributors.'}</p><p>${contact?'The editorial team can add approved contact information after the website is launched.':'We value truth, fairness, student expression, respectful conversation, photo permissions, and thoughtful editorial review.'}</p><a class="inline-action" href="admin.html">Editorial dashboard →</a><p class="muted-note">All sample stories and dates on this website are demonstration content.</p></div></div></div>`;
  }
  function active(){
    const key=page==='article'?topLevelForType(entries.find(item=>item.id===id)?.type):section;
    document.querySelectorAll('[data-nav]').forEach(el=>{
      const hit=el.dataset.nav===key;
      el.classList.toggle('active',hit);
      if(hit)el.setAttribute('aria-current','page');
      else el.removeAttribute('aria-current');
    });
  }
  async function init(){
    try{const response=await fetch('content/articles.json',{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);const data=await response.json();entries=(Array.isArray(data.items)?data.items:[]).filter(i=>i.status==='published').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      if(section!==page && page!=='article'){
        history.replaceState(null,'',section==='home'?'index.html':'index.html?page='+section);
      }
      if(section==='home')home();
      else if(pagemeta[section])listing(section);
      else if(page==='article')article();
      else app.innerHTML='<div class="inner-page"><h1>Page not found</h1><a href="index.html">Return Home</a></div>';
      active();
    }catch(e){app.innerHTML='<div class="inner-page"><h1>Unable to load publication content.</h1><p>Use a local web server or GitHub Pages to view the website. Check that <code>content/articles.json</code> is present.</p></div>';console.error(e);}
  }
  const menu=$('#menu-toggle');menu?.addEventListener('click',()=>{let open=$('#side-nav').classList.toggle('opened');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰';});
  document.addEventListener('click',e=>{if(!e.target.closest('#side-nav')&&!e.target.closest('#menu-toggle')){const nav=$('#side-nav');nav?.classList.remove('opened');menu?.setAttribute('aria-expanded','false');if(menu)menu.textContent='☰';}});
  const warning=$('#network-warning');const connection=()=>{warning.hidden=navigator.onLine;};window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
  init();
})();