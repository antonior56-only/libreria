/* ===================================
   LA MIA LIBRERIA
   app.js versione 1.1
=================================== */


let libri = [];

let libroInModifica = null;



document.addEventListener(
"DOMContentLoaded",
document
.getElementById("cercaISBN")
.addEventListener(
"click",
cercaISBN
);
async function(){


    await apriDatabase();


    await caricaLibri();



    document
    .getElementById("salvaLibro")
    .addEventListener(
        "click",
        salvaLibro
    );

document
.getElementById("avviaScanner")
.addEventListener(
"click",
avviaScanner
);

    document
    .getElementById("ricerca")
    .addEventListener(
        "input",
        applicaFiltri
    );



    document
    .getElementById("ordinamento")
    .addEventListener(
        "change",
        applicaFiltri
    );
document
.getElementById("avviaScanner")
.addEventListener(
"click",
avviaScanner
);


    document
    .getElementById("esportaBackup")
    .addEventListener(
        "click",
        esportaBackup
    );



    document
    .getElementById("importaBackup")
    .addEventListener(
        "change",
        importaBackup
    );



});






// CARICAMENTO

async function caricaLibri(){


    libri =
    await recuperaLibri();


    mostraLibri(
        libri
    );


    aggiornaStatistiche();

}







// SALVATAGGIO


async function salvaLibro(){



    const libro = {


        titolo:
        valore("titolo"),


        autore:
        valore("autore"),


        copertina:
        valore("copertina"),


        genere:
        valore("genere"),


        anno:
        valore("anno"),


        isbn:
        valore("isbn"),


        stato:
        valore("stato"),


        voto:
        Number(
            valore("voto")
        ),


        stanza:
        valore("stanza"),


        libreria:
        valore("libreria"),


        scaffale:
        valore("scaffale"),


        note:
        valore("note"),


        data:
        new Date()
        .toISOString()

    };




    if(libroInModifica){


        libro.id =
        libroInModifica.id;


        await aggiornaLibro(
            libro
        );


        libroInModifica=null;


    }

    else {


        await salvaLibroDatabase(
            libro
        );


    }



    pulisciModulo();


    await caricaLibri();



}







function valore(id){


    return document
    .getElementById(id)
    .value
    .trim();


}








// VISUALIZZAZIONE


function mostraLibri(lista){


    const contenitore =
    document
    .getElementById(
        "listaLibri"
    );



    contenitore.innerHTML="";



    if(lista.length===0){

        contenitore.innerHTML =
        "<p>Nessun libro inserito</p>";

        return;

    }





    lista.forEach(libro=>{


        const div =
        document.createElement(
            "div"
        );


        div.className="libro";



        div.innerHTML = `


        ${
        libro.copertina ?
        `<img src="${libro.copertina}" 
        width="80">`
        :
        "📖"
        }



        <h3>
        ${libro.titolo}
        </h3>


        <p>
        Autore:
        ${libro.autore || "-"}
        </p>


        <p>
        Genere:
        ${libro.genere}
        </p>


        <p>
        Stato:
        ${libro.stato}
        </p>


        <p>
        Voto:
        ${"⭐".repeat(libro.voto)}
        </p>


        <p>
        📍
        ${libro.stanza || ""}
        ${libro.libreria || ""}
        ${libro.scaffale || ""}
        </p>


        <p>
        ${libro.note || ""}
        </p>


        <button onclick="modificaLibro(${libro.id})">
        ✏ Modifica
        </button>


        <button onclick="cancellaLibro(${libro.id})">
        🗑 Elimina
        </button>


        `;



        contenitore.appendChild(div);


    });


}







// MODIFICA


function modificaLibro(id){


    libroInModifica =
    libri.find(
        l=>l.id===id
    );



    if(!libroInModifica)
    return;



    Object.keys(
        libroInModifica
    )
    .forEach(campo=>{


        const elemento =
        document.getElementById(
            campo
        );


        if(elemento){

            elemento.value =
            libroInModifica[campo];

        }


    });


}







// CANCELLA


async function cancellaLibro(id){


    if(
        confirm(
        "Eliminare il libro?"
        )
    ){


        await eliminaLibro(id);

        caricaLibri();

    }

}







// FILTRI


function applicaFiltri(){


    let risultato =
    [...libri];


    const testo =
    valore("ricerca")
    .toLowerCase();



    if(testo){


        risultato =
        risultato.filter(
        libro=>

        libro.titolo
        .toLowerCase()
        .includes(testo)

        ||

        libro.autore
        .toLowerCase()
        .includes(testo)

        ||

        libro.genere
        .toLowerCase()
        .includes(testo)

        );


    }





    const ordine =
    valore("ordinamento");



    if(ordine==="titolo"){


        risultato.sort(
        (a,b)=>
        a.titolo.localeCompare(
            b.titolo
        ));

    }


    if(ordine==="autore"){


        risultato.sort(
        (a,b)=>
        a.autore.localeCompare(
            b.autore
        ));

    }



    if(ordine==="voto"){


        risultato.sort(
        (a,b)=>
        b.voto-a.voto
        );

    }



    if(ordine==="data"){


        risultato.sort(
        (a,b)=>
        b.id-a.id
        );

    }



    mostraLibri(
        risultato
    );


}








// STATISTICHE


function aggiornaStatistiche(){


document.getElementById(
"totaleLibri"
).innerText=libri.length;


document.getElementById(
"libriLetti"
).innerText =
libri.filter(
l=>l.stato==="Letto"
).length;



document.getElementById(
"libriDaLeggere"
).innerText =
libri.filter(
l=>l.stato==="Da leggere"
).length;



document.getElementById(
"libriLettura"
).innerText =
libri.filter(
l=>l.stato==="In lettura"
).length;


}








// BACKUP ESPORTAZIONE


function esportaBackup(){


const file =
new Blob(
[
JSON.stringify(
libri,
null,
2
)
],
{
type:"application/json"
}
);



const link =
document.createElement(
"a"
);


link.href =
URL.createObjectURL(
file
);


link.download =
"LaMiaLibreria_backup.json";


link.click();


}








// IMPORTAZIONE


function importaBackup(event){


const file =
event.target.files[0];


const lettore =
new FileReader();



lettore.onload =
async function(){


const dati =
JSON.parse(
lettore.result
);



for(
const libro of dati
){


delete libro.id;


await salvaLibroDatabase(
libro
);


}



caricaLibri();


};



lettore.readAsText(
file
);


}







// PULIZIA


function pulisciModulo(){


document
.querySelectorAll(
"input,textarea"
)
.forEach(
e=>e.value=""
);


}