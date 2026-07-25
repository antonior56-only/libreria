/* ===================================
   LA MIA LIBRERIA
   app.js versione 1.2
=================================== */


let libri = [];

let libroInModifica = null;


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

        alert(
        "Impossibile aprire l'archivio locale. Ricarica la pagina."
        );

    }



    document.getElementById("salvaLibro")
    .addEventListener("click", salvaLibro);

    document.getElementById("annullaModifica")
    .addEventListener("click", annullaModifica);

    document.getElementById("cercaISBN")
    .addEventListener("click", cercaISBN);

    document.getElementById("avviaScanner")
    .addEventListener("click", avviaScanner);

    document.getElementById("ricerca")
    .addEventListener("input", applicaFiltri);

    document.getElementById("ordinamento")
    .addEventListener("change", applicaFiltri);

    document.getElementById("esportaBackup")
    .addEventListener("click", esportaBackup);

    document.getElementById("importaBackup")
    .addEventListener("change", importaBackup);

    document.getElementById("temaScuro")
    .addEventListener("click", cambiaTema);


    // delega eventi: niente onclick inline
    document.getElementById("listaLibri")
    .addEventListener("click", gestisciClickLista);


});






// CARICAMENTO


async function caricaLibri(){


    try {

        libri = await recuperaLibri();

    }
    catch(errore){

        console.error("Errore lettura libri", errore);

        libri = [];

    }


    applicaFiltri();

    aggiornaStatistiche();

}






// SALVATAGGIO


async function salvaLibro(){


    const titolo = valore("titolo");


    if(!titolo){

        alert("Il titolo è obbligatorio.");

        document.getElementById("titolo").focus();

        return;

    }



    const libro = {

        titolo:    titolo,
        autore:    valore("autore"),
        copertina: valore("copertina"),
        genere:    valore("genere"),
        anno:      valore("anno") ? Number(valore("anno")) : null,
        isbn:      valore("isbn"),
        stato:     valore("stato"),
        voto:      Number(valore("voto")) || 0,
        stanza:    valore("stanza"),
        libreria:  valore("libreria"),
        scaffale:  valore("scaffale"),
        note:      valore("note")

    };



    try {


        if(libroInModifica){


            libro.id = libroInModifica.id;

            libro.data =
            libroInModifica.data ||
            new Date().toISOString();


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






// VISUALIZZAZIONE


function mostraLibri(lista){


    const contenitore =
    document.getElementById("listaLibri");


    contenitore.innerHTML = "";



    if(lista.length === 0){

        contenitore.innerHTML =
        "<p>Nessun libro trovato</p>";

        return;

    }



    lista.forEach(function(libro){


        const div = document.createElement("div");

        div.className = "libro";


        const copertina = urlSicuro(libro.copertina);


        const stelle =
        "⭐".repeat(
            Math.min(5, Math.max(0, Number(libro.voto) || 0))
        );


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

            <button type="button" data-azione="elimina" data-id="${libro.id}">
            🗑 Elimina
            </button>

        </div>

        `;



        contenitore.appendChild(div);


    });


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


    const bottone =
    evento.target.closest("button[data-azione]");


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


}






// MODIFICA


function modificaLibro(id){


    const libro =
    libri.find(function(l){ return l.id === id; });


    if(!libro){

        return;

    }


    libroInModifica = libro;



    CAMPI_MODULO.forEach(function(campo){


        const elemento =
        document.getElementById(campo);


        if(!elemento){

            return;

        }


        const dato =
        libro[campo] ?? "";


        if(elemento.tagName === "SELECT"){


            const esiste =
            Array.from(elemento.options)
            .some(function(o){
                return o.value === String(dato);
            });


            elemento.value =
            esiste ? String(dato) : elemento.options[0].value;


        }
        else {


            elemento.value = dato;


        }


    });



    document.getElementById("salvaLibro")
    .textContent = "💾 Aggiorna libro";

    document.getElementById("annullaModifica")
    .hidden = false;

    document.getElementById("formLibro")
    .scrollIntoView({ behavior: "smooth", block: "start" });


}



function annullaModifica(){


    libroInModifica = null;


    pulisciModulo();


    document.getElementById("salvaLibro")
    .textContent = "💾 Salva libro";

    document.getElementById("annullaModifica")
    .hidden = true;


}






// CANCELLA


async function cancellaLibro(id){


    const libro =
    libri.find(function(l){ return l.id === id; });


    const nome =
    libro ? libro.titolo : "questo libro";


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

        annullaModifica();

    }


    await caricaLibri();


}






// FILTRI


function applicaFiltri(){


    let risultato = [...libri];


    const testo =
    valore("ricerca").toLowerCase();



    if(testo){


        risultato = risultato.filter(function(libro){


            const campi = [
                libro.titolo,
                libro.autore,
                libro.genere,
                libro.isbn,
                libro.stanza,
                libro.libreria,
                libro.scaffale
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



    mostraLibri(risultato);


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



    const riquadro =
    document.getElementById("statistiche");


    if(libri.length === 0){

        riquadro.textContent = "Nessun dato disponibile";

        return;

    }



    const votati =
    libri.filter(function(l){
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

        return "<li>" + testoSicuro(voce[0]) +
        ": " + voce[1] + "</li>";

    })
    .join("");



    riquadro.innerHTML = `

    <p>Voto medio: <strong>${media}</strong>
    (su ${votati.length} libri valutati)</p>

    <p>Abbandonati: <strong>${conta("Abbandonato")}</strong></p>

    <p>Libri per genere:</p>

    <ul class="elenco-generi">${righe}</ul>

    `;


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
    new Date().toISOString().slice(0,10) +
    ".json";


    document.body.appendChild(link);

    link.click();

    link.remove();


    URL.revokeObjectURL(indirizzo);


}






// IMPORTAZIONE


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



        let importati = 0;


        for(const libro of dati){


            if(
                !libro ||
                typeof libro !== "object" ||
                !libro.titolo
            ){

                continue;

            }


            const copia = { ...libro };

            delete copia.id;


            await salvaLibroDatabase(copia);

            importati++;


        }



        await caricaLibri();


        alert(
        "Importati " + importati +
        " libri su " + dati.length + " voci nel file."
        );


    }
    catch(errore){


        console.error("Errore importazione", errore);

        alert(
        "File di backup non valido: " + errore.message
        );


    }
    finally {


        // permette di reimportare lo stesso file
        evento.target.value = "";


    }


}






// PULIZIA MODULO


function pulisciModulo(){


    const modulo =
    document.getElementById("formLibro");


    modulo.querySelectorAll("input, textarea")
    .forEach(function(e){

        if(e.type !== "file"){

            e.value = "";

        }

    });


    modulo.querySelectorAll("select")
    .forEach(function(s){

        s.selectedIndex = 0;

    });


}






// TEMA CHIARO / SCURO


function inizializzaTema(){


    let scuro = false;


    try {

        scuro = localStorage.getItem("tema") === "scuro";

    }
    catch(errore){

        scuro = false;

    }


    applicaTema(scuro);


}



function cambiaTema(){


    applicaTema(
        !document.body.classList.contains("dark")
    );


}



function applicaTema(scuro){


    document.body.classList.toggle("dark", scuro);


    document.getElementById("temaScuro")
    .textContent = scuro ? "☀ Tema chiaro" : "🌙 Tema scuro";


    try {

        localStorage.setItem(
            "tema",
            scuro ? "scuro" : "chiaro"
        );

    }
    catch(errore){

        // niente: preferenza non memorizzata

    }


}
