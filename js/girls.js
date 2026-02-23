const CAMP = document.body.dataset.camp;

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
const file = document.getElementById("fileImport");
if(file) file.value = "";
}

function openArchivio(){
  window.location.href = "archivio.html?camp=" + CAMP;
}

// ================= TAB SWITCH =================

function showImport(){

  document.querySelectorAll(".tab-btn")
    .forEach(b=>b.classList.remove("active"));

  document.querySelectorAll(".tab-btn")[1]
    .classList.add("active");

  document.getElementById("manualeContent").style.display = "none";
  document.getElementById("importContent").style.display = "block";
}

function showManuale(){

  document.querySelectorAll(".tab-btn")
    .forEach(b=>b.classList.remove("active"));

  document.querySelectorAll(".tab-btn")[0]
    .classList.add("active");

  document.getElementById("manualeContent").style.display = "block";
  document.getElementById("importContent").style.display = "none";
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
   .where("camp","==",CAMP)
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
    if(data.camp !== CAMP) return;

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

  if(!nome.value.trim() || !cognome.value.trim()){
  alert("Nome e Cognome sono obbligatori");
  return;
}

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

  camp: CAMP,

  nome: nome.value.trim().toUpperCase(),
cognome: cognome.value.trim().toUpperCase(),
nomeLower: nome.value.trim().toLowerCase(),
cognomeLower: cognome.value.trim().toLowerCase(),
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

  pagamento: pagamento   // 🔥 QUESTA RIGA MANCAVA
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
  .where("camp","==",CAMP)
    .where("nomeLower","==", atleta.nome.toLowerCase())
    .where("cognomeLower","==", atleta.cognome.toLowerCase())
    .where("dataNascita","==", atleta.dataNascita)
    .get()
    .then(snapshot => {

      if(!snapshot.empty){
        alert("Atleta già inserito identico.");
        return;
      }

      salvaNuovo(atleta);

    })
    .catch(error=>{
      console.error("Errore controllo duplicato:", error);
      alert("Errore durante il controllo duplicati");
    });

}
function salvaNuovo(atleta){

  db.collection("atleti")
  .add(atleta)
  .then(async (docRef)=>{

    const atletaId = docRef.id;

    // 🔹 CREA ISCRIZIONI PER OGNI SETTIMANA SELEZIONATA
   // 🔹 CREA ISCRIZIONI PER OGNI SETTIMANA SELEZIONATA
if(atleta.settimane && atleta.settimane.length > 0){

  for(let settimana of atleta.settimane){

    const idIscrizione = atletaId + "_" + settimana.id;

    await db.collection("iscrizioni")
      .doc(idIscrizione)
      .set({
        atletaId: atletaId,
        settimanaId: settimana.id,
        quota: Number(settimana.prezzo),
        anno: new Date().getFullYear(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    // 🔥 SE C'È ACCONTO → CREA MOVIMENTO PAGAMENTO
   // 🔥 SE C'È ACCONTO → CREA MOVIMENTO PAGAMENTO
if(atleta.pagamento && Number(atleta.pagamento.acconto) > 0){

  await db.collection("pagamenti").add({
    atletaId: atletaId,
    settimanaId: settimana.id,
    importo: Number(atleta.pagamento.acconto),
    metodo: atleta.pagamento.metodoAcconto || "Non specificato",
    data: firebase.firestore.FieldValue.serverTimestamp(),
    anno: new Date().getFullYear()
  });

}

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

// ================= MAIUSCOLO AUTOMATICO =================

nome.addEventListener("input", ()=>{
  nome.value = nome.value.toUpperCase();
});

cognome.addEventListener("input", ()=>{
  cognome.value = cognome.value.toUpperCase();
});

function controllaOmonimi(){

  const n = nome.value.trim().toLowerCase();
  const c = cognome.value.trim().toLowerCase();

  if(!n || !c) return;

  db.collection("atleti")
  .where("camp","==",CAMP)
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

// ================= IMPORT EXCEL FOGLIO "1 - RAGAZZI" =================

async function importaExcel(){

  const input = document.getElementById("fileImport");

  if(!input.files.length){
    alert("Seleziona un file Excel");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = async function(e){

    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    // 🔴 PRENDE SOLO IL FOGLIO SPECIFICO
    const worksheet = workbook.Sheets["1 - RAGAZZI"];

    if(!worksheet){
      alert("Foglio '1 - RAGAZZI' non trovato nel file.");
      return;
    }

    const json = XLSX.utils.sheet_to_json(worksheet);

    if(json.length === 0){
      alert("Il foglio è vuoto.");
      return;
    }

    let importati = 0;

    for(const riga of json){

      if(!riga["GIOCATORE"]) continue;

      // 🔹 DIVIDE COGNOME NOME
const parts = riga["GIOCATORE"].toString().trim().split(" ");
const cognome = parts[0] || "";
const nome = parts.slice(1).join(" ") || "";

// 🔹 DATA NASCITA (gestione numero Excel)
let dataNascita = "";

if(riga["Data di Nascita"]){
  const valore = riga["Data di Nascita"];

  if(typeof valore === "number"){
    const dataExcel = XLSX.SSF.parse_date_code(valore);
    dataNascita = `${dataExcel.y}-${String(dataExcel.m).padStart(2,"0")}-${String(dataExcel.d).padStart(2,"0")}`;
  } else {
    dataNascita = valore;
  }
}

// 🔹 RUOLO (rimuove "A - ")
let ruolo = riga["Ruolo"] || "";

if(ruolo.includes("-")){
  ruolo = ruolo.split("-")[1].trim();
}

if(ruolo){
  ruolo = ruolo.charAt(0).toUpperCase() + ruolo.slice(1).toLowerCase();
}

// 🔹 EMAIL robusta (anche con spazi)
let email = "";

Object.keys(riga).forEach(key=>{
  if(key.trim().toUpperCase() === "E - MAIL"){
    email = riga[key];
  }
});

const atleta = {

  camp: CAMP,

  nome: String(nome || "").trim().toUpperCase(),
  cognome: String(cognome || "").trim().toUpperCase(),
  nomeLower: String(nome || "").trim().toLowerCase(),
  cognomeLower: String(cognome || "").trim().toLowerCase(),

  dataNascita: dataNascita,

  luogoNascita: String(riga["Luogo di Nascita"] || "").trim(),
  classe: String(riga["Classe"] || "").trim(),
  ruolo: String(ruolo || "").trim(),

  altezza: riga["ALTEZZA (in cm.)"] || "",
  taglia: String(riga["TAGLIA"] || "").trim(),
  scarpa: riga["Numero Scarpa"] || "",

  telefono1: String(riga["RECAPITO TELEFONICO 1"] || "").trim(),
  telefono2: String(riga["RECAPITO TELEFONICO 2"] || "").trim(),
  indirizzo: String(riga["INDIRIZZO"] || "").trim(),
  email: String(email || "").trim(),
  note: String(riga["NOTE"] || "").trim(),
        allergie: {
          stato: (riga["Allergie e Intolleranze"] || "").toString().toUpperCase() === "SI",
          descrizione: riga["DESCRIZIONE ALLERGIE E INTOLLERANZE"] || ""
        },

        documenti: {
          certMedico: (riga["Certificato Medico"] || "").toString().toUpperCase() === "SI",
          tesseraSanitaria: (riga["Tessera Sanitaria"] || "").toString().toUpperCase() === "SI",
          documentoIdentita: (riga["Documento Identità"] || "").toString().toUpperCase() === "SI"
        },

        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // 🔎 CONTROLLO DUPLICATO
      const dup = await db.collection("atleti")
      .where("camp","==",CAMP)
        .where("nomeLower","==", atleta.nomeLower)
        .where("cognomeLower","==", atleta.cognomeLower)
        .where("dataNascita","==", atleta.dataNascita)
        .get();

      if(dup.empty){
        await db.collection("atleti").add(atleta);
        importati++;
      }

    }

    alert("Import completato. Atlete importate: " + importati);

    input.value = "";
  };

  reader.readAsArrayBuffer(file);
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