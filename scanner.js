let scanner = null;


function avviaScanner(){

    const area =
    document.getElementById("scanner");


    if(!area){
        alert("Area scanner non trovata");
        return;
    }


    area.innerHTML =
    "<div id='lettore'></div>";


    scanner =
    new Html5Qrcode("lettore");


    scanner.start(

        {
            facingMode:"environment"
        },

        {
            fps:10,
            qrbox:250
        },


        codice => {


            document
            .getElementById("isbn")
            .value = codice;


            fermaScanner();


            cercaISBN();


        },


        errore => {

        }

    )
    .catch(err=>{

        alert(
        "Impossibile attivare la fotocamera. Controllare i permessi."
        );

    });

}



function fermaScanner(){

    if(scanner){

        scanner.stop()
        .then(()=>{

            scanner.clear();

        });

    }

}