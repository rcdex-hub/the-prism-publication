/* The Prism — e-Publication reader, no third-party libraries. */
(()=>{
 'use strict';
 const PAGES=[
  {src:'assets/images/epublication/page-01.webp',name:'Cover'},
  {src:'assets/images/epublication/page-02.webp',name:'Feature Stories'},
  {src:'assets/images/epublication/page-03.webp',name:'Community Stories'},
  {src:'assets/images/epublication/page-04.webp',name:'Closing Page'}
 ];
 const mobileQuery=window.matchMedia('(max-width:760px)');
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let step=0,busy=false,container,stage,book,indicator,backButton,nextButton,thumbs,zoom,live;
 const isMobile=()=>mobileQuery.matches;
 const total=()=>isMobile()?PAGES.length:Math.ceil((PAGES.length+2)/2);
 const spread=position=>{
  if(isMobile())return [null,position+1];
  if(position===0)return [null,1];
  const left=position*2;
  return [left,left+1<=PAGES.length?left+1:null];
 };
 const escapeText=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const card=num=>{
  if(!num)return '<div class="ep-page ep-blank" aria-hidden="true"><div class="ep-inside"><span>THE PRISM</span><strong>Stories that inform.<br>Voices that inspire.</strong><small>CCNHS · OCTOBER 2026</small></div></div>';
  const item=PAGES[num-1];
  return '<div class="ep-page" data-pagenum="'+num+'"><img draggable="false" src="'+item.src+'" alt="The Prism e-Publication, page '+num+': '+escapeText(item.name)+'"><div class="ep-page-missing" aria-hidden="true"><span>PAGE '+String(num).padStart(2,'0')+'</span><strong>Publication page awaiting upload</strong><small>Upload '+escapeText(item.src.split('/').pop())+' to the repository.</small></div></div>';
 };
 function watchImages(root) {
  root.querySelectorAll('.ep-page img').forEach(img=>{
    const page=img.closest('.ep-page');
    img.addEventListener('error',()=>{page.classList.add('ep-image-missing')},{once:true});
    img.addEventListener('load',()=>{page.classList.remove('ep-image-missing')},{once:true});
    if(img.complete&&img.naturalWidth===0)page.classList.add('ep-image-missing');
  });
 }
 function selected(){
  const p=spread(step);
  return p[1]||p[0]||1;
 }
 function update(){
  const [left,right]=spread(step);
  book.innerHTML='<div class="ep-left">'+card(left)+'</div><div class="ep-right">'+card(right)+'</div>';
  watchImages(book);
  const pageName=isMobile()?'Page '+right+' of '+PAGES.length:(left&&right?'Pages '+left+'–'+right+' of '+PAGES.length:(left||right)===1?'Cover · Page 1 of '+PAGES.length:'Page '+left+' of '+PAGES.length);
  indicator.textContent=pageName;
  live.textContent=pageName;
  backButton.disabled=step===0;
  nextButton.disabled=step===total()-1;
  zoom.href=PAGES[selected()-1].src;
  zoom.setAttribute('aria-label','Open page '+selected()+' full size');
  thumbs.querySelectorAll('[data-target]').forEach(btn=>{
    const n=Number(btn.dataset.target);
    const shown=isMobile()?n===step+1:spread(step).includes(n);
    btn.classList.toggle('is-current',shown);
    btn.setAttribute('aria-current',shown?'page':'false');
  });
 }
 function go(direction,target){
  if(busy)return;
  const next=target===undefined?Math.max(0,Math.min(total()-1,step+direction)):Math.max(0,Math.min(total()-1,target));
  if(next===step)return;
  if(reduceMotion.matches){step=next;update();return;}
  busy=true;const before=spread(step),after=spread(next);
  // The turning sheet has its own two faces to evoke a physical book.
  const backwards=next<step;
  const frontNumber=isMobile()?before[1]:backwards?before[0]:before[1];
  const backNumber=isMobile()?after[1]:backwards?after[1]:after[0];
  const leaf=document.createElement('div');
  leaf.className='ep-leaf '+(backwards?'ep-leaf-prev':'ep-leaf-next');
  leaf.innerHTML='<div class="ep-face ep-front">'+card(frontNumber)+'</div><div class="ep-face ep-back">'+card(backNumber)+'</div>';
  step=next;update();book.appendChild(leaf);watchImages(leaf);
  // Force layout before applying the 3D transform.
  void leaf.offsetWidth;
  requestAnimationFrame(()=>leaf.classList.add('ep-leaf-turned'));
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;leaf.remove();busy=false;};
  leaf.addEventListener('transitionend',e=>{if(e.target===leaf&&e.propertyName==='transform')finish()},{once:true});
  setTimeout(finish,780);
 }
 function navigateKey(event){
  if(!container||!document.body.contains(container))return;
  if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key==='ArrowRight'){event.preventDefault();go(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();go(-1);}
 }
 function mount(el){
  step=0;busy=false;container=el;
  el.innerHTML='<section class="epub" aria-label="The Prism digital publication">'+
   '<header class="ep-head"><div><span class="ep-kicker">THE PRISM · DIGITAL EDITION</span><h1>e-Publication</h1><p>Special Edition · October 2026 · Educational Journalism</p></div>'+
   '<div class="ep-meta"><span>4 PAGES</span><span>FLIPBOOK READER</span></div></header>'+
   '<div class="ep-stage" role="region" aria-roledescription="book" aria-label="Publication pages">'+
   '<div class="ep-book" id="ep-book"></div></div>'+
   '<footer class="ep-toolbar"><div class="ep-navigation"><button type="button" class="ep-arrow" id="ep-previous" aria-label="Previous page">‹</button>'+
   '<span class="ep-indicator" id="ep-indicator">Page 1 of 4</span>'+
   '<button type="button" class="ep-arrow" id="ep-next" aria-label="Next page">›</button></div>'+
   '<a class="ep-zoom" id="ep-zoom" target="_blank" rel="noopener noreferrer">Open full-size page <span aria-hidden="true">↗</span></a></footer>'+
   '<div class="ep-thumbnails" id="ep-thumbnails" aria-label="Jump to page">'+PAGES.map((p,i)=>'<button type="button" data-target="'+(i+1)+'" aria-label="Go to page '+(i+1)+'"><span>'+String(i+1).padStart(2,'0')+'</span><small>'+escapeText(p.name)+'</small></button>').join('')+'</div>'+
   '<p class="ep-reader-tip">Use ← → keys or swipe to turn pages. Select a page number to jump.</p>'+
   '<span class="ep-sr-only" aria-live="polite" id="ep-live"></span></section>';
  book=el.querySelector('#ep-book');stage=el.querySelector('.ep-stage');indicator=el.querySelector('#ep-indicator');
  backButton=el.querySelector('#ep-previous');nextButton=el.querySelector('#ep-next');thumbs=el.querySelector('#ep-thumbnails');zoom=el.querySelector('#ep-zoom');live=el.querySelector('#ep-live');
  update();
  backButton.addEventListener('click',()=>go(-1));nextButton.addEventListener('click',()=>go(1));
  thumbs.addEventListener('click',e=>{
    const button=e.target.closest('[data-target]');if(!button)return;
    const page=Number(button.dataset.target);
    const index=isMobile()?page-1:page===1?0:page===PAGES.length?2:1;
    go(index>step?1:-1,index);
  });
  let x=0,y=0;
  stage.addEventListener('touchstart',e=>{if(e.touches.length===1){x=e.touches[0].clientX;y=e.touches[0].clientY;}},{passive:true});
  stage.addEventListener('touchend',e=>{if(!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-x;const dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)go(dx<0?1:-1);},{passive:true});
  if(!window.__prismEpubKeyboard){document.addEventListener('keydown',navigateKey);window.__prismEpubKeyboard=true;}
  const resize=()=>{if(!document.body.contains(container))return;step=Math.max(0,Math.min(total()-1,isMobile()?step:step>2?2:step));busy=false;update();};
  if(mobileQuery.addEventListener)mobileQuery.addEventListener('change',resize);
  else mobileQuery.addListener(resize);
  PAGES.forEach(p=>{const img=new Image();img.src=p.src;});
 }
 window.PrismFlipbook={mount};
})();
