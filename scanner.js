/* ===================================
   LA MIA LIBRERIA
   Scanner codice a barre - versione 1.5
   Con modalità di scansione continua
=================================== */


let scanner = null;

let scannerAttivo = false;

let modalitaContinua = false;

let ultimoCodice = "";

let ultimaLettura = 0;



async function avviaScanner(){


    const area = document.getElementById("scanner");


    if(!area){

        alert("Area scanner non trovata nella pagina.");

        return;

    }



    if(scannerAttivo){

        await fermaScanner();

        return;

    }



    if(typeof Html5Qrcode === "undefined"){

        alert(
        "Libreria dello scanner non caricata: serve una connessione a Internet al primo avvio."
        );

        return;

    }



    if(!window.isSecureContext){

        alert(
        "La fotocamera funziona solo su indirizzi HTTPS oppure in locale (localhost)."
        );

        return;

    }



    const interruttore =
    document.getElementById("scansioneContinua");


    modalitaContinua = Boolean(interruttore && interruttore.checked);


    ultimoCodice = "";

    ultimaLettura = 0;



    area.innerHTML =
    "<div id='lettore'></div>" +
    "<p id='esitoLettura' class='esito-lettura'></p>" +
    "<button type='button' id='chiudiScanner' class='btn-secondario'>" +
    "✖ Chiudi scanner</button>";


    document.getElementById("chiudiScanner")
    .addEventListener("click", fermaScanner);



    const configurazione = {

        // usa il decodificatore di codici a barre integrato nel
        // browser quando c'è: molto più rapido e preciso
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }

    };


    if(typeof Html5QrcodeSupportedFormats !== "undefined"){

        configurazione.formatsToSupport = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
        ];

    }



    scanner = new Html5Qrcode("lettore", configurazione);



    try {


        await scanner.start(

            { facingMode: "environment" },

            {
                fps: 10,

                // il riquadro si adatta al video reale invece di
                // usare misure fisse che non gli corrispondono
                qrbox: riquadroLettura,

                aspectRatio: 1.3333
            },

            gestisciLettura,

            function(){ }

        );


        scannerAttivo = true;


        document.getElementById("avviaScanner")
        .textContent = "✖ Chiudi scanner";


        if(modalitaContinua){

            mostraEsito(
            "Modalità continua attiva: inquadra un libro dopo l'altro."
            );

        }


    }
    catch(errore){


        console.error("Errore avvio scanner", errore);

        alert(
        "Impossibile attivare la fotocamera. Controlla i permessi del browser."
        );

        await fermaScanner();


    }


}






// RIQUADRO DI LETTURA PROPORZIONATO AL VIDEO


function riquadroLettura(larghezzaVideo, altezzaVideo){


    // largo quasi quanto l'inquadratura, basso come un codice a barre
    const larghezza =
    Math.max(
        160,
        Math.floor(larghezzaVideo * 0.85)
    );


    const altezza =
    Math.max(
        90,
        Math.min(
            Math.floor(altezzaVideo * 0.45),
            Math.floor(larghezza * 0.55)
        )
    );


    return {
        width:  Math.min(larghezza, larghezzaVideo),
        height: Math.min(altezza,  altezzaVideo)
    };


}






async function gestisciLettura(codice){


    const adesso = Date.now();


    // la libreria rilegge lo stesso codice molte volte al secondo
    if(
        codice === ultimoCodice &&
        adesso - ultimaLettura < 3000
    ){

        return;

    }


    ultimoCodice = codice;

    ultimaLettura = adesso;



    if(!modalitaContinua){


        const campo = document.getElementById("isbn");


        if(campo){

            campo.value = codice;

        }


        await fermaScanner();


        if(typeof cercaISBN === "function"){

            cercaISBN();

        }


        return;


    }



    // modalità continua: il libro entra in coda e la fotocamera resta aperta
    if(typeof aggiungiAllaCoda === "function"){


        const aggiunto = aggiungiAllaCoda(codice);


        mostraEsito(
            aggiunto
            ? "✅ " + codice + " aggiunto alla coda"
            : "↺ " + codice + " già in coda o codice non valido"
        );


    }


}



function mostraEsito(testo){


    const riga = document.getElementById("esitoLettura");


    if(riga){

        riga.textContent = testo;

    }


}






async function fermaScanner(){


    if(scanner){


        try {

            await scanner.stop();

            scanner.clear();

        }
        catch(errore){

            console.warn("Scanner già fermo", errore);

        }


    }


    scanner = null;

    scannerAttivo = false;

    modalitaContinua = false;



    const area = document.getElementById("scanner");


    if(area){

        area.innerHTML = "";

    }



    const bottone = document.getElementById("avviaScanner");


    if(bottone){

        bottone.textContent = "📷 Scansiona ISBN";

    }


}
