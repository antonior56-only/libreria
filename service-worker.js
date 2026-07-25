/* ===================================
   LA MIA LIBRERIA
   Service Worker PWA
=================================== */


const CACHE_NAME = "la-mia-libreria-v1";


const FILE_DA_CACHE = [

    "./",

    "./index.html",

    "./style.css",

    "./app.js",

    "./database.js",

    "./manifest.json"

];





// INSTALLAZIONE

self.addEventListener(
"install",
evento => {


    evento.waitUntil(

        caches.open(
            CACHE_NAME
        )
        .then(
            cache => {

                return cache.addAll(
                    FILE_DA_CACHE
                );

            }
        )

    );


});





// ATTIVAZIONE

self.addEventListener(
"activate",
evento => {


    evento.waitUntil(

        caches.keys()
        .then(
            nomiCache => {


                return Promise.all(

                    nomiCache
                    .filter(
                        nome =>
                        nome !== CACHE_NAME
                    )
                    .map(
                        nome =>
                        caches.delete(nome)
                    )

                );


            }

        )

    );


});





// RICHIESTE RISORSE

self.addEventListener(
"fetch",
evento => {


    evento.respondWith(


        caches.match(
            evento.request
        )
        .then(
            risposta => {


                return risposta ||

                fetch(
                    evento.request
                );


            }

        )


    );


});