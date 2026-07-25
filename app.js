/* ===================================
   LA MIA LIBRERIA
   app.js versione 1.5
=================================== */


let libri = [];

let libroInModifica = null;

let statoAttivo = "";

let vistaAttiva = "libreria";

let filtroPosizione = null;

let coda = [];

let elaborazioneInCorso = false;


const GIORNI_PROMEMORIA_BACKUP = 30;


const CAMPI_MODULO = [
    "copertina",
    "titolo",
    "autore",
    "genere",
    "anno",
    "isbn",
    "stato",
    "voto",
    "stanza",
    "libreria",
    "scaffale",
    "prestatoA",
    "dataPrestito",
    "note"
];



document.addEventListener("DOMContentLoaded", async function(){


    inizializzaTema();


    try {

        await apriDatabase();

        await caricaLibri();

    }
    catch(errore){

        console.error("Errore apertura database", errore);

        alert("Impossibile aprire l'archivio locale. Ricarica la pagina.");

    }



    ascolta("salvaLibro",    "click",  salvaLibro);
    ascolta("annullaModifica","click", annullaModifica);
    ascolta("cercaISBN",     "click",  cercaISBN);
    ascolta("avviaScanner",  "click",  avviaScanner);
    ascolta("ricerca",       "input",  applicaFiltri);
    ascolta("ordinamento",   "change", applicaFiltri);
    ascolta("esportaBackup", "click",  esportaBackup);
    ascolta("importaBackup", "change", importaBackup);
    ascolta("temaScuro",     "click",  cambiaTema);
    ascolta("listaLibri",    "click",  gestisciClickLista);
    ascolta("filtriStato",   "click",  gestisciClickChip);
    ascolta("navigazione",   "click",  gestisciClickNavigazione);
    ascolta("elaboraCoda",   "click",  elaboraCoda);
    ascolta("svuotaCoda",    "click",  svuotaCoda);
    ascolta("alberoPosizioni","click", gestisciClickPosizioni);
    ascolta("rimuoviFiltroPosizione","click", function(){ impostaFiltroPosizione(null); });
    ascolta("backupOra",     "click",  function(){ esportaBackup(); });
    ascolta("backupDopo",    "click",  rinviaPromemoriaBackup);
    ascolta("scaricaCopertine","click", scaricaCopertineMancanti);
    ascolta("salvaChiave",   "click",  salvaChiaveGoogle);
    ascolta("provaChiave",   "click",  provaChiaveGoogle);


    mostraStatoChiave();


});



function ascolta(id, evento, funzione){


    const elemento = document.getElementById(id);


    if(elemento){

        elemento.addEventListener(evento, funzione);

    }
    else {

        console.warn("Elemento assente nell'HTML:", id);

    }


}






// NAVIGAZIONE


function cambiaVista(nome){


    vistaAttiva = nome;


    const viste = {
        libreria:    "vistaLibreria",
        aggiungi:    "vistaAggiungi",
        posizioni:   "vistaPosizioni",
        statistiche: "vistaStatistiche"
    };


    Object.keys(viste).forEach(function(chiave){

        const sezione = document.getElementById(viste[chiave]);

        if(sezione){

            sezione.hidden = (chiave !== nome);

        }

    });



    document.querySelectorAll("#navigazione button")
    .forEach(function(b){

        b.classList.toggle("attivo", b.dataset.vista === nome);

    });


    if(nome === "posizioni"){

        mostraPosizioni();

    }


    window.scrollTo({ top: 0, behavior: "smooth" });


}



function gestisciClickNavigazione(evento){


    const bottone = evento.target.closest("button[data-vista]");


    if(!bottone){

        return;

    }


    if(
        bottone.dataset.vista !== "aggiungi" &&
        typeof fermaScanner === "function"
    ){

        fermaScanner();

    }


    cambiaVista(bottone.dataset.vista);


}






// FILTRI RAPIDI


function gestisciClickChip(evento){


    const chip = evento.target.closest("button[data-stato]");


    if(!chip){

        return;

    }


    statoAttivo = chip.dataset.stato;


    document.querySelectorAll("#filtriStato .chip")
    .forEach(function(c){

        c.classList.toggle("attivo", c === chip);

    });


    applicaFiltri();


}



function aggiornaConteggiChip(){


    document.querySelectorAll("#filtriStato .chip")
    .forEach(function(chip){


        const stato = chip.dataset.stato;

        let numero;


        if(stato === "__prestito"){

            numero = libri.filter(inPrestito).length;

        }
        else if(stato){

            numero = libri.filter(function(l){
                return l.stato === stato;
            }).length;

        }
        else {

            numero = libri.length;

        }


        const etichetta = chip.querySelector(".chip-conteggio");


        if(etichetta){

            etichetta.textContent = numero;

        }


    });


}



function inPrestito(libro){


    return Boolean(
        libro.prestatoA &&
        String(libro.prestatoA).trim()
    );


}






// CARICAMENTO


async function caricaLibri(){


    try {

        libri = await recuperaLibri();

    }
    catch(errore){

        console.error("Errore lettura libri", errore);

        libri = [];

    }


    aggiornaConteggiChip();

    aggiornaSuggerimentiPosizione();

    applicaFiltri();

    aggiornaStatistiche();

    controllaPromemoriaBackup();


    if(vistaAttiva === "posizioni"){

        mostraPosizioni();

    }

}






// DUPLICATI


function soloCodice(valore){


    return String(valore ?? "")
    .replace(/[^0-9Xx]/g, "")
    .toUpperCase();


}



function chiaveTitolo(libro){


    return (
        String(libro.titolo ?? "").trim().toLowerCase() +
        "|" +
        String(libro.autore ?? "").trim().toLowerCase()
    );


}



function trovaDuplicati(isbn, escludiId){


    const chiave = soloCodice(isbn);


    if(!chiave){

        return [];

    }


    return libri.filter(function(l){

        return soloCodice(l.isbn) === chiave && l.id !== escludiId;

    });


}



function descriviDuplicato(libro){


    const quando =
    libro.data
    ? new Date(libro.data).toLocaleDateString("it-IT")
    : "data non registrata";


    const dove =
    [libro.stanza, libro.libreria, libro.scaffale]
    .filter(function(v){ return v; })
    .join(" · ");


    return "«" + libro.titolo + "»" +
    "\nInserito il: " + quando +
    (dove ? "\nPosizione: " + dove : "");


}






// SALVATAGGIO


async function salvaLibro(){


    const titolo = valore("titolo");


    if(!titolo){

        alert("Il titolo è obbligatorio.");

        document.getElementById("titolo").focus();

        return;

    }



    const isbn = soloCodice(valore("isbn"));


    const doppi = trovaDuplicati(
        isbn,
        libroInModifica ? libroInModifica.id : null
    );


    if(doppi.length){


        const procedi = confirm(
        "Questo ISBN è già presente in biblioteca:\n\n" +
        descriviDuplicato(doppi[0]) +
        "\n\nSalvare comunque una seconda copia?"
        );


        if(!procedi){

            return;

        }


    }



    const libro = {

        titolo:       titolo,
        autore:       valore("autore"),
        copertina:    valore("copertina"),
        genere:       valore("genere"),
        anno:         valore("anno") ? Number(valore("anno")) : null,
        isbn:         isbn,
        stato:        valore("stato"),
        voto:         Number(valore("voto")) || 0,
        stanza:       valore("stanza"),
        libreria:     valore("libreria"),
        scaffale:     valore("scaffale"),
        prestatoA:    valore("prestatoA"),
        dataPrestito: valore("dataPrestito"),
        note:         valore("note")

    };



    // copertina salvata dentro l'app
    if(libroInModifica && libroInModifica.copertina === libro.copertina){

        libro.copertinaLocale = libroInModifica.copertinaLocale || "";

    }


    if(libro.copertina && !libro.copertinaLocale){

        libro.copertinaLocale =
        await scaricaCopertinaLocale(libro.copertina);

    }



    try {


        if(libroInModifica){

            libro.id = libroInModifica.id;

            libro.data =
            libroInModifica.data || new Date().toISOString();

            await aggiornaLibro(libro);

        }
        else {

            libro.data = new Date().toISOString();

            await salvaLibroDatabase(libro);

        }


    }
    catch(errore){

        console.error("Errore salvataggio", errore);

        alert("Salvataggio non riuscito.");

        return;

    }



    annullaModifica();

    await caricaLibri();


}



function valore(id){


    const elemento = document.getElementById(id);


    if(!elemento){

        return "";

    }


    return String(elemento.value).trim();


}






// COPERTINE SALVATE IN LOCALE


async function scaricaCopertinaLocale(url){


    if(!/^https?:\/\//i.test(String(url || ""))){

        return "";

    }


    try {


        const risposta = await fetch(url);


        if(!risposta.ok){

            throw new Error("HTTP " + risposta.status);

        }


        const blob = await risposta.blob();


        return await ridimensionaImmagine(blob, 400);


    }
    catch(errore){

        console.warn("Copertina non scaricabile:", url, errore);

        return "";

    }


}



function ridimensionaImmagine(blob, latoMassimo){


    return new Promise(function(resolve){


        const indirizzo = URL.createObjectURL(blob);

        const immagine = new Image();


        immagine.onload = function(){


            try {


                const scala =
                Math.min(1, latoMassimo / (immagine.width || latoMassimo));


                const tela = document.createElement("canvas");

                tela.width  = Math.max(1, Math.round(immagine.width  * scala));
                tela.height = Math.max(1, Math.round(immagine.height * scala));


                tela.getContext("2d")
                .drawImage(immagine, 0, 0, tela.width, tela.height);


                resolve(tela.toDataURL("image/jpeg", 0.8));


            }
            catch(errore){

                console.warn("Ridimensionamento non riuscito", errore);

                resolve("");

            }
            finally {

                URL.revokeObjectURL(indirizzo);

            }


        };


        immagine.onerror = function(){

            URL.revokeObjectURL(indirizzo);

            resolve("");

        };


        immagine.src = indirizzo;


    });


}



async function scaricaCopertineMancanti(){


    const stato = document.getElementById("statoCopertine");


    const daFare = libri.filter(function(l){

        return l.copertina && !l.copertinaLocale;

    });


    if(daFare.length === 0){

        stato.textContent =
        "Nessuna copertina da salvare: sono già tutte in locale.";

        return;

    }


    let salvate = 0;

    let fallite = 0;


    for(let i = 0; i < daFare.length; i++){


        const libro = daFare[i];


        stato.textContent =
        "Elaborazione " + (i + 1) + " di " + daFare.length + "...";


        const dati = await scaricaCopertinaLocale(libro.copertina);


        if(dati){


            try {

                await aggiornaLibro({ ...libro, copertinaLocale: dati });

                salvate++;

            }
            catch(errore){

                console.error("Errore aggiornamento copertina", errore);

                fallite++;

            }


        }
        else {

            fallite++;

        }


    }


    await caricaLibri();


    stato.textContent =
    "Copertine salvate: " + salvate +
    (fallite ? " · non scaricabili: " + fallite : "");


}






// VISUALIZZAZIONE


function mostraLibri(lista){


    const contenitore = document.getElementById("listaLibri");


    contenitore.innerHTML = "";



    if(lista.length === 0){

        contenitore.innerHTML =
        libri.length === 0
        ? "<p>Nessun libro inserito. Usa la scheda Aggiungi per cominciare.</p>"
        : "<p>Nessun libro corrisponde ai filtri attivi.</p>";

        return;

    }



    const frammento = document.createDocumentFragment();


    lista.forEach(function(libro){


        const div = document.createElement("div");

        div.className = "libro";


        const copertina = immagineLibro(libro);


        const stelle =
        "⭐".repeat(Math.min(5, Math.max(0, Number(libro.voto) || 0)));


        const posizione =
        [libro.stanza, libro.libreria, libro.scaffale]
        .filter(function(v){ return v; })
        .map(testoSicuro)
        .join(" · ");



        div.innerHTML = `

        ${
        copertina
        ? `<img src="${copertina}" alt="Copertina" width="80">`
        : "<span class=\"senza-copertina\">📖</span>"
        }

        <h3>${testoSicuro(libro.titolo)}</h3>

        ${
        inPrestito(libro)
        ? `<p class="badge-prestito">🤝 In prestito a
           ${testoSicuro(libro.prestatoA)}
           ${libro.dataPrestito ? " dal " + dataItaliana(libro.dataPrestito) : ""}
           </p>`
        : ""
        }

        <p>Autore: ${testoSicuro(libro.autore) || "-"}</p>

        <p>Genere: ${testoSicuro(libro.genere) || "-"}</p>

        <p>Anno: ${libro.anno ? testoSicuro(libro.anno) : "-"}</p>

        <p>Stato: ${testoSicuro(libro.stato) || "-"}</p>

        ${stelle ? `<p>Voto: ${stelle}</p>` : ""}

        ${posizione ? `<p>📍 ${posizione}</p>` : ""}

        ${libro.note ? `<p class="note">${testoSicuro(libro.note)}</p>` : ""}

        <div class="azioni-libro">

            <button type="button" data-azione="modifica" data-id="${libro.id}">
            ✏ Modifica
            </button>

            ${
            inPrestito(libro)
            ? `<button type="button" data-azione="restituito" data-id="${libro.id}">
               ↩ Restituito
               </button>`
            : ""
            }

            <button type="button" data-azione="elimina" data-id="${libro.id}">
            🗑 Elimina
            </button>

        </div>

        `;



        frammento.appendChild(div);


    });


    contenitore.appendChild(frammento);


}



function immagineLibro(libro){


    const locale = String(libro.copertinaLocale || "");


    if(locale.startsWith("data:image/")){

        return locale;

    }


    return urlSicuro(libro.copertina);


}



function dataItaliana(valore){


    const d = new Date(valore);


    return isNaN(d.getTime())
    ? testoSicuro(valore)
    : d.toLocaleDateString("it-IT");


}






// PROTEZIONE OUTPUT


function testoSicuro(valore){


    return String(valore ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");


}



function urlSicuro(url){


    const pulito = String(url ?? "").trim();


    if(!/^https?:\/\//i.test(pulito)){

        return "";

    }


    return testoSicuro(pulito);


}






// CLICK SULLA LISTA


function gestisciClickLista(evento){


    const bottone = evento.target.closest("button[data-azione]");


    if(!bottone){

        return;

    }


    const id = Number(bottone.dataset.id);


    if(bottone.dataset.azione === "modifica"){

        modificaLibro(id);

    }


    if(bottone.dataset.azione === "elimina"){

        cancellaLibro(id);

    }


    if(bottone.dataset.azione === "restituito"){

        segnaRestituito(id);

    }


}



async function segnaRestituito(id){


    const libro = libri.find(function(l){ return l.id === id; });


    if(!libro){

        return;

    }


    if(!confirm("«" + libro.titolo + "» è stato restituito?")){

        return;

    }


    try {

        await aggiornaLibro({
            ...libro,
            prestatoA: "",
            dataPrestito: ""
        });

    }
    catch(errore){

        console.error("Errore aggiornamento prestito", errore);

        alert("Aggiornamento non riuscito.");

        return;

    }


    await caricaLibri();


}






// MODIFICA


function modificaLibro(id){


    const libro = libri.find(function(l){ return l.id === id; });


    if(!libro){

        return;

    }


    libroInModifica = libro;



    CAMPI_MODULO.forEach(function(campo){


        const elemento = document.getElementById(campo);


        if(!elemento){

            return;

        }


        const dato = libro[campo] ?? "";


        if(elemento.tagName === "SELECT"){


            const esiste =
            Array.from(elemento.options).some(function(o){
                return o.value === String(dato);
            });


            elemento.value =
            esiste ? String(dato) : elemento.options[0].value;


        }
        else {

            elemento.value = dato;

        }


    });



    document.getElementById("titoloForm")
    .textContent = "✏ Modifica libro";

    document.getElementById("salvaLibro")
    .textContent = "💾 Aggiorna libro";

    document.getElementById("annullaModifica")
    .hidden = false;


    cambiaVista("aggiungi");


}



function ripristinaModulo(){


    libroInModifica = null;


    pulisciModulo();


    document.getElementById("titoloForm")
    .textContent = "➕ Aggiungi libro";

    document.getElementById("salvaLibro")
    .textContent = "💾 Salva libro";

    document.getElementById("annullaModifica")
    .hidden = true;


}



function annullaModifica(){


    ripristinaModulo();


    if(typeof fermaScanner === "function"){

        fermaScanner();

    }


    cambiaVista("libreria");


}






// CANCELLA


async function cancellaLibro(id){


    const libro = libri.find(function(l){ return l.id === id; });


    const nome = libro ? libro.titolo : "questo libro";


    if(!confirm("Eliminare «" + nome + "»?")){

        return;

    }


    try {

        await eliminaLibro(id);

    }
    catch(errore){

        console.error("Errore eliminazione", errore);

        alert("Eliminazione non riuscita.");

        return;

    }


    if(libroInModifica && libroInModifica.id === id){

        ripristinaModulo();

    }


    await caricaLibri();


}






// FILTRI


function applicaFiltri(){


    let risultato = [...libri];



    if(statoAttivo === "__prestito"){

        risultato = risultato.filter(inPrestito);

    }
    else if(statoAttivo){

        risultato = risultato.filter(function(libro){

            return libro.stato === statoAttivo;

        });

    }



    if(filtroPosizione){


        risultato = risultato.filter(function(libro){


            return ["stanza", "libreria", "scaffale"]
            .every(function(campo){


                if(!filtroPosizione[campo]){

                    return true;

                }


                return String(libro[campo] ?? "") ===
                filtroPosizione[campo];


            });


        });


    }



    const testo = valore("ricerca").toLowerCase();


    if(testo){


        risultato = risultato.filter(function(libro){


            const campi = [
                libro.titolo,
                libro.autore,
                libro.genere,
                libro.isbn,
                libro.stanza,
                libro.libreria,
                libro.scaffale,
                libro.prestatoA
            ];


            return campi.some(function(campo){

                return String(campo ?? "")
                .toLowerCase()
                .includes(testo);

            });


        });


    }



    const ordine = valore("ordinamento");


    if(ordine === "titolo"){

        risultato.sort(function(a,b){

            return String(a.titolo ?? "")
            .localeCompare(String(b.titolo ?? ""), "it");

        });

    }


    if(ordine === "autore"){

        risultato.sort(function(a,b){

            return String(a.autore ?? "")
            .localeCompare(String(b.autore ?? ""), "it");

        });

    }


    if(ordine === "voto"){

        risultato.sort(function(a,b){

            return (Number(b.voto) || 0) - (Number(a.voto) || 0);

        });

    }


    if(ordine === "data"){

        risultato.sort(function(a,b){

            return (b.id || 0) - (a.id || 0);

        });

    }



    aggiornaContatore(risultato.length);

    mostraLibri(risultato);


}



function aggiornaContatore(numero){


    const contatore = document.getElementById("contatoreRisultati");


    if(!contatore){

        return;

    }


    if(libri.length === 0){

        contatore.textContent = "";

        return;

    }


    contatore.textContent =
    numero === libri.length
    ? numero + (numero === 1 ? " libro" : " libri")
    : numero + " di " + libri.length + " libri";


}






// POSIZIONI


function alberoPosizioni(){


    const albero = {};


    libri.forEach(function(libro){


        const stanza   = libro.stanza   || "(stanza non indicata)";
        const libreria = libro.libreria || "(libreria non indicata)";
        const scaffale = libro.scaffale || "(scaffale non indicato)";


        albero[stanza] = albero[stanza] || {};

        albero[stanza][libreria] = albero[stanza][libreria] || {};

        albero[stanza][libreria][scaffale] =
        albero[stanza][libreria][scaffale] || [];


        albero[stanza][libreria][scaffale].push(libro);


    });


    return albero;


}



function mostraPosizioni(){


    const contenitore = document.getElementById("alberoPosizioni");


    if(!contenitore){

        return;

    }


    if(libri.length === 0){

        contenitore.textContent = "Nessuna posizione registrata";

        return;

    }



    const albero = alberoPosizioni();

    let html = "";



    Object.keys(albero).sort(function(a,b){
        return a.localeCompare(b, "it");
    })
    .forEach(function(stanza){


        const librerie = albero[stanza];


        let totaleStanza = 0;


        Object.keys(librerie).forEach(function(l){

            Object.keys(librerie[l]).forEach(function(s){

                totaleStanza += librerie[l][s].length;

            });

        });



        html += `<details class="nodo-stanza">
        <summary>🚪 ${testoSicuro(stanza)}
        <span class="conteggio">${totaleStanza}</span></summary>`;



        Object.keys(librerie).sort(function(a,b){
            return a.localeCompare(b, "it");
        })
        .forEach(function(libreria){


            const scaffali = librerie[libreria];


            let totaleLibreria = 0;


            Object.keys(scaffali).forEach(function(s){

                totaleLibreria += scaffali[s].length;

            });



            html += `<details class="nodo-libreria">
            <summary>🗄 ${testoSicuro(libreria)}
            <span class="conteggio">${totaleLibreria}</span></summary>`;



            Object.keys(scaffali).sort(function(a,b){
                return a.localeCompare(b, "it");
            })
            .forEach(function(scaffale){


                const elenco = scaffali[scaffale];


                html += `<div class="nodo-scaffale">

                <button type="button" class="riga-scaffale"
                data-stanza="${testoSicuro(stanza)}"
                data-libreria="${testoSicuro(libreria)}"
                data-scaffale="${testoSicuro(scaffale)}">
                📚 ${testoSicuro(scaffale)}
                <span class="conteggio">${elenco.length}</span>
                </button>

                <ul class="titoli-scaffale">`;


                elenco
                .slice()
                .sort(function(a,b){

                    return String(a.titolo ?? "")
                    .localeCompare(String(b.titolo ?? ""), "it");

                })
                .forEach(function(libro){

                    html += "<li>" + testoSicuro(libro.titolo) +
                    (libro.autore
                     ? " — <em>" + testoSicuro(libro.autore) + "</em>"
                     : "") +
                    (inPrestito(libro) ? " 🤝" : "") +
                    "</li>";

                });


                html += "</ul></div>";


            });


            html += "</details>";


        });


        html += "</details>";


    });



    contenitore.innerHTML = html;


}



function gestisciClickPosizioni(evento){


    const riga = evento.target.closest("button.riga-scaffale");


    if(!riga){

        return;

    }


    impostaFiltroPosizione({
        stanza:   riga.dataset.stanza,
        libreria: riga.dataset.libreria,
        scaffale: riga.dataset.scaffale
    });


    cambiaVista("libreria");


}



function impostaFiltroPosizione(posizione){


    // le etichette segnaposto non sono valori reali da filtrare
    if(posizione){

        ["stanza", "libreria", "scaffale"].forEach(function(campo){

            if(String(posizione[campo] || "").startsWith("(")){

                posizione[campo] = "";

            }

        });

    }


    filtroPosizione = posizione;


    const riquadro =
    document.getElementById("filtroPosizioneAttivo");

    const etichetta =
    document.getElementById("etichettaPosizione");


    if(riquadro && etichetta){


        if(posizione){


            etichetta.textContent =
            "📍 " +
            ["stanza", "libreria", "scaffale"]
            .map(function(c){ return posizione[c]; })
            .filter(function(v){ return v; })
            .join(" · ");


            riquadro.hidden = false;


        }
        else {

            riquadro.hidden = true;

        }


    }


    applicaFiltri();


}



function aggiornaSuggerimentiPosizione(){


    const mappa = {
        elencoStanze:    "stanza",
        elencoLibrerie:  "libreria",
        elencoScaffali:  "scaffale"
    };


    Object.keys(mappa).forEach(function(idElenco){


        const elenco = document.getElementById(idElenco);


        if(!elenco){

            return;

        }


        const valori = [...new Set(
            libri
            .map(function(l){ return l[mappa[idElenco]]; })
            .filter(function(v){ return v; })
        )].sort(function(a,b){ return a.localeCompare(b, "it"); });


        elenco.innerHTML =
        valori.map(function(v){

            return '<option value="' + testoSicuro(v) + '"></option>';

        }).join("");


    });


}






// CODA DI SCANSIONE


function aggiungiAllaCoda(codice){


    const isbn = soloCodice(codice);


    if(isbn.length !== 10 && isbn.length !== 13){

        return false;

    }


    if(coda.some(function(c){ return c.isbn === isbn; })){

        return false;

    }


    const doppi = trovaDuplicati(isbn, null);


    coda.push({
        isbn: isbn,
        giaPresente: doppi.length > 0,
        titoloEsistente: doppi.length ? doppi[0].titolo : ""
    });


    mostraCoda();


    return true;


}



function mostraCoda(){


    const riquadro = document.getElementById("codaScansione");

    const elenco   = document.getElementById("elencoCoda");

    const conta    = document.getElementById("contaCoda");


    if(!riquadro || !elenco || !conta){

        return;

    }


    riquadro.hidden = coda.length === 0;

    conta.textContent = coda.length;


    elenco.innerHTML =
    coda.map(function(voce){

        return "<li>" + testoSicuro(voce.isbn) +
        (voce.giaPresente
         ? ' <span class="segno-doppio">già presente: ' +
           testoSicuro(voce.titoloEsistente) + "</span>"
         : "") +
        "</li>";

    }).join("");


}



function svuotaCoda(){


    coda = [];

    mostraCoda();


    const avanzamento = document.getElementById("avanzamentoCoda");


    if(avanzamento){

        avanzamento.textContent = "";

    }


}



async function elaboraCoda(){


    if(elaborazioneInCorso){

        return;

    }


    const daAggiungere =
    coda.filter(function(v){ return !v.giaPresente; });


    const doppi = coda.length - daAggiungere.length;


    if(daAggiungere.length === 0){

        alert(
        "Nessun libro nuovo in coda" +
        (doppi ? " (" + doppi + " già presenti)." : ".")
        );

        return;

    }



    const posizione = {
        stanza:   valore("stanza"),
        libreria: valore("libreria"),
        scaffale: valore("scaffale")
    };


    const avanzamento = document.getElementById("avanzamentoCoda");

    const bottone = document.getElementById("elaboraCoda");


    elaborazioneInCorso = true;

    bottone.disabled = true;


    let aggiunti = 0;

    let senzaDati = 0;



    for(let i = 0; i < daAggiungere.length; i++){


        const voce = daAggiungere[i];


        if(avanzamento){

            avanzamento.textContent =
            "Elaborazione " + (i + 1) + " di " +
            daAggiungere.length + " (" + voce.isbn + ")...";

        }



        let dati = null;


        try {

            dati = await recuperaDatiIsbn(voce.isbn);

        }
        catch(errore){

            console.warn("Dati non recuperati per", voce.isbn, errore);

        }



        if(!dati){

            senzaDati++;

        }



        const libro = {

            titolo:
            (dati && dati.titolo) || "ISBN " + voce.isbn,

            autore:    dati ? dati.autori : "",
            copertina: dati ? dati.copertina : "",
            genere:    "Altro",
            anno:      dati && dati.anno ? Number(dati.anno) : null,
            isbn:      voce.isbn,
            stato:     "Da leggere",
            voto:      0,
            stanza:    posizione.stanza,
            libreria:  posizione.libreria,
            scaffale:  posizione.scaffale,
            prestatoA: "",
            dataPrestito: "",

            note:
            [
            dati && dati.editore ? "Editore: " + dati.editore : "",
            dati && dati.pagine  ? "Pagine: "  + dati.pagine  : "",
            dati ? "" : "Dati non trovati online: da completare"
            ].filter(function(v){ return v; }).join("\n"),

            data: new Date().toISOString()

        };



        if(libro.copertina){

            libro.copertinaLocale =
            await scaricaCopertinaLocale(libro.copertina);

        }



        try {

            await salvaLibroDatabase(libro);

            aggiunti++;

        }
        catch(errore){

            console.error("Errore salvataggio da coda", errore);

        }


    }



    elaborazioneInCorso = false;

    bottone.disabled = false;


    svuotaCoda();

    await caricaLibri();


    alert(
    "Aggiunti " + aggiunti + " libri." +
    (senzaDati ? "\n" + senzaDati + " senza dati online (da completare a mano)." : "") +
    (doppi ? "\n" + doppi + " saltati perché già presenti." : "")
    );


}






// STATISTICHE


function aggiornaStatistiche(){


    function conta(stato){

        return libri.filter(function(l){
            return l.stato === stato;
        }).length;

    }


    document.getElementById("totaleLibri")
    .textContent = libri.length;

    document.getElementById("libriLetti")
    .textContent = conta("Letto");

    document.getElementById("libriDaLeggere")
    .textContent = conta("Da leggere");

    document.getElementById("libriLettura")
    .textContent = conta("In lettura");



    const riquadro = document.getElementById("statistiche");


    if(libri.length === 0){

        riquadro.textContent = "Nessun dato disponibile";

        return;

    }



    const votati = libri.filter(function(l){
        return Number(l.voto) > 0;
    });


    const media =
    votati.length
    ? (
        votati.reduce(function(somma,l){
            return somma + Number(l.voto);
        }, 0) / votati.length
      ).toFixed(1)
    : "-";



    const generi = {};


    libri.forEach(function(l){

        const g = l.genere || "Non indicato";

        generi[g] = (generi[g] || 0) + 1;

    });


    const righe =
    Object.entries(generi)
    .sort(function(a,b){ return b[1] - a[1]; })
    .map(function(voce){

        return "<li>" + testoSicuro(voce[0]) + ": " + voce[1] + "</li>";

    })
    .join("");



    const prestati = libri.filter(inPrestito);


    const righePrestiti =
    prestati.map(function(l){

        return "<li>" + testoSicuro(l.titolo) + " → " +
        testoSicuro(l.prestatoA) +
        (l.dataPrestito ? " (dal " + dataItaliana(l.dataPrestito) + ")" : "") +
        "</li>";

    }).join("");



    const conCopertina = libri.filter(function(l){

        return String(l.copertinaLocale || "").startsWith("data:image/");

    }).length;



    riquadro.innerHTML = `

    <p>Voto medio: <strong>${media}</strong>
    (su ${votati.length} libri valutati)</p>

    <p>Abbandonati: <strong>${conta("Abbandonato")}</strong></p>

    <p>Copertine salvate offline: <strong>${conCopertina}</strong>
    su ${libri.length}</p>

    <p>Libri per genere:</p>

    <ul class="elenco-generi">${righe}</ul>

    ${
    prestati.length
    ? `<p>🤝 In prestito (${prestati.length}):</p>
       <ul class="elenco-generi">${righePrestiti}</ul>`
    : "<p>Nessun libro in prestito.</p>"
    }

    `;


}






// CHIAVE GOOGLE BOOKS


function chiaveGoogle(){


    return String(leggiPreferenza("chiaveGoogleBooks") || "").trim();


}



function salvaChiaveGoogle(){


    const chiave = valore("chiaveGoogle");


    scriviPreferenza("chiaveGoogleBooks", chiave);


    mostraStatoChiave();


    alert(
        chiave
        ? "Chiave salvata su questo dispositivo."
        : "Chiave rimossa: le ricerche useranno solo Open Library."
    );


}



function mostraStatoChiave(){


    const stato = document.getElementById("statoChiave");

    const campo = document.getElementById("chiaveGoogle");


    if(!stato){

        return;

    }


    const chiave = chiaveGoogle();


    if(campo && chiave && !campo.value){

        campo.value = chiave;

    }


    stato.textContent =
    chiave
    ? "Chiave presente (termina con " + chiave.slice(-4) + ")."
    : "Nessuna chiave: Google Books verrà saltato, si userà solo Open Library.";


}



async function provaChiaveGoogle(){


    const stato = document.getElementById("statoChiave");


    if(!chiaveGoogle()){

        stato.textContent =
        "Prima incolla la chiave e premi «Salva chiave».";

        return;

    }


    stato.textContent = "Prova in corso su un ISBN noto...";


    try {


        // Dune: presente con certezza nel catalogo Google
        const dati = await google("q=isbn:9780441172719");


        stato.textContent =
        dati && dati.titolo
        ? "✅ La chiave funziona (risposta: " + dati.titolo + ")."
        : "⚠ La chiave risponde ma non ha restituito risultati.";


    }
    catch(errore){


        stato.textContent =
        "❌ La chiave non funziona: " + spiegaErrore(errore);


    }


}






// PROMEMORIA BACKUP


function leggiPreferenza(chiave){


    try {

        return localStorage.getItem(chiave);

    }
    catch(errore){

        return null;

    }


}



function scriviPreferenza(chiave, valore){


    try {

        localStorage.setItem(chiave, valore);

    }
    catch(errore){

        // preferenza non memorizzabile

    }


}



function controllaPromemoriaBackup(){


    const banner = document.getElementById("bannerBackup");

    const testo  = document.getElementById("testoBackup");


    if(!banner || !testo){

        return;

    }


    if(libri.length < 5){

        banner.hidden = true;

        return;

    }



    const rinvio = leggiPreferenza("rinvioBackup");


    if(rinvio && new Date(rinvio) > new Date()){

        banner.hidden = true;

        return;

    }



    const ultimo = leggiPreferenza("ultimoBackup");


    const riferimento =
    ultimo ? new Date(ultimo) : primaDataInserimento();


    const giorni =
    Math.floor(
        (Date.now() - riferimento.getTime()) / 86400000
    );



    if(giorni < GIORNI_PROMEMORIA_BACKUP){

        banner.hidden = true;

        return;

    }


    testo.textContent =
    ultimo
    ? "Ultimo backup " + giorni + " giorni fa. " +
      "I dati vivono solo su questo dispositivo: conviene esportarli."
    : "Non hai mai esportato la biblioteca (" + libri.length +
      " libri). I dati vivono solo su questo dispositivo.";


    banner.hidden = false;


}



function primaDataInserimento(){


    const date =
    libri
    .map(function(l){ return l.data ? new Date(l.data) : null; })
    .filter(function(d){ return d && !isNaN(d.getTime()); });


    if(date.length === 0){

        return new Date();

    }


    return new Date(Math.min.apply(null, date));


}



function rinviaPromemoriaBackup(){


    const fra7giorni = new Date();

    fra7giorni.setDate(fra7giorni.getDate() + 7);


    scriviPreferenza("rinvioBackup", fra7giorni.toISOString());


    document.getElementById("bannerBackup").hidden = true;


}






// BACKUP ESPORTAZIONE


function esportaBackup(){


    if(libri.length === 0){

        alert("Nessun libro da esportare.");

        return;

    }


    const file = new Blob(
        [ JSON.stringify(libri, null, 2) ],
        { type: "application/json" }
    );


    const indirizzo = URL.createObjectURL(file);


    const link = document.createElement("a");

    link.href = indirizzo;

    link.download =
    "LaMiaLibreria_backup_" +
    new Date().toISOString().slice(0,10) + ".json";


    document.body.appendChild(link);

    link.click();

    link.remove();


    URL.revokeObjectURL(indirizzo);



    scriviPreferenza("ultimoBackup", new Date().toISOString());

    scriviPreferenza("rinvioBackup", "");


    const banner = document.getElementById("bannerBackup");


    if(banner){

        banner.hidden = true;

    }


}






// IMPORTAZIONE CHE UNISCE


async function importaBackup(evento){


    const file = evento.target.files[0];


    if(!file){

        return;

    }


    try {


        const testo = await file.text();

        const dati = JSON.parse(testo);


        if(!Array.isArray(dati)){

            throw new Error("Il file non contiene un elenco di libri");

        }



        let aggiunti = 0;

        let aggiornati = 0;

        let saltati = 0;



        for(const voce of dati){


            if(
                !voce ||
                typeof voce !== "object" ||
                !voce.titolo
            ){

                saltati++;

                continue;

            }



            const copia = { ...voce };

            delete copia.id;



            // ricerca dell'esistente: prima per ISBN, poi per titolo+autore
            const codice = soloCodice(copia.isbn);


            let esistente = null;


            if(codice){

                esistente = libri.find(function(l){

                    return soloCodice(l.isbn) === codice;

                }) || null;

            }


            if(!esistente){

                esistente = libri.find(function(l){

                    return chiaveTitolo(l) === chiaveTitolo(copia);

                }) || null;

            }



            try {


                if(esistente){


                    await aggiornaLibro({

                        ...esistente,
                        ...copia,

                        id: esistente.id,

                        // si conserva la data di inserimento più vecchia
                        data: esistente.data || copia.data ||
                        new Date().toISOString()

                    });


                    aggiornati++;


                }
                else {


                    if(!copia.data){

                        copia.data = new Date().toISOString();

                    }


                    await salvaLibroDatabase(copia);


                    // aggiorna l'elenco in memoria per riconoscere
                    // eventuali doppioni presenti nello stesso file
                    libri.push(copia);


                    aggiunti++;


                }


            }
            catch(errore){

                console.error("Errore importazione voce", errore);

                saltati++;

            }


        }



        await caricaLibri();


        alert(
        "Importazione completata.\n" +
        "Nuovi: " + aggiunti + "\n" +
        "Aggiornati: " + aggiornati +
        (saltati ? "\nSaltati: " + saltati : "")
        );


    }
    catch(errore){


        console.error("Errore importazione", errore);

        alert("File di backup non valido: " + errore.message);


    }
    finally {


        evento.target.value = "";


    }


}






// PULIZIA MODULO


function pulisciModulo(){


    const modulo = document.getElementById("formLibro");


    modulo.querySelectorAll("input, textarea")
    .forEach(function(e){

        if(e.type !== "file" && e.type !== "checkbox"){

            e.value = "";

        }

    });


    modulo.querySelectorAll("select")
    .forEach(function(s){

        s.selectedIndex = 0;

    });


}






// TEMA


function inizializzaTema(){


    applicaTema(leggiPreferenza("tema") === "scuro");


}



function cambiaTema(){


    applicaTema(!document.body.classList.contains("dark"));


}



function applicaTema(scuro){


    document.body.classList.toggle("dark", scuro);


    document.getElementById("temaScuro")
    .textContent = scuro ? "☀ Tema chiaro" : "🌙 Tema scuro";


    scriviPreferenza("tema", scuro ? "scuro" : "chiaro");


}
