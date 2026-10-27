/* Offline cache for The Prism. Registration works over HTTPS or localhost. */
const CACHE='the-prism-v8-20261027-featured-content-column';
const CORE=['./','./index.html','./admin.html','./assets/styles.css','./assets/admin.css','./assets/app.js','./assets/admin.js','./content/articles.json','./assets/images/prism-logo.webp','./assets/images/prism-masthead.webp','./assets/images/icon-192.png','./assets/images/icon-512.png','./assets/images/campus-feature-clean.webp','./assets/images/cartoon-choices.webp','./assets/images/infographic-newsroom.webp','./assets/images/gallery-treeplanting.webp','./assets/images/editorial-pen.webp','./assets/images/sports-basketball.webp','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==location.origin) return;
 // Cache first for assets, network first for editorial JSON and navigation
 if(req.mode==='navigate'||new URL(req.url).pathname.endsWith('/articles.json')) {
  event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match(req).then(c=>c||caches.match('./index.html'))));
 }else event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(req,res.clone()));return res;})));
});