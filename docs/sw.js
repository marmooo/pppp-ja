const CACHE_NAME="2024-03-13 09:40",urlsToCache=["/pppp-ja/","/pppp-ja/index.js","/pppp-ja/mp3/bgm.mp3","/pppp-ja/mp3/cat.mp3","/pppp-ja/mp3/correct3.mp3","/pppp-ja/mp3/end.mp3","/pppp-ja/mp3/keyboard.mp3","/pppp-ja/problems.json","/pppp-ja/favicon/favicon.svg","https://marmooo.github.io/fonts/textar-light.woff2"];self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(e=>e.addAll(urlsToCache)))}),self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(t=>t||fetch(e.request)))}),self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(e=>Promise.all(e.filter(e=>e!==CACHE_NAME).map(e=>caches.delete(e)))))})