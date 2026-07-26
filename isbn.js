/* ===================================
   LA MIA LIBRERIA
   Ricerca ISBN e titolo - versione 2.2
   Quattro strategie in cascata + diagnostica visibile
=================================== */


/* ---------------------------------------------------------------
   CHIAVE CONDIVISA

   Serve perché chi apre l'app dal tuo sito abbia la ricerca ISBN
   funzionante senza configurare nulla.

   COME PREPARARLA
   1. apri una qualsiasi pagina nel browser e premi F12
   2. nella Console scrivi:  btoa("LA-TUA-CHIAVE")
   3. copia il risultato e spezzalo a metà
   4. incolla le due metà qui sotto

   La codifica NON è sicurezza: serve solo a non far scattare i
   robot che setacciano GitHub cercando stringhe "AIza...".
   La protezione vera è la restrizione nella console Google Cloud:
     - Restrizioni applicazioni: Siti web
       -> https://antonior56-only.github.io/*
     - Restrizioni API: solo Books API
     - Nessuna fatturazione attiva sul progetto

   Una chiave personale inserita nelle Impostazioni ha comunque
   la precedenza su questa.
--------------------------------------------------------------- */

const CHIAVE_PARTE_1 = "";

const CHIAVE_PARTE_2 = "";


// in alternativa, chiave in chiaro (se preferisci la semplicità)
const CHIAVE_PREDEFINITA = "";



function chiavePredefinita(){


    const chiara = String(CHIAVE_PREDEFINITA || "").trim();


    if(chiara){

        return chiara;

    }


    const codificata =
    String(CHIAVE_PARTE_1 || "") + String(CHIAVE_PARTE_2 || "");


    if(!codificata){

        return "";

    }


    try {

        return atob(codificata.trim()).trim();

    }
    catch(errore){

        console.warn(
        "Chiave condivisa non decodificabile: controlla le due metà",
        errore
        );

        return "";

    }


}



let ultimaDiagnostica = [];

let risultatiTrovati = [];



async function cercaISBN(){


    const campo = document.getElementById("isbn");


    const isbn = normalizzaIsbn(campo.value);



    if(!isbn){


        const grezzo = String(campo.value || "").trim();


        // se sembra un titolo (contiene parole) si propone
        // la ricerca per titolo invece di rifiutare
        if(
            /[a-zA-Z]{3}/.test(grezzo) &&
            typeof cercaPerTitolo === "function" &&
            document.getElementById("titoloRicerca")
        ){


            const perTitolo = confirm(
            "«" + grezzo + "» non sembra un ISBN.\n\n" +
            "Vuoi cercarlo come titolo?"
            );


            if(perTitolo){


                document.getElementById("titoloRicerca").value = grezzo;

                campo.value = "";


                await cercaPerTitolo();


                return;


            }


            return;


        }



        alert(
        "Inserire un ISBN valido (10 o 13 cifre, i trattini sono ammessi).\n\n" +
        "Per cercare per titolo usa il campo «Oppure cerca per titolo» qui sotto."
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


    return mappaVolumeGoogle(json.items[0]);


}



function mappaVolumeGoogle(volume){


    const info = (volume && volume.volumeInfo) || {};


    const identificativi = info.industryIdentifiers || [];


    function codice(tipo){

        const voce = identificativi.find(function(i){
            return i.type === tipo;
        });

        return voce ? voce.identifier : "";

    }


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

        soggetti: (info.categories || []).slice(0, 3).join(", "),

        isbn: codice("ISBN_13") || codice("ISBN_10") || ""

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


    if(dati.isbn){

        const campoIsbn = document.getElementById("isbn");

        if(campoIsbn && !campoIsbn.value.trim()){

            campoIsbn.value = normalizzaIsbn(dati.isbn) || dati.isbn;

        }

    }


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






/* ===================================
   RICERCA PER TITOLO
=================================== */


async function cercaPerTitolo(){


    const campo = document.getElementById("titoloRicerca");

    const testo = String(campo.value || "").trim();


    if(testo.length < 3){

        alert("Scrivi almeno tre lettere del titolo.");

        campo.focus();

        return;

    }



    const bottone = document.getElementById("cercaTitolo");

    const etichetta = bottone.textContent;

    bottone.disabled = true;

    bottone.textContent = "⏳ Ricerca in corso...";


    ultimaDiagnostica = [];

    svuotaRisultati();



    try {


        let trovati = [];


        try {

            trovati = await googleElenco(testo);

            ultimaDiagnostica.push(
            "Google Books: " + trovati.length + " risultati"
            );

        }
        catch(errore){

            ultimaDiagnostica.push(
            "Google Books: " + spiegaErrore(errore)
            );

        }



        if(trovati.length === 0){


            try {

                trovati = await openLibraryElenco(testo);

                ultimaDiagnostica.push(
                "Open Library: " + trovati.length + " risultati"
                );

            }
            catch(errore){

                ultimaDiagnostica.push(
                "Open Library: " + spiegaErrore(errore)
                );

            }


        }



        risultatiTrovati = scartaDoppioni(trovati);


        mostraRisultati();


        scriviEsito(riepilogoDiagnostica());


        if(risultatiTrovati.length === 0){

            alert(
            "Nessun libro trovato con questo titolo.\n\n" +
            riepilogoDiagnostica()
            );

        }


    }
    finally {


        bottone.disabled = false;

        bottone.textContent = etichetta;


    }


}






function scartaDoppioni(elenco){


    const viste = new Set();


    return elenco.filter(function(libro){


        const chiave =
        String(libro.titolo || "").toLowerCase().trim() + "|" +
        String(libro.autori || "").toLowerCase().trim();


        if(!libro.titolo || viste.has(chiave)){

            return false;

        }


        viste.add(chiave);

        return true;


    }).slice(0, 8);


}






// ELENCO DA GOOGLE BOOKS


async function googleElenco(testo){


    const chiave =
    (typeof chiaveGoogle === "function") ? chiaveGoogle() : "";


    if(!chiave){

        throw new Error("SENZA_CHIAVE");

    }



    const risposta = await fetch(
        "https://www.googleapis.com/books/v1/volumes?q=" +
        encodeURIComponent(testo) +
        "&maxResults=8&printType=books&key=" +
        encodeURIComponent(chiave)
    );


    if(!risposta.ok){

        throw new Error(await descriviRisposta(risposta));

    }


    const json = await risposta.json();


    if(!json.items){

        return [];

    }



    return json.items.map(function(voce){


        const info = voce.volumeInfo || {};


        const codici = info.industryIdentifiers || [];


        const isbn13 =
        (codici.find(function(c){ return c.type === "ISBN_13"; }) || {})
        .identifier || "";


        const isbn10 =
        (codici.find(function(c){ return c.type === "ISBN_10"; }) || {})
        .identifier || "";



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

            soggetti: (info.categories || []).slice(0, 3).join(", "),

            isbn: isbn13 || isbn10,

            fonte: "Google Books"

        };


    });


}






// ELENCO DA OPEN LIBRARY


async function openLibraryElenco(testo){


    const risposta = await fetch(
        "https://openlibrary.org/search.json?q=" +
        encodeURIComponent(testo) + "&limit=8"
    );


    if(!risposta.ok){

        throw new Error(await descriviRisposta(risposta));

    }


    const json = await risposta.json();


    if(!json.docs){

        return [];

    }



    return json.docs.map(function(doc){


        return {

            titolo: doc.title || "",

            autori: (doc.author_name || []).join(", "),

            anno:
            doc.first_publish_year ? String(doc.first_publish_year) : "",

            editore: (doc.publisher || [])[0] || "",

            copertina:
            doc.cover_i
            ? "https://covers.openlibrary.org/b/id/" + doc.cover_i + "-L.jpg"
            : "",

            pagine: doc.number_of_pages_median || "",

            soggetti: (doc.subject || []).slice(0, 3).join(", "),

            isbn: (doc.isbn || [])[0] || "",

            fonte: "Open Library"

        };


    });


}






// ELENCO A SCHERMO


function proteggi(testo){


    return (typeof testoSicuro === "function")
    ? testoSicuro(testo)
    : String(testo ?? "");


}



function mostraRisultati(){


    const riquadro = document.getElementById("risultatiRicerca");


    if(!riquadro){

        return;

    }


    if(risultatiTrovati.length === 0){

        riquadro.hidden = true;

        riquadro.innerHTML = "";

        return;

    }



    riquadro.hidden = false;


    riquadro.innerHTML =

    "<p class='contatore'>" + risultatiTrovati.length +
    " risultati da " + proteggi(risultatiTrovati[0].fonte) +
    " — scegli quello giusto:</p>" +

    risultatiTrovati.map(function(libro, indice){


        const dettagli =
        [libro.anno, libro.editore, libro.pagine ? libro.pagine + " pagine" : ""]
        .filter(function(v){ return v; })
        .map(proteggi)
        .join(" · ");


        return `<div class="risultato">

        ${
        /^https?:\/\//i.test(libro.copertina)
        ? `<img src="${proteggi(libro.copertina)}" alt="" width="46">`
        : "<span class='senza-copertina'>📕</span>"
        }

        <div class="dati-risultato">

            <strong>${proteggi(libro.titolo)}</strong>

            <span>${proteggi(libro.autori) || "autore non indicato"}</span>

            <span class="contatore">${dettagli}</span>

            ${libro.isbn ? `<span class="contatore">ISBN ${proteggi(libro.isbn)}</span>` : ""}

        </div>

        <button type="button" data-indice="${indice}">Usa questo</button>

        </div>`;


    }).join("");


}



function svuotaRisultati(){


    risultatiTrovati = [];

    mostraRisultati();


}



function gestisciClickRisultati(evento){


    const bottone = evento.target.closest("button[data-indice]");


    if(!bottone){

        return;

    }


    usaRisultato(Number(bottone.dataset.indice));


}



function usaRisultato(indice){


    const libro = risultatiTrovati[indice];


    if(!libro){

        return;

    }



    if(libro.isbn && typeof trovaDuplicati === "function"){


        const doppi = trovaDuplicati(libro.isbn, null);


        if(doppi.length){


            const procedi = confirm(
            "Attenzione, in biblioteca c'è già:\n\n" +
            descriviDuplicato(doppi[0]) +
            "\n\nCompilare lo stesso il modulo?"
            );


            if(!procedi){

                return;

            }


        }


    }



    if(libro.isbn){

        document.getElementById("isbn").value =
        normalizzaIsbn(libro.isbn) || libro.isbn;

    }


    compilaModulo({
        titolo:    libro.titolo,
        autori:    libro.autori,
        anno:      libro.anno,
        copertina: libro.copertina,
        editore:   libro.editore,
        pagine:    libro.pagine,
        soggetti:  libro.soggetti
    });


    svuotaRisultati();


    document.getElementById("titoloRicerca").value = "";


    document.getElementById("titolo")
    .scrollIntoView({ behavior: "smooth", block: "center" });


}






// INVIO DA TASTIERA NEI DUE CAMPI DI RICERCA


document.addEventListener("DOMContentLoaded", function(){


    const campoIsbn = document.getElementById("isbn");


    if(campoIsbn){

        campoIsbn.addEventListener("keydown", function(evento){

            if(evento.key === "Enter"){

                evento.preventDefault();

                cercaISBN();

            }

        });

    }



    const campoTitolo = document.getElementById("titoloRicerca");


    if(campoTitolo){

        campoTitolo.addEventListener("keydown", function(evento){

            if(evento.key === "Enter"){

                evento.preventDefault();

                cercaPerTitolo();

            }

        });

    }


});
