// ================= HEADER LOAD =================

fetch("components/header.html")
.then(r => r.text())
.then(h => document.getElementById("header").innerHTML = h);

// ================= MODALITÀ =================

let atletaInModifica = null;


// ================= POPUP =================

function openPopup(){

  document.getElementById("iscrizioneModal").style.display="flex";

  caricaSettimane();

  // 👇 NUOVO
  setTimeout(()=>{
    caricaDatiAtleta();
  },300);

}

function closeIscrizionePopup(){
  document.getElementById("iscrizioneModal").style.display = "none";
}

function openArchivio(){
  window.location.href = "archivio.html";
}

// ================= DOCUMENTI TOGGLE =================

document.addEventListener("click", e => {

  if(e.target.classList.contains("documento")){
    e.target.classList.toggle("green");
    e.target.classList.toggle("red");
  }

});


// ================= ALLERGIE =================

function toggleAllergie(btn, stato){

  // Reset bottoni
  document.querySelectorAll(".allergia-btn")
  .forEach(b=>{
    b.classList.remove("green");
    b.classList.add("red");
  });

  // Attivo cliccato
  btn.classList.remove("red");
  btn.classList.add("green");

  // Box descrizione
  const box = document.getElementById("boxAllergie");

  if(stato){
    box.classList.remove("hidden");
  }else{
    box.classList.add("hidden");
  }

}


// ================= CARICA SETTIMANE =================

function caricaSettimane(){

  const c = document.getElementById("settimaneToggle");
  c.innerHTML = "";

  db.collection("settimane").orderBy("createdAt").get()
  .then(s => {

    s.forEach(doc => {

      const d = doc.data();

      const box = document.createElement("div");
      box.className = "toggle red";
      box.innerText = d.nome;
      box.dataset.id = doc.id;
      box.dataset.prezzo = d.prezzo;

      box.onclick = () => {
        box.classList.toggle("green");
        box.classList.toggle("red");
        calcolaTotale();
      };

      c.appendChild(box);

    });

  });

}


// ================= CALCOLI PAGAMENTO =================

function calcolaTotale(){

  let tot = 0;

  document.querySelectorAll("#settimaneToggle .green")
  .forEach(b => tot += Number(b.dataset.prezzo));

  document.getElementById("totalePagamento").value = tot;
  calcolaSconto();
}


function calcolaSconto(){

  const s = Number(document.getElementById("scontoPagamento").value) || 0;
  const tot = Number(document.getElementById("totalePagamento").value) || 0;

  document.getElementById("totaleScontato").value = tot - s;
  calcolaRimanenza();
}


function calcolaRimanenza(){

  const a = Number(document.getElementById("accontoPagamento").value) || 0;
  const t = Number(document.getElementById("totaleScontato").value) || 0;

  document.getElementById("restoPagamento").value = t - a;
}


// Listener sicuri dopo caricamento DOM
window.addEventListener("DOMContentLoaded", () => {

  document.getElementById("scontoPagamento")
  ?.addEventListener("input", calcolaSconto);

  document.getElementById("accontoPagamento")
  ?.addEventListener("input", calcolaRimanenza);

});

// ================= APRI IN MODIFICA =================

function apriModificaAtleta(id){

  atletaInModifica = id;

  openPopup(); // usa popup già esistente

}
// ================= CARICA DATI ATLETA =================

// ================= CARICA DATI ATLETA =================

function caricaDatiAtleta(){

  if(!atletaInModifica) return;

  db.collection("atleti")
  .doc(atletaInModifica)
  .get()
  .then(doc=>{

    const data = doc.data();

    // ===== DATI BASE =====
    document.getElementById("nome").value = data.nome || "";
    document.getElementById("cognome").value = data.cognome || "";
    document.getElementById("dataNascita").value = data.dataNascita || "";
    document.getElementById("luogoNascita").value = data.luogoNascita || "";
    document.getElementById("classe").value = data.classe || "";
    document.getElementById("ruolo").value = data.ruolo || "";

    // ===== FISICI =====
    document.getElementById("altezza").value = data.altezza || "";
    document.getElementById("taglia").value = data.taglia || "";
    document.getElementById("scarpa").value = data.scarpa || "";

    // ===== CONTATTI =====
    document.getElementById("telefono1").value = data.telefono1 || "";
    document.getElementById("telefono2").value = data.telefono2 || "";
    document.getElementById("indirizzo").value = data.indirizzo || "";
    document.getElementById("email").value = data.email || "";

    // ===== NOTE =====
    document.getElementById("note").value = data.note || "";

  });
// ===== DOCUMENTI =====

if(data.documenti){

  const cert = document.querySelector('[data-key="certMedico"]');

  cert.classList.toggle("green", data.documenti.certMedico);
  cert.classList.toggle("red", !data.documenti.certMedico);

  document.getElementById("tesseraSanitariaNumero").value =
    data.documenti.tesseraSanitariaNumero || "";

  document.getElementById("documentoIdentitaNumero").value =
    data.documenti.documentoIdentitaNumero || "";

}

}
// ================= SALVATAGGIO COMPLETO =================

function salvaIscrizione(){

// ===== DOCUMENTI =====

const documenti = {

  certMedico:
    document.querySelector('[data-key="certMedico"]')
    .classList.contains("green"),

  tesseraSanitariaNumero:
    document.getElementById("tesseraSanitariaNumero").value,

  documentoIdentitaNumero:
    document.getElementById("documentoIdentitaNumero").value

};
  // ===== ATLETA =====
  const atleta = {

  // ===== DATI BASE =====
  nome: document.getElementById("nome").value,
  cognome: document.getElementById("cognome").value,
  dataNascita: document.getElementById("dataNascita").value,
  luogoNascita: document.getElementById("luogoNascita").value,
  classe: document.getElementById("classe").value,
  ruolo: document.getElementById("ruolo").value,

  // ===== FISICI =====
  altezza: document.getElementById("altezza").value,
  taglia: document.getElementById("taglia").value,
  scarpa: document.getElementById("scarpa").value,

  // ===== CONTATTI =====
  telefono1: document.getElementById("telefono1").value,
  telefono2: document.getElementById("telefono2").value,
  indirizzo: document.getElementById("indirizzo").value,
  email: document.getElementById("email").value,

  // ===== NOTE =====
  note: document.getElementById("note").value,

  // ===== ALLERGIE =====
  allergie:{
    stato:
      document.querySelector(".allergia-btn.green")
      ?.innerText === "SI",

    descrizione:
      document.getElementById("boxAllergie").value
  },

  // ===== DOCUMENTI =====
  documenti: documenti,

  createdAt: new Date()

};


  // ===== SALVA ATLETA =====
  db.collection("atleti").add(atleta)
  .then(ref => {

    // ===== ISCRIZIONI SETTIMANE =====
    document.querySelectorAll("#settimaneToggle .green")
    .forEach(w => {

      db.collection("iscrizioni").add({

        atletaId: ref.id,
        settimanaId: w.dataset.id,
        nome: atleta.nome,
        cognome: atleta.cognome,
        classe: atleta.classe,
        rimanenza:
          document.getElementById("restoPagamento").value,

        documenti: documenti,   // 👈 ORA SALVATI

        createdAt: new Date()

      });

    });

    alert("Salvato!");
    closeIscrizionePopup();

  });

}
// ================= CONTROLLO EDIT =================

window.addEventListener("load", ()=>{

  const id = localStorage.getItem("atletaEditId");

  if(id){

    atletaInModifica = id;

    openPopup();

    localStorage.removeItem("atletaEditId");

  }

});