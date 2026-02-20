fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


const params = new URLSearchParams(window.location.search);
const atletaId = params.get("id");

function caricaScheda(){

  db.collection("atleti").doc(atletaId).get()
  .then(doc=>{

    const data = doc.data();

    const container = document.getElementById("contenutoScheda");

    container.innerHTML = `
      <input id="nome" value="${data.nome || ""}">
      <input id="cognome" value="${data.cognome || ""}">
      <input id="classe" value="${data.classe || ""}">
      <input id="ruolo" value="${data.ruolo || ""}">
    `;

  });

}


function salvaModifiche(){

  db.collection("atleti").doc(atletaId).update({

    nome: document.getElementById("nome").value,
    cognome: document.getElementById("cognome").value,
    classe: document.getElementById("classe").value,
    ruolo: document.getElementById("ruolo").value

  })
  .then(()=>{
    alert("Modifiche salvate");
  });

}


window.onload = caricaScheda;