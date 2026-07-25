/* ===================================
   LA MIA LIBRERIA
   Ricerca ISBN avanzata
=================================== */


async function cercaISBN(){


    const isbn =
    document
    .getElementById("isbn")
    .value
    .trim();



    if(!isbn){

        alert(
        "Inserire un ISBN"
        );

        return;

    }



    try {


        const risposta =
        await fetch(
        `https://openlibrary.org/isbn/${isbn}.json`
        );



        if(!risposta.ok){

            throw new Error();

        }



        const libro =
        await risposta.json();





        // TITOLO

        document
        .getElementById("titolo")
        .value =
        libro.title || "";





        // ANNO

        if(libro.publish_date){

            document
            .getElementById("anno")
            .value =
            libro.publish_date
            .match(/\d{4}/)?.[0] || "";

        }






        // EDITORE

        if(libro.publishers){


            aggiungiNota(
            "Editore: "
            +
            libro.publishers.join(", ")
            );

        }







        // AUTORI

        if(libro.authors){


            let autori = [];


            for(
            const autore of libro.authors
            ){


                const dati =
                await fetch(
                "https://openlibrary.org"
                +
                autore.key
                +
                ".json"
                );


                const autoreInfo =
                await dati.json();


                autori.push(
                autoreInfo.name
                );


            }



            document
            .getElementById("autore")
            .value =
            autori.join(", ");


        }







        // COPERTINA

        if(libro.covers){


            const id =
            libro.covers[0];



            document
            .getElementById("copertina")
            .value =
            `https://covers.openlibrary.org/id/${id}-L.jpg`;

        }







        alert(
        "Dati libro recuperati"
        );


    }


    catch(error){


        alert(
        "Libro non trovato. Inserimento manuale."
        );


    }


}








function aggiungiNota(testo){


    const campo =
    document
    .getElementById("note");



    if(campo.value){

        campo.value += "\n";

    }



    campo.value += testo;


}