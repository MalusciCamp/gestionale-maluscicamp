// ================= HEADER LOAD =================

fetch("components/header.html")
.then(r => r.text())
.then(h => document.getElementById("header").innerHTML = h);


// ================= MODALITÀ =================

let atletaInModifica = null;


// ================= POPUP =================

function openPopup(){

  atletaInModifica = null;

  resetPopup();

  document.getElementById("iscrizioneModal").style.display = "flex";

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


// Listener
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

    nome.value = data.nome || "";
    cognome.value = data.cognome || "";
    dataNascita.value = data.dataNascita || "";
    luogoNascita.value = data.luogoNascita || "";
    classe.value = data.classe || "";
    ruolo.value = data.ruolo || "";

    altezza.value = data.altezza || "";
    taglia.value = data.taglia || "";
    scarpa.value = data.scarpa || "";

    telefono1.value = data.telefono1 || "";
    telefono2.value = data.telefono2 || "";
    indirizzo.value = data.indirizzo || "";
    email.value = data.email || "";
    note.value = data.note || "";

    // Allergie
    if(data.allergie?.stato){
      toggleAllergie(
        document.querySelectorAll(".allergia-btn")[0],
        true
      );
      boxAllergie.value =
        data.allergie.descrizione || "";
    }

    // Documenti
    if(data.documenti){

      const cert =
        document.querySelector('[data-key="certMedico"]');

      if(cert){
        cert.classList.toggle(
          "green",
          data.documenti.certMedico
        );
        cert.classList.toggle(
          "red",
          !data.documenti.certMedico
        );
      }

      tesseraSanitariaNumero.value =
        data.documenti.tesseraSanitariaNumero || "";

      documentoIdentitaNumero.value =
        data.documenti.documentoIdentitaNumero || "";
    }

  });

}


// ================= SALVATAGGIO =================

function salvaIscrizione(){

  const documenti = {

    certMedico:
      document.querySelector('[data-key="certMedico"]')
      ?.classList.contains("green") || false,

    tesseraSanitariaNumero:
      tesseraSanitariaNumero.value,

    documentoIdentitaNumero:
      documentoIdentitaNumero.value
  };

  const atleta = {

    nome: nome.value,
    cognome: cognome.value,
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

    documenti: documenti
  };

  if(atletaInModifica){

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
  .where("cognome","==", atleta.cognome)
  .get()
  .then(snapshot=>{

    let duplicato = false;

    snapshot.forEach(doc=>{
      const data = doc.data();

      if(
        data.nome.toLowerCase() ===
        atleta.nome.toLowerCase()
      ){
        duplicato = true;
      }
    });

    if(duplicato){
      alert("Atleta già presente!");
    }else{
      salvaNuovo(atleta);
    }

  });

}

function salvaNuovo(atleta){

  db.collection("atleti")
  .add(atleta)
  .then(()=>{
    alert("Atleta salvato");
    closeIscrizionePopup();
  });

}


// ================= EDIT AUTO =================

window.addEventListener("load", ()=>{

  const id =
    localStorage.getItem("atletaEditId");

  if(id){

    atletaInModifica = id;

    openPopup();

    setTimeout(()=>{
      caricaDatiAtleta();
    },300);

    localStorage.removeItem("atletaEditId");

  }

});