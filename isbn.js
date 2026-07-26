/* ===================================
   LA MIA LIBRERIA
   Ricerca ISBN - versione 1.9
   Quattro strategie in cascata + diagnostica visibile
=================================== */


/* ---------------------------------------------------------------
   CHIAVE CONDIVISA

   Incolla qui sotto la tua chiave Google Books per farla usare a
   chiunque apra l'app dal tuo sito, senza che debba configurare
   nulla. Lasciala vuota se preferisci che ognuno metta la propria
   nelle Impostazioni.

   Se la usi, nella console Google Cloud imposta:
     - Restrizioni applicazioni: Siti web
       -> https://antonior56-only.github.io/*
     - Restrizioni API: solo Books API
     - Nessuna fatturazione attiva sul progetto

   Una chiave personale inserita in Impostazioni ha comunque
   la precedenza su questa.
--------------------------------------------------------------- */

const CHIAVE_PREDEFINITA = "";



let ultimaDiagnostica = [];



async function cercaISBN(){


    const campo = document.getElementById("isbn");


    const isbn = normalizzaIsbn(campo.value);



    if(!isbn){

        alert(
        "Inserire un ISBN valido (10 o 13 cifre, i trattini sono ammessi)."
        );

        campo.focus();

        return;

    }


    campo.value = isbn;



    if(typeof trovaDuplicati === "function"){


        const doppi = trovaDuplicati(
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



    const bottone = document.getElementById("cercaISBN");

    const etichetta = bottone.textContent;

    bottone.disabled = true;

    bottone.textContent = "⏳ Ricerca in corso...";


    scriviEsito("Interrogazione delle fonti...");



    try {


        const dati = await recuperaDatiIsbn(isbn);


        scriviEsito(riepilogoDiagnostica());


        if(!dati){

            alert(
            "Nessuna fonte ha i dati di questo ISBN.\n\n" +
            riepilogoDiagnostica() +
            "\n\nPuoi inserire i dati a mano."
            );

            return;

        }


        compilaModulo(dati);


        alert("Dati recuperati da " + dati.fonte + ".");


    }
    catch(errore){


        console.error("Errore ricerca ISBN", errore);

        scriviEsito("Errore: " + errore.message);

        alert("Ricerca non riuscita: " + errore.message);


    }
    finally {


        bottone.disabled = false;

        bottone.textContent = etichetta;


    }


}






// RIQUADRO DIAGNOSTICO (creato al volo, non serve toccare l'HTML)


function scriviEsito(testo){


    let riquadro = document.getElementById("esitoRicerca");


    if(!riquadro){


        const bottone = document.getElementById("cercaISBN");


        if(!bottone || !bottone.parentNode){

            return;

        }


        riquadro = document.createElement("p");

        riquadro.id = "esitoRicerca";

        riquadro.className = "contatore";

        riquadro.style.whiteSpace = "pre-line";


        bottone.parentNode.insertBefore(
            riquadro,
            bottone.nextSibling
        );


    }


    riquadro.textContent = testo;


}



function riepilogoDiagnostica(){


    return ultimaDiagnostica.join("\n");


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



// Google indicizza a volte solo una delle due forme del codice
function isbn10Da13(isbn13){


    if(!/^978\d{10}$/.test(isbn13)){

        return "";

    }


    const corpo = isbn13.slice(3, 12);


    let somma = 0;


    for(let i = 0; i < 9; i++){

        somma += (10 - i) * Number(corpo[i]);

    }


    const resto = (11 - (somma % 11)) % 11;


    return corpo + (resto === 10 ? "X" : String(resto));


}






// CASCATA DI RICERCA


async function recuperaDatiIsbn(isbn){


    ultimaDiagnostica = [];


    const isbn10 = isbn.length === 13 ? isbn10Da13(isbn) : "";


    const strategie = [

        {
            nome: "Google Books (isbn:" + isbn + ")",
            fonte: "Google Books",
            esegui: function(){
                return googleConTentativi("q=isbn:" + isbn);
            }
        },

        isbn10 ? {
            nome: "Google Books (isbn:" + isbn10 + ")",
            fonte: "Google Books",
            esegui: function(){
                return googleConTentativi("q=isbn:" + isbn10);
            }
        } : null,

        {
            nome: "Open Library (api/books)",
            fonte: "Open Library",
            esegui: function(){
                return openLibraryDati(isbn);
            }
        },

        {
            nome: "Open Library (search)",
            fonte: "Open Library",
            esegui: function(){
                return openLibraryRicerca(isbn);
            }
        },

        {
            nome: "Google Books (ricerca libera)",
            fonte: "Google Books",
            esegui: function(){
                return googleConTentativi("q=" + isbn);
            }
        }

    ].filter(Boolean);



    for(const strategia of strategie){


        try {


            const dati = await strategia.esegui();


            if(dati && dati.titolo){

                ultimaDiagnostica.push(strategia.nome + ": trovato ✅");

                dati.fonte = strategia.fonte;

                return dati;

            }


            ultimaDiagnostica.push(strategia.nome + ": nessun risultato");


        }
        catch(errore){


            ultimaDiagnostica.push(
                strategia.nome + ": " + spiegaErrore(errore)
            );


        }


    }


    return null;


}



function dettaglio(messaggio){


    const parti = String(messaggio).split(" — ");


    return parti.length > 1 ? "[" + parti.slice(1).join(" — ") + "]" : "";


}



function spiegaErrore(errore){


    const messaggio = String(errore && errore.message || errore);


    if(messaggio.includes("SENZA_CHIAVE")){

        return "saltato: manca la chiave (Impostazioni → Chiave Google Books)";

    }


    if(/HTTP 5\d\d/.test(messaggio)){

        return messaggio +
        " — errore temporaneo del servizio, non della chiave: " +
        "riprovato 3 volte senza successo";

    }


    if(messaggio.includes("429")){

        return "quota esaurita: serve una chiave personale, " +
        "oppure quella salvata ha finito le richieste di oggi";

    }


    if(messaggio.includes("403")){


        if(messaggio.includes("referer")){

            return "403 — la chiave rifiuta questo sito: " +
            "controlla la restrizione «Siti web» nella console Google. " +
            dettaglio(messaggio);

        }


        if(
            messaggio.includes("has not been used") ||
            messaggio.includes("is disabled") ||
            messaggio.includes("accessNotConfigured")
        ){

            return "403 — Books API non abilitata su questo progetto. " +
            dettaglio(messaggio);

        }


        return "403 accesso negato. " + dettaglio(messaggio);


    }


    if(messaggio.includes("400")){

        return "400 — chiave non valida o malformata. " + dettaglio(messaggio);

    }


    if(messaggio.includes("Failed to fetch") || messaggio.includes("NetworkError")){

        return "nessuna risposta (rete assente o richiesta bloccata dal browser)";

    }


    return messaggio;


}






// TENTATIVI RIPETUTI SUGLI ERRORI TEMPORANEI (5xx)


const TENTATIVI_GOOGLE = [
    { attesa: 0,    extra: "" },
    { attesa: 1500, extra: "" },
    { attesa: 2500, extra: "&country=IT" }
];



async function googleConTentativi(interrogazione){


    let ultimoErrore = null;


    for(let i = 0; i < TENTATIVI_GOOGLE.length; i++){


        const tentativo = TENTATIVI_GOOGLE[i];


        if(tentativo.attesa){

            await pausa(tentativo.attesa);

        }


        try {


            const dati =
            await google(interrogazione + tentativo.extra);


            if(i > 0){

                ultimaDiagnostica.push(
                "   (riuscito al tentativo " + (i + 1) +
                (tentativo.extra ? " con country=IT" : "") + ")"
                );

            }


            return dati;


        }
        catch(errore){


            ultimoErrore = errore;


            const messaggio = String(errore.message || "");


            // si riprova solo sugli errori temporanei del servizio
            if(!/HTTP 5\d\d/.test(messaggio)){

                throw errore;

            }


            ultimaDiagnostica.push(
            "   (tentativo " + (i + 1) + ": " +
            messaggio.split(" — ")[0] + ", riprovo)"
            );


        }


    }


    throw ultimoErrore;


}



function pausa(millisecondi){


    return new Promise(function(resolve){

        setTimeout(resolve, millisecondi);

    });


}






// LETTURA DEL MOTIVO REALE DELL'ERRORE


async function descriviRisposta(risposta){


    let dettaglio = "";


    try {


        const corpo = await risposta.json();


        dettaglio =
        (corpo && corpo.error && corpo.error.message)
        ? String(corpo.error.message)
        : "";


    }
    catch(errore){

        dettaglio = "";

    }


    if(dettaglio.length > 200){

        dettaglio = dettaglio.slice(0, 200) + "...";

    }


    return "HTTP " + risposta.status +
    (dettaglio ? " — " + dettaglio : "");


}






// GOOGLE BOOKS


async function google(interrogazione){


    const chiave =
    (typeof chiaveGoogle === "function") ? chiaveGoogle() : "";


    // senza chiave personale Google risponde 429 a tutti:
    // meglio non sprecare la richiesta
    if(!chiave){

        throw new Error("SENZA_CHIAVE");

    }


    const risposta = await fetch(
        "https://www.googleapis.com/books/v1/volumes?" + interrogazione +
        "&key=" + encodeURIComponent(chiave)
    );


    if(!risposta.ok){

        throw new Error(await descriviRisposta(risposta));

    }


    const json = await risposta.json();


    if(!json.items || json.items.length === 0){

        return null;

    }


    const info = json.items[0].volumeInfo || {};


    return {

        titolo:
        info.subtitle
        ? (info.title || "") + ". " + info.subtitle
        : (info.title || ""),

        autori: (info.authors || []).join(", "),

        anno:
        String(info.publishedDate || "").match(/\d{4}/)?.[0] || "",

        editore: info.publisher || "",

        copertina: miglioreCopertina(info.imageLinks),

        pagine: info.pageCount || "",

        soggetti: (info.categories || []).slice(0, 3).join(", ")

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


    return scelta
    .replace(/^http:\/\//i, "https://")
    .replace(/&edge=curl/gi, "");


}






// OPEN LIBRARY - SCHEDA


async function openLibraryDati(isbn){


    const risposta = await fetch(
        "https://openlibrary.org/api/books?bibkeys=ISBN:" +
        isbn + "&format=json&jscmd=data"
    );


    if(!risposta.ok){

        throw new Error(await descriviRisposta(risposta));

    }


    const json = await risposta.json();

    const libro = json["ISBN:" + isbn];


    if(!libro){

        return null;

    }


    return {

        titolo: libro.title || "",

        autori:
        (libro.authors || [])
        .map(function(a){ return a.name; })
        .filter(Boolean)
        .join(", "),

        anno:
        (libro.publish_date || "").match(/\d{4}/)?.[0] || "",

        editore:
        (libro.publishers || [])
        .map(function(p){ return p.name; })
        .filter(Boolean)
        .join(", "),

        copertina:
        libro.cover?.large || libro.cover?.medium || "",

        pagine: libro.number_of_pages || "",

        soggetti:
        (libro.subjects || [])
        .slice(0, 3)
        .map(function(s){ return s.name; })
        .filter(Boolean)
        .join(", ")

    };


}






// OPEN LIBRARY - MOTORE DI RICERCA


async function openLibraryRicerca(isbn){


    const risposta = await fetch(
        "https://openlibrary.org/search.json?isbn=" +
        isbn + "&limit=1"
    );


    if(!risposta.ok){

        throw new Error(await descriviRisposta(risposta));

    }


    const json = await risposta.json();


    if(!json.docs || json.docs.length === 0){

        return null;

    }


    const doc = json.docs[0];


    return {

        titolo: doc.title || "",

        autori: (doc.author_name || []).join(", "),

        anno: doc.first_publish_year ? String(doc.first_publish_year) : "",

        editore: (doc.publisher || [])[0] || "",

        copertina:
        doc.cover_i
        ? "https://covers.openlibrary.org/b/id/" + doc.cover_i + "-L.jpg"
        : "",

        pagine: doc.number_of_pages_median || "",

        soggetti: (doc.subject || []).slice(0, 3).join(", ")

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


    const campo = document.getElementById("note");


    if(campo.value.includes(testo)){

        return;

    }


    if(campo.value){

        campo.value += "\n";

    }


    campo.value += testo;


}
