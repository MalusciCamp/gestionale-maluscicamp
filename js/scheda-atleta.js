fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


const params = new URLSearchParams(window.location.search);
const atletaId = params.get("id");

let datiAtleta = {};


// ================= CARICA =================

function caricaScheda(){

  db.collection("atleti").doc(atletaId).get()
  .then(doc=>{

    const data = doc.data();
    datiAtleta = data;

    nome.value = data.nome || "";
    cognome.value = data.cognome || "";
    classe.value = data.classe || "";
    ruolo.value = data.ruolo || "";
    altezza.value = data.altezza || "";
    taglia.value = data.taglia || "";
    scarpa.value = data.scarpa || "";

    caricaDocumenti(data.documenti);
    caricaAllergie(data.allergie);

  });

}


// ================= DOCUMENTI =================

function caricaDocumenti(doc){

  const box = document.getElementById("documentiBox");

  const lista = [
    "CertMedico",
    "TesseraSanitaria",
    "DocumentoIdentita",
    "Vaccini",
    "Firme"
  ];

  lista.forEach(nomeDoc=>{

    const div = document.createElement("div");

    const stato = doc?.[nomeDoc] ? "green" : "red";

    div.className = "toggle " + stato;
    div.innerText = nomeDoc;
    div.dataset.key = nomeDoc;

    div.onclick = ()=>{
      div.classList.toggle("green");
      div.classList.toggle("red");
    };

    box.appendChild(div);

  });

}


// ================= ALLERGIE =================

function caricaAllergie(a){

  if(!a) return;

  setAllergia(a.stato);
  descrizioneAllergie.value = a.descrizione || "";

}


function setAllergia(stato){

  document.querySelectorAll(".allergia")
  .forEach(b=>{
    b.classList.remove("green");
    b.classList.add("red");
  });

  const btn = document.querySelectorAll(".allergia")[stato?0:1];

  btn.classList.remove("red");
  btn.classList.add("green");

}


// ================= SALVA =================

function salvaModifiche(){

  const documenti = {};

  document.querySelectorAll("#documentiBox .toggle")
  .forEach(d=>{
    documenti[d.dataset.key] =
      d.classList.contains("green");
  });

  db.collection("atleti").doc(atletaId).update({

    nome:nome.value,
    cognome:cognome.value,
    classe:classe.value,
    ruolo:ruolo.value,
    altezza:altezza.value,
    taglia:taglia.value,
    scarpa:scarpa.value,

    documenti:documenti,

    allergie:{
      stato:
        document.querySelectorAll(".allergia")[0]
        .classList.contains("green"),
      descrizione:descrizioneAllergie.value
    }

  })
  .then(()=>{
    alert("Modifiche salvate");
  });

}


window.onload = caricaScheda;