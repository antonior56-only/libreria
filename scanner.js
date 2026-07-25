/* ===================================
   LA MIA LIBRERIA
   Scanner codice a barre - versione 1.2
=================================== */


let scanner = null;

let scannerAttivo = false;



async function avviaScanner(){


    const area =
    document.getElementById("scanner");


    if(!area){

        alert("Area scanner non trovata nella pagina.");

        return;

    }



    // secondo click = chiusura
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



    area.innerHTML =
    "<div id='lettore'></div>" +
    "<button type='button' id='chiudiScanner' class='btn-secondario'>" +
    "✖ Chiudi scanner</button>";


    document.getElementById("chiudiScanner")
    .addEventListener("click", fermaScanner);



    // limita ai formati usati dai libri: più veloce e più preciso
    const configurazione = {};


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

            {
                facingMode: "environment"
            },

            {
                fps: 10,
                // rettangolare: i codici a barre sono larghi e bassi
                qrbox: { width: 260, height: 140 }
            },

            async function(codice){


                document.getElementById("isbn")
                .value = codice;


                await fermaScanner();


                if(typeof cercaISBN === "function"){

                    cercaISBN();

                }


            },

            function(){

                // errori di lettura fotogramma: ignorati

            }

        );


        scannerAttivo = true;


        document.getElementById("avviaScanner")
        .textContent = "✖ Chiudi scanner";


    }
    catch(errore){


        console.error("Errore avvio scanner", errore);


        alert(
        "Impossibile attivare la fotocamera. Controlla i permessi del browser."
        );


        await fermaScanner();


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



    const area =
    document.getElementById("scanner");


    if(area){

        area.innerHTML = "";

    }



    const bottone =
    document.getElementById("avviaScanner");


    if(bottone){

        bottone.textContent = "📷 Scansiona ISBN";

    }


}
