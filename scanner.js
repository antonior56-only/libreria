/* ===================================
   LA MIA LIBRERIA
   Scanner ISBN
=================================== */


let scanner;



function avviaScanner(){


const area =
document.getElementById(
"scanner"
);



area.innerHTML =
`
<div id="lettore">
</div>
`;



scanner =
new Html5Qrcode(
"lettore"
);



scanner.start(

{
facingMode:"environment"
},

{
fps:10,

qrbox:
{
width:250,
height:120
}

},


(codice)=>{


document
.getElementById("isbn")
.value =
codice;



fermaScanner();



cercaISBN();


},


(error)=>{


}

);



}





function fermaScanner(){


if(scanner){


scanner.stop()
.then(()=>{


scanner.clear();


});


}


}