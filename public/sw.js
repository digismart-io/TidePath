const CACHE='tidepath-shell-v7';
const SHELL=['/','/index.html','/style.css','/brand.css','/tokens.css','/app.js','/icon.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
// Never cache API responses, guardian information, or attendance records.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(SHELL.includes(url.pathname))event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
