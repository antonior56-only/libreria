/* ===================================
   LA MIA LIBRERIA
   Service Worker PWA - versione 2
=================================== */


const CACHE_NAME = "la-mia-libreria-v2";


const FILE_DA_CACHE = [

    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./database.js",
    "./isbn.js",
    "./scanner.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png",

    "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"

];





// INSTALLAZIONE

self.addEventListener("install", function(evento){


    evento.waitUntil(

        caches.open(CACHE_NAME)
        .then(function(cache){


            // ogni file singolarmente: se uno manca
            // l'installazione non fallisce tutta
            return Promise.all(

                FILE_DA_CACHE.map(function(file){

                    return cache.add(file)
                    .catch(function(errore){

                        console.warn(
                        "File non messo in cache:",
                        file,
                        errore
                        );

                    });

                })

            );


        })

    );


    self.skipWaiting();


});





// ATTIVAZIONE

self.addEventListener("activate", function(evento){


    evento.waitUntil(

        caches.keys()
        .then(function(nomiCache){


            return Promise.all(

                nomiCache
                .filter(function(nome){
                    return nome !== CACHE_NAME;
                })
                .map(function(nome){
                    return caches.delete(nome);
                })

            );


        })
        .then(function(){

            return self.clients.claim();

        })

    );


});





// RICHIESTE RISORSE

self.addEventListener("fetch", function(evento){


    const richiesta = evento.request;


    // solo letture
    if(richiesta.method !== "GET"){

        return;

    }


    const indirizzo = new URL(richiesta.url);


    // le chiamate a Open Library devono essere sempre fresche
    if(indirizzo.hostname.endsWith("openlibrary.org")){

        return;

    }



    evento.respondWith(

        caches.match(richiesta)
        .then(function(risposta){


            if(risposta){

                return risposta;

            }


            return fetch(richiesta)
            .then(function(rispostaRete){


                // memorizza le copertine e i file nuovi
                if(
                    rispostaRete &&
                    (rispostaRete.ok || rispostaRete.type === "opaque")
                ){


                    const copia = rispostaRete.clone();


                    caches.open(CACHE_NAME)
                    .then(function(cache){

                        cache.put(richiesta, copia);

                    })
                    .catch(function(){});


                }


                return rispostaRete;


            })
            .catch(function(){


                // offline e risorsa non in cache
                if(richiesta.mode === "navigate"){

                    return caches.match("./index.html");

                }


                return new Response("", { status: 504 });


            });


        })

    );


});
