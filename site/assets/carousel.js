/* The Prism — accessible rotating editorial and sports highlights. */
(function () {
  'use strict';
  function mount(root, articles, helpers) {
    if (!root || !Array.isArray(articles) || articles.length === 0) return;
    var esc=helpers.esc, validImage=helpers.validImage, pathTo=helpers.pathTo, category=helpers.category;
    var count=articles.length;
    function card(item) {
      var kind=String(item.type||'');
      var label=esc(category[kind]||kind.toUpperCase());
      var image=validImage(item.image);
      var title=esc(item.title);
      var alt=esc(item.imageAlt||item.title);
      var href=pathTo(item);
      var action=kind==='cartoon'?'Read cartoon':kind==='sports'?'Read sports news':'Read editorial';
      return '<a class="story-carousel-card" data-type="'+esc(kind)+'" href="'+href+'" aria-label="'+label+': '+title+'">'+
        '<span class="story-carousel-tag">'+label+'</span>'+
        '<span class="story-carousel-image"><img src="'+image+'" alt="'+alt+'" loading="eager"></span>'+
        '<span class="story-carousel-copy"><strong>'+title+'</strong>'+
        '<span class="story-carousel-link">'+action+' <span aria-hidden="true">→</span></span></span></a>';
    }
    var oneSet=articles.map(card).join('');
    root.innerHTML='<section class="story-carousel" role="region" aria-roledescription="carousel" aria-label="Editorial cartooning, editorial and sports news">'+
      '<div class="story-carousel-toolbar"><span class="story-carousel-heading">EDITORIAL &amp; SPORTS HIGHLIGHTS</span>'+
      '<div class="story-carousel-actions">'+
      '<button type="button" data-story-prev aria-label="Previous stories" title="Previous stories">‹</button>'+
      '<button type="button" data-story-pause aria-label="Pause rotating stories" title="Pause rotating stories">Ⅱ</button>'+
      '<button type="button" data-story-next aria-label="Next stories" title="Next stories">›</button></div></div>'+
      '<div class="story-carousel-viewport"><div class="story-carousel-track">'+oneSet+oneSet+'</div></div></section>';
    var carousel=root.querySelector('.story-carousel');
    var track=root.querySelector('.story-carousel-track');
    var cards=Array.from(track.children);
    var prev=root.querySelector('[data-story-prev]');
    var next=root.querySelector('[data-story-next]');
    var pause=root.querySelector('[data-story-pause]');
    var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    var userPaused=reduced.matches, hoverPaused=false, focusPaused=false;
    var index=0, animating=false, timer=null, touchX=null, suppressClick=false;
    var gap=10;
    function visibleCount() {
      return Math.min(count, Math.max(1, Math.round(parseFloat(getComputedStyle(carousel).getPropertyValue('--story-visible'))||3)));
    }
    function distance() {
      gap=parseFloat(getComputedStyle(track).columnGap)||10;
      return (cards[0]?.getBoundingClientRect().width||0)+gap;
    }
    function position(animate) {
      track.style.transition=animate?'transform 550ms cubic-bezier(.22,.71,.25,1)':'none';
      track.style.transform='translate3d('+(-index*distance())+'px,0,0)';
    }
    function syncAccess() {
      var n=visibleCount();
      cards.forEach(function(card,i) {
        var visible=i>=index && i<index+n;
        card.tabIndex=visible?0:-1;
        card.setAttribute('aria-hidden',String(!visible));
      });
    }
    function updatePause() {
      pause.textContent=userPaused?'▶':'Ⅱ';
      var label=userPaused?'Play rotating stories':'Pause rotating stories';
      pause.setAttribute('aria-label',label);pause.title=label;
    }
    function stop() {window.clearTimeout(timer);timer=null;}
    function schedule() {
      stop();
      if(count<2 || userPaused || reduced.matches || hoverPaused || focusPaused || document.hidden) return;
      timer=window.setTimeout(function(){move(1);schedule();},5200);
    }
    function move(direction) {
      if(count<2||animating)return;
      if(reduced.matches) {
        index=(index+direction+count)%count;position(false);syncAccess();return;
      }
      if(direction<0 && index===0) {
        index=count;position(false);void track.offsetWidth;
      }
      if(direction>0 && index===count) {
        index=0;position(false);void track.offsetWidth;
      }
      index+=direction;
      animating=true;
      position(true);
    }
    track.addEventListener('transitionend',function(e) {
      if(e.target!==track || e.propertyName!=='transform')return;
      animating=false;
      if(index===count){index=0;position(false);}
      syncAccess();
    });
    prev.addEventListener('click',function(){move(-1);schedule();});
    next.addEventListener('click',function(){move(1);schedule();});
    pause.addEventListener('click',function(){userPaused=!userPaused;updatePause();schedule();});
    carousel.addEventListener('mouseenter',function(){hoverPaused=true;stop();});
    carousel.addEventListener('mouseleave',function(){hoverPaused=false;schedule();});
    carousel.addEventListener('focusin',function(){focusPaused=true;stop();});
    carousel.addEventListener('focusout',function(e){
      if(!carousel.contains(e.relatedTarget)){focusPaused=false;schedule();}
    });
    carousel.addEventListener('touchstart',function(e){
      if(e.touches.length===1)touchX=e.touches[0].clientX;
    },{passive:true});
    carousel.addEventListener('touchend',function(e){
      if(touchX===null || !e.changedTouches.length)return;
      var delta=e.changedTouches[0].clientX-touchX;touchX=null;
      if(Math.abs(delta)>=48) {
        suppressClick=true;move(delta>0?-1:1);schedule();
        window.setTimeout(function(){suppressClick=false;},400);
      }
    },{passive:true});
    carousel.addEventListener('click',function(e){
      if(suppressClick && e.target.closest('.story-carousel-card')){e.preventDefault();suppressClick=false;}
    },true);
    window.addEventListener('resize',function(){
      animating=false;index=0;position(false);syncAccess();
    });
    document.addEventListener('visibilitychange',schedule);
    window.addEventListener('pagehide',stop);
    window.addEventListener('pageshow',schedule);
    if(reduced.addEventListener)reduced.addEventListener('change',function(e){
      if(e.matches){userPaused=true;stop();animating=false;index=0;position(false);syncAccess();}
      updatePause();schedule();
    });
    position(false);syncAccess();updatePause();schedule();
  }
  window.PrismCarousel={mount:mount};
})();