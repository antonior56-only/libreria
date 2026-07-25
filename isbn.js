/* ===================================
   LA MIA LIBRERIA
   Ricerca ISBN - versione 1.4
   Fonte primaria: Google Books
   Riserva: Open Library
=================================== */


async function cercaISBN(){


    const campo =
    document.getElementById("isbn");


    const isbn =
    normalizzaIsbn(campo.value);



    if(!isbn){

        alert(
        "Inserire un ISBN valido (10 o 13 cifre, i trattini sono ammessi)."
        );

        campo.focus();

        return;

    }


    campo.value = isbn;



    // controllo duplicati prima di perdere tempo con la rete
    if(typeof trovaDuplicati === "function"){


        const doppi =
        trovaDuplicati(
            isbn,
            (typeof libroInModifica !== "undefined" && libroInModifica)
            ? libroInModifica.id
            : null
        );


        if(doppi.length){


            const procedi = confirm(
            "Questo ISBN è già in biblioteca:\n\n" +
            descriviDuplicato(doppi[0]) +
            "\n\nCercare comunque i dati?"
            );


            if(!procedi){

                return;

            }


        }


    }



    const bottone =
    document.getElementById("cercaISBN");

    const etichetta = bottone.textContent;

    bottone.disabled = true;

    bottone.textContent = "⏳ Ricerca in corso...";



    try {


        const dati = await recuperaDatiIsbn(isbn);


        const fonte = dati ? dati.fonte : "";


        if(!dati){

            alert(
            "Libro non trovato né su Google Books né su Open Library. Inserimento manuale."
            );

            return;

        }



        compilaModulo(dati);


        alert("Dati recuperati da " + fonte + ".");


    }
    catch(errore){


        console.error("Errore ricerca ISBN", errore);


        alert(
        "Ricerca non riuscita: controlla la connessione e riprova."
        );


    }
    finally {


        bottone.disabled = false;

        bottone.textContent = etichetta;


    }


}






// RECUPERO DATI (riutilizzabile anche dalla coda di scansione)


async function recuperaDatiIsbn(isbn){


    let dati = null;


    try {

        dati = await recuperaDaGoogleBooks(isbn);


        if(dati){

            dati.fonte = "Google Books";

            return dati;

        }


    }
    catch(errore){

        console.warn("Google Books non disponibile", errore);

    }



    try {

        dati = await recuperaDaOpenLibrary(isbn);


        if(dati){

            dati.fonte = "Open Library";

            return dati;

        }


    }
    catch(errore){

        console.warn("Open Library non disponibile", errore);

    }



    return null;


}






// PULIZIA CODICE


function normalizzaIsbn(grezzo){


    const pulito =
    String(grezzo || "")
    .replace(/[^0-9Xx]/g, "")
    .toUpperCase();


    if(pulito.length === 10 || pulito.length === 13){

        return pulito;

    }


    return "";


}






// FONTE 1: GOOGLE BOOKS


async function recuperaDaGoogleBooks(isbn){


    const indirizzo =
    "https://www.googleapis.com/books/v1/volumes" +
    "?q=isbn:" + isbn +
    "&country=IT";



    const risposta =
    await fetch(indirizzo);


    if(!risposta.ok){

        throw new Error("Risposta HTTP " + risposta.status);

    }



    const json =
    await risposta.json();


    if(
        !json.items ||
        json.items.length === 0
    ){

        return null;

    }



    const info =
    json.items[0].volumeInfo || {};



    return {


        titolo:
        info.subtitle
        ? (info.title || "") + ". " + info.subtitle
        : (info.title || ""),


        autori:
        (info.authors || []).join(", "),


        anno:
        String(info.publishedDate || "")
        .match(/\d{4}/)?.[0] || "",


        editore:
        info.publisher || "",


        copertina:
        miglioreCopertina(info.imageLinks),


        pagine:
        info.pageCount || "",


        soggetti:
        (info.categories || [])
        .slice(0, 3)
        .join(", ")


    };


}



function miglioreCopertina(immagini){


    if(!immagini){

        return "";

    }


    const scelta =
    immagini.extraLarge ||
    immagini.large ||
    immagini.medium ||
    immagini.thumbnail ||
    immagini.smallThumbnail ||
    "";


    // Google restituisce link http e con arricciatura grafica
    return scelta
    .replace(/^http:\/\//i, "https://")
    .replace(/&edge=curl/gi, "");


}






// FONTE 2: OPEN LIBRARY


async function recuperaDaOpenLibrary(isbn){


    const indirizzo =
    "https://openlibrary.org/api/books" +
    "?bibkeys=ISBN:" + isbn +
    "&format=json&jscmd=data";



    const risposta =
    await fetch(indirizzo);


    if(!risposta.ok){

        throw new Error("Risposta HTTP " + risposta.status);

    }



    const json =
    await risposta.json();


    const libro =
    json["ISBN:" + isbn];


    if(!libro){

        return null;

    }



    return {


        titolo:
        libro.title || "",


        autori:
        (libro.authors || [])
        .map(function(a){ return a.name; })
        .filter(Boolean)
        .join(", "),


        anno:
        (libro.publish_date || "")
        .match(/\d{4}/)?.[0] || "",


        editore:
        (libro.publishers || [])
        .map(function(p){ return p.name; })
        .filter(Boolean)
        .join(", "),


        copertina:
        libro.cover?.large ||
        libro.cover?.medium ||
        "",


        pagine:
        libro.number_of_pages || "",


        soggetti:
        (libro.subjects || [])
        .slice(0, 3)
        .map(function(s){ return s.name; })
        .filter(Boolean)
        .join(", ")


    };


}






// COMPILAZIONE CAMPI


function compilaModulo(dati){


    if(dati.titolo){

        document.getElementById("titolo").value = dati.titolo;

    }


    if(dati.autori){

        document.getElementById("autore").value = dati.autori;

    }


    if(dati.anno){

        document.getElementById("anno").value = dati.anno;

    }


    if(dati.copertina){

        document.getElementById("copertina").value = dati.copertina;

    }


    if(dati.editore){

        aggiungiNota("Editore: " + dati.editore);

    }


    if(dati.pagine){

        aggiungiNota("Pagine: " + dati.pagine);

    }


    if(dati.soggetti){

        aggiungiNota("Argomenti: " + dati.soggetti);

    }


}






// NOTE


function aggiungiNota(testo){


    const campo =
    document.getElementById("note");


    if(campo.value.includes(testo)){

        return;

    }


    if(campo.value){

        campo.value += "\n";

    }


    campo.value += testo;


}
