// ================= HEADER LOAD =================

fetch("components/header.html")
.then(r => r.text())
.then(h => document.getElementById("header").innerHTML = h);

// ================= MODALITÀ =================

let atletaInModifica = null;


// ================= POPUP =================

function openPopup(){
  document.getElementById("iscrizioneModal").style.display = "flex";
  caricaSettimane();
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

// ================= SALVATAGGIO COMPLETO =================

function salvaIscrizione(){

  // ===== DOCUMENTI =====
  const documenti = {

    certMedico:
      document.querySelectorAll(".documento")[0]
      .classList.contains("green"),

    tesseraSanitaria:
      document.querySelectorAll(".documento")[1]
      .classList.contains("green"),

    documentoIdentita:
      document.querySelectorAll(".documento")[2]
      .classList.contains("green"),

    vaccini:
      document.querySelectorAll(".documento")[3]
      .classList.contains("green"),

    firme:
      document.querySelectorAll(".documento")[4]
      .classList.contains("green")

  };


  // ===== ATLETA =====
  const atleta = {

    nome: document.getElementById("nome").value,
    cognome: document.getElementById("cognome").value,
    classe: document.getElementById("classe").value,
    ruolo: document.getElementById("ruolo").value,
    altezza: document.getElementById("altezza").value,
    taglia: document.getElementById("taglia").value,
    scarpa: document.getElementById("scarpa").value,
    telefono1: document.getElementById("telefono1").value,
    telefono2: document.getElementById("telefono2").value,
    email: document.getElementById("email").value,

    documenti: documenti,

    allergie: {
      stato:
        document.querySelector(".allergia-btn.green")
        ?.innerText === "SI",

      descrizione:
        document.getElementById("boxAllergie").value
    },

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