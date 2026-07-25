/* ===================================
   LA MIA LIBRERIA
   Ricerca ISBN - versione 1.2
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



    const bottone =
    document.getElementById("cercaISBN");

    const etichetta = bottone.textContent;

    bottone.disabled = true;

    bottone.textContent = "⏳ Ricerca in corso...";



    try {


        const dati =
        await recuperaDaOpenLibrary(isbn);


        if(!dati){

            alert(
            "Libro non trovato su Open Library. Inserimento manuale."
            );

            return;

        }


        compilaModulo(dati);


        alert("Dati libro recuperati.");


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






// CHIAMATA API


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


    if(dati.soggetti){

        aggiungiNota("Argomenti: " + dati.soggetti);

    }


}






// NOTE


function aggiungiNota(testo){


    const campo =
    document.getElementById("note");


    // evita di ripetere la stessa nota
    if(campo.value.includes(testo)){

        return;

    }


    if(campo.value){

        campo.value += "\n";

    }


    campo.value += testo;


}
