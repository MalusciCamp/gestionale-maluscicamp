// ================= HEADER LOAD =================

fetch("components/header.html")
.then(r => r.text())
.then(h => document.getElementById("header").innerHTML = h);


// ================= MODALITÀ =================

let atletaInModifica = null;
let modalitaArchivio = false;


// ================= POPUP =================

function openPopup(edit = false){

  modalitaArchivio = edit;

  const sezioneSP = document.querySelector(".settimane-pagamento-wrapper");

  if(sezioneSP){
    if(edit){
      sezioneSP.style.display = "none";
    }else{
      sezioneSP.style.display = ""; 
      // 🔥 Rimuove inline style e ripristina CSS originale
    }
  }

  if(!edit){
    atletaInModifica = null;
    resetPopup();
  }

  document.getElementById("iscrizioneModal")
    .style.display = "flex";

  caricaSettimane();
}

function closeIscrizionePopup(){
  document.getElementById("iscrizioneModal").style.display = "none";
}

function resetPopup(){

  document.querySelectorAll(
    "#iscrizioneModal input, #iscrizioneModal textarea"
  ).forEach(el => el.value = "");

  document.querySelectorAll(".toggle")
  .forEach(t=>{
    t.classList.remove("green");
    t.classList.add("red");
  });

}

function openArchivio(){
  window.location.href = "archivio.html";
}


// ================= DOCUMENTI =================

document.addEventListener("click", e => {

  if(e.target.classList.contains("documento")){
    e.target.classList.toggle("green");
    e.target.classList.toggle("red");
  }

});

// ================= ALLERGIE =================

function toggleAllergie(btn, stato){

  document.querySelectorAll(".allergia-btn")
  .forEach(b=>{
    b.classList.remove("green");
    b.classList.add("red");
  });

  btn.classList.remove("red");
  btn.classList.add("green");

  const box = document.getElementById("boxAllergie");

  stato
    ? box.classList.remove("hidden")
    : box.classList.add("hidden");
}


// ================= SETTIMANE =================

function caricaSettimane(){

  const c = document.getElementById("settimaneToggle");
  c.innerHTML = "";

  db.collection("settimane")
  .orderBy("createdAt")
  .get()
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


// ================= PAGAMENTI =================

function calcolaTotale(){

  let tot = 0;

  document.querySelectorAll("#settimaneToggle .green")
  .forEach(b => tot += Number(b.dataset.prezzo));

  totalePagamento.value = tot;

  calcolaSconto();
}

function calcolaSconto(){

  const s = Number(scontoPagamento.value) || 0;
  const tot = Number(totalePagamento.value) || 0;

  totaleScontato.value = tot - s;

  calcolaRimanenza();
}

function calcolaRimanenza(){

  const a = Number(accontoPagamento.value) || 0;
  const t = Number(totaleScontato.value) || 0;

  restoPagamento.value = t - a;
}


// Listener pagamenti
window.addEventListener("DOMContentLoaded", () => {

  scontoPagamento?.addEventListener("input", calcolaSconto);
  accontoPagamento?.addEventListener("input", calcolaRimanenza);

});


// ================= CARICA DATI MODIFICA =================

function caricaDatiAtleta(){

  if(!atletaInModifica) return;

  db.collection("atleti")
  .doc(atletaInModifica)
  .get()
  .then(doc=>{

    const data = doc.data();
    if(!data) return;

    // ===== DATI BASE =====
    nome.value = data.nome || "";
    cognome.value = data.cognome || "";
    dataNascita.value = data.dataNascita || "";
    luogoNascita.value = data.luogoNascita || "";
    classe.value = data.classe || "";
    ruolo.value = data.ruolo || "";

    // ===== FISICI =====
    altezza.value = data.altezza || "";
    taglia.value = data.taglia || "";
    scarpa.value = data.scarpa || "";

    // ===== CONTATTI =====
    telefono1.value = data.telefono1 || "";
    telefono2.value = data.telefono2 || "";
    indirizzo.value = data.indirizzo || "";
    email.value = data.email || "";
    note.value = data.note || "";

    // ===== ALLERGIE =====
    if(data.allergie?.stato){
      toggleAllergie(
        document.querySelectorAll(".allergia-btn")[0],
        true
      );
      boxAllergie.value =
        data.allergie.descrizione || "";
    }else{
      toggleAllergie(
        document.querySelectorAll(".allergia-btn")[1],
        false
      );
    }

// ===== DOCUMENTI =====
if(data.documenti){

  document.querySelectorAll(".documento")
  .forEach(box=>{

    const key = box.dataset.key;

    if(data.documenti[key]){
      box.classList.remove("red");
      box.classList.add("green");
    }else{
      box.classList.remove("green");
      box.classList.add("red");
    }

  });

}
    // =========================
    // ===== SETTIMANE =====
    // =========================
    if(data.settimane){

      setTimeout(()=>{

        document
        .querySelectorAll("#settimaneToggle .toggle")
        .forEach(box=>{

          const trovata = data.settimane.find(
            s => s.id === box.dataset.id
          );

          if(trovata){
            box.classList.remove("red");
            box.classList.add("green");
          }

        });

        calcolaTotale();

      },300);
    }

    // =========================
    // ===== PAGAMENTO =====
    // =========================
    if(data.pagamento){

      totalePagamento.value =
        data.pagamento.totale || 0;

      scontoPagamento.value =
        data.pagamento.sconto || 0;

      totaleScontato.value =
        data.pagamento.totaleScontato || 0;

      accontoPagamento.value =
        data.pagamento.acconto || 0;

      restoPagamento.value =
        data.pagamento.saldo || 0;

      metodoAcconto.value =
        data.pagamento.metodoAcconto || "";

      metodoSaldo.value =
        data.pagamento.metodoSaldo || "";
    }

  });

}

// ================= SALVATAGGIO =================

function salvaIscrizione(){

  // ===== SETTIMANE SELEZIONATE =====
const settimaneSelezionate = [];

document
.querySelectorAll("#settimaneToggle .green")
.forEach(box => {

  settimaneSelezionate.push({
    id: box.dataset.id,
    nome: box.innerText,
    prezzo: Number(box.dataset.prezzo)
  });

});

// ===== PAGAMENTO =====
const pagamento = {

  totale: Number(totalePagamento.value) || 0,
  sconto: Number(scontoPagamento.value) || 0,
  totaleScontato: Number(totaleScontato.value) || 0,

  acconto: Number(accontoPagamento.value) || 0,
  metodoAcconto: metodoAcconto.value || "",

  saldo:
    Number(totaleScontato.value || 0) -
    Number(accontoPagamento.value || 0),

  metodoSaldo: metodoSaldo.value || ""
};

 const documenti = {};

document.querySelectorAll(".documento")
.forEach(box=>{
  documenti[box.dataset.key] =
    box.classList.contains("green");
});
  const atleta = {

    nome: nome.value,
    cognome: cognome.value,
    cognomeLower: cognome.value.toLowerCase(),
    dataNascita: dataNascita.value,
    luogoNascita: luogoNascita.value,
    classe: classe.value,
    ruolo: ruolo.value,

    altezza: altezza.value,
    taglia: taglia.value,
    scarpa: scarpa.value,

    telefono1: telefono1.value,
    telefono2: telefono2.value,
    indirizzo: indirizzo.value,
    email: email.value,
    note: note.value,

    allergie:{
      stato:
        document.querySelector(".allergia-btn.green")
        ?.innerText === "SI",
      descrizione: boxAllergie.value
    },

    documenti: documenti,
settimane: settimaneSelezionate,
pagamento: pagamento
  };

 if(modalitaArchivio){

  // 🔥 Rimuovo settimane e pagamento dall’oggetto
  delete atleta.settimane;
  delete atleta.pagamento;

  db.collection("atleti")
    .doc(atletaInModifica)
    .update(atleta)
    .then(()=>{
      alert("Atleta aggiornato");
      closeIscrizionePopup();
    });


  }else{

    controllaDuplicato(atleta);

  }

}


// ================= DUPLICATI =================

function controllaDuplicato(atleta){

  db.collection("atleti")
  .get()
  .then(snapshot=>{

    let identico = false;

    snapshot.forEach(doc=>{

      const d = doc.data();

      if(
        d.nome?.toLowerCase() === atleta.nome.toLowerCase() &&
        d.cognome?.toLowerCase() === atleta.cognome.toLowerCase() &&
        d.dataNascita === atleta.dataNascita
      ){
        identico = true;
      }

    });

    if(identico){
      alert("Atleta già inserito identico.");
    }else{
      salvaNuovo(atleta);
    }

  });

}

function salvaNuovo(atleta){

  db.collection("atleti")
  .add(atleta)
  .then(async (docRef)=>{

    const atletaId = docRef.id;

    // 🔹 CREA ISCRIZIONI PER OGNI SETTIMANA SELEZIONATA
    if(atleta.settimane && atleta.settimane.length > 0){

      for(let settimana of atleta.settimane){

       const idIscrizione = atletaId + "_" + settimana.id;

await db.collection("iscrizioni")
  .doc(idIscrizione)
  .set({
          atletaId: atletaId,
          settimanaId: settimana.id,
          quota: settimana.prezzo,
          pagato: 0,
          statoPagamento: "da_pagare",
          anno: new Date().getFullYear(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      }

    }

    alert("Atleta salvato e iscrizioni create");
    closeIscrizionePopup();

  })
  .catch(err=>{
    console.error(err);
    alert("Errore salvataggio");
  });

}


// ================= AUTOCOMPILA =================

nome.addEventListener("blur", controllaOmonimi);
cognome.addEventListener("blur", controllaOmonimi);

function controllaOmonimi(){

  const n = nome.value.trim().toLowerCase();
  const c = cognome.value.trim().toLowerCase();

  if(!n || !c) return;

  db.collection("atleti")
  .get()
  .then(snapshot=>{

    snapshot.forEach(doc=>{

      const d = doc.data();

      if(
        d.nome?.toLowerCase() === n &&
        d.cognome?.toLowerCase() === c
      ){

        const conferma = confirm(
          "Atleta già presente.\nCaricare i dati?"
        );

        if(conferma){

          atletaInModifica = doc.id;

          caricaDatiAtleta();

          modalitaArchivio = false;
        }

      }

    });

  });

}


// ================= EDIT AUTO =================

window.addEventListener("load", ()=>{

  const id = localStorage.getItem("atletaEditId");

  if(id){

    atletaInModifica = id;

    openPopup(true);

    setTimeout(()=>{
      caricaDatiAtleta();
    },300);

    localStorage.removeItem("atletaEditId");
  }

});