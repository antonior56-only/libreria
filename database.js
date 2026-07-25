/* ===================================
   LA MIA LIBRERIA
   Database IndexedDB - Versione 1.1
=================================== */


const NOME_DATABASE = "LaMiaLibreriaDB";

const VERSIONE_DATABASE = 2;

const TABELLA_LIBRI = "libri";


let db;



// APERTURA DATABASE

function apriDatabase() {


    return new Promise((resolve, reject) => {


        const richiesta =
        indexedDB.open(
            NOME_DATABASE,
            VERSIONE_DATABASE
        );



        richiesta.onupgradeneeded = function(event){


            db = event.target.result;



            let archivio;



            if(
                !db.objectStoreNames
                .contains(TABELLA_LIBRI)
            ){


                archivio =
                db.createObjectStore(
                    TABELLA_LIBRI,
                    {
                        keyPath:"id",
                        autoIncrement:true
                    }
                );


            }
            else {


                archivio =
                event.target
                .transaction
                .objectStore(
                    TABELLA_LIBRI
                );


            }





            if(
                !archivio.indexNames
                .contains("titolo")
            ){

                archivio.createIndex(
                    "titolo",
                    "titolo",
                    {
                        unique:false
                    }
                );

            }



            if(
                !archivio.indexNames
                .contains("autore")
            ){

                archivio.createIndex(
                    "autore",
                    "autore",
                    {
                        unique:false
                    }
                );

            }



            if(
                !archivio.indexNames
                .contains("stato")
            ){

                archivio.createIndex(
                    "stato",
                    "stato",
                    {
                        unique:false
                    }
                );

            }



        };





        richiesta.onsuccess=function(event){


            db =
            event.target.result;


            resolve(db);


        };





        richiesta.onerror=function(event){


            console.error(
                "Errore database",
                event.target.error
            );


            reject(
                event.target.error
            );


        };



    });


}







// INSERIMENTO LIBRO


function salvaLibroDatabase(libro){


    return new Promise((resolve,reject)=>{


        const transazione =
        db.transaction(
            TABELLA_LIBRI,
            "readwrite"
        );


        const archivio =
        transazione.objectStore(
            TABELLA_LIBRI
        );



        const richiesta =
        archivio.add(libro);



        richiesta.onsuccess=()=>{

            resolve(true);

        };


        richiesta.onerror=()=>{

            reject(false);

        };


    });


}








// RECUPERO LIBRI


function recuperaLibri(){


    return new Promise((resolve,reject)=>{


        const transazione =
        db.transaction(
            TABELLA_LIBRI,
            "readonly"
        );


        const archivio =
        transazione.objectStore(
            TABELLA_LIBRI
        );



        const richiesta =
        archivio.getAll();



        richiesta.onsuccess=()=>{


            resolve(
                richiesta.result
            );


        };



        richiesta.onerror=()=>{


            reject([]);


        };



    });


}








// ELIMINAZIONE


function eliminaLibro(id){


    return new Promise((resolve,reject)=>{


        const transazione =
        db.transaction(
            TABELLA_LIBRI,
            "readwrite"
        );


        const archivio =
        transazione.objectStore(
            TABELLA_LIBRI
        );



        const richiesta =
        archivio.delete(id);



        richiesta.onsuccess=()=>{

            resolve(true);

        };


        richiesta.onerror=()=>{

            reject(false);

        };


    });


}








// MODIFICA LIBRO


function aggiornaLibro(libro){


    return new Promise((resolve,reject)=>{


        const transazione =
        db.transaction(
            TABELLA_LIBRI,
            "readwrite"
        );


        const archivio =
        transazione.objectStore(
            TABELLA_LIBRI
        );



        const richiesta =
        archivio.put(libro);



        richiesta.onsuccess=()=>{

            resolve(true);

        };



        richiesta.onerror=()=>{

            reject(false);

        };


    });


}
