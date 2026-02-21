let ultimoPagamentoRegistrato = null;

// ================= FIREBASE CONFIG =================

const firebaseConfig = {
  apiKey: "AIzaSyDVomjMP2gDUy_mEIe-tnVf4hEdF7GFvws",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp",
  storageBucket: "gestionale-maluscicamp.appspot.com",
  messagingSenderId: "615282026849",
  appId: "1:615282026849:web:bf46adfca227570d7d7d20"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// ================= HEADER =================

fetch("components/header.html")
  .then(r => r.text())
  .then(h => document.getElementById("header").innerHTML = h);


// ================= PARAMETRI URL =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

const tbody = document.getElementById("listaIscritti");
const titolo = document.getElementById("titoloSettimana");


// ================= CARICA NOME SETTIMANA =================

async function caricaTitoloSettimana() {

  if(!settimanaID){
    titolo.textContent = "Settimana non trovata";
    return;
  }

  const doc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(doc.exists){
    titolo.textContent = "Iscritti - " + doc.data().nome;
  } else {
    titolo.textContent = "Settimana non trovata";
  }
}


async function caricaIscritti(){

  tbody.innerHTML = "";

  if(!settimanaID) return;

  try {

    const snapshot = await db.collection("iscrizioni")
      .where("settimanaId","==", settimanaID)
      .get();

    if(snapshot.empty){
      tbody.innerHTML = `
        <tr>
          <td colspan="6">Nessuna iscrizione presente</td>
        </tr>
      `;
      return;
    }

    let righe = [];

    for(const docIscr of snapshot.docs){

      const iscrizione = docIscr.data();
      const atletaId = iscrizione.atletaId;

      const atletaDoc = await db.collection("atleti")
        .doc(atletaId)
        .get();

      if(!atletaDoc.exists) continue;

      const atleta = atletaDoc.data();

      righe.push({
        cognome: atleta.cognome || "",
        html: `
          <tr>
            <td>${atleta.cognome} ${atleta.nome}</td>

            <td>
  <span class="cert-toggle ${atleta.documenti?.certMedico ? "green" : "red"}"
        onclick="toggleCert(this)">
    ${atleta.documenti?.certMedico ? "SI" : "NO"}
  </span>
</td>

<td>
  <span class="cert-toggle ${atleta.documenti?.tesseraSanitaria ? "green" : "red"}"
        onclick="toggleCert(this)">
    ${atleta.documenti?.tesseraSanitaria ? "SI" : "NO"}
  </span>
</td>

<td>
  <span class="cert-toggle ${atleta.documenti?.documentoIdentita ? "green" : "red"}"
        onclick="toggleCert(this)">
    ${atleta.documenti?.documentoIdentita ? "SI" : "NO"}
  </span>
</td>
            <td class="stato-${iscrizione.statoPagamento}">
              ${iscrizione.statoPagamento}
            </td>

            <td class="azioni-box">

  <button onclick="salvaDocumentiRiga('${atletaId}', this)">
    💾
  </button>

  <button onclick="apriPagamento('${atletaId}')">
    💰
  </button>

  ${iscrizione.statoPagamento === "pagato" ? `
    <button onclick="stampaRicevutaDiretta('${atletaId}')">
      🖨️
    </button>
  ` : ""}

</td>
          </tr>
        `
      });

    }

    // Ordine alfabetico per cognome
    righe.sort((a,b)=>a.cognome.localeCompare(b.cognome));

    righe.forEach(r=>{
      tbody.innerHTML += r.html;
    });

  } catch(error){
    console.error("Errore caricamento iscritti:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Errore caricamento dati</td>
      </tr>
    `;
  }
}


// ================= PAGAMENTO (placeholder) =================

function apriPagamento(atletaId){
  alert("Prossimo step: popup pagamento automatico.");
}



// ================= AVVIO =================

window.addEventListener("DOMContentLoaded", async () => {
  await caricaTitoloSettimana();
  await caricaIscritti();
});

function toggleCert(el){

  if(el.innerText === "SI"){
    el.innerText = "NO";
    el.classList.remove("green");
    el.classList.add("red");
  }else{
    el.innerText = "SI";
    el.classList.remove("red");
    el.classList.add("green");
  }

}

async function salvaDocumentiRiga(atletaId, btn){

  const tr = btn.closest("tr");

  const toggles = tr.querySelectorAll(".cert-toggle");

  const documenti = {
    certMedico: toggles[0].innerText === "SI",
    tesseraSanitaria: toggles[1].innerText === "SI",
    documentoIdentita: toggles[2].innerText === "SI"
  };

  await db.collection("atleti")
    .doc(atletaId)
    .update({
      documenti: documenti
    });

  btn.innerText = "✔";
  setTimeout(()=>{
    btn.innerText = "💾";
  },800);
}

let atletaPagamentoInCorso = null;
let iscrizioniAtletaCache = [];

async function apriPagamento(atletaId){

  atletaPagamentoInCorso = atletaId;

  const snapshot = await db.collection("iscrizioni")
    .where("atletaId","==", atletaId)
    .get();

  let totale = 0;
  let pagato = 0;

  iscrizioniAtletaCache = [];

  snapshot.forEach(doc=>{
    const data = doc.data();
    totale += data.quota;
    pagato += data.pagato || 0;

    iscrizioniAtletaCache.push({
      id: doc.id,
      quota: data.quota,
      pagato: data.pagato || 0
    });
  });

  totaleDovuto.innerText = totale;
  totalePagato.innerText = pagato;
  residuoPagamento.innerText = totale - pagato;

  importoPagamento.value = "";
  metodoPagamento.value = "";

  document.getElementById("popupPagamento").style.display = "flex";
}

function chiudiPopupPagamento(){
  document.getElementById("popupPagamento").style.display = "none";
}

async function registraPagamento(){

  const importo = Number(importoPagamento.value);
  const metodo = metodoPagamento.value;

  if(!importo || importo <= 0){
    alert("Inserisci importo valido");
    return;
  }

  if(!metodo){
    alert("Seleziona metodo pagamento");
    return;
  }

  // 1️⃣ CREA MOVIMENTO PAGAMENTO
const pagamentoRef = await db.collection("pagamenti").add({
  atletaId: atletaPagamentoInCorso,
  importo: importo,
  metodo: metodo,
  data: firebase.firestore.FieldValue.serverTimestamp(),
  anno: new Date().getFullYear()
});

ultimoPagamentoRegistrato = {
  id: pagamentoRef.id,
  atletaId: atletaPagamentoInCorso,
  importo: importo,
  metodo: metodo,
  data: new Date()
};

  // 2️⃣ DISTRIBUZIONE AUTOMATICA
  let residuo = importo;

  for(let iscrizione of iscrizioniAtletaCache){

    if(residuo <= 0) break;

    const daPagare = iscrizione.quota - iscrizione.pagato;

    if(daPagare <= 0) continue;

    if(residuo >= daPagare){

      await db.collection("iscrizioni")
        .doc(iscrizione.id)
        .update({
          pagato: iscrizione.quota,
          statoPagamento: "pagato"
        });

      residuo -= daPagare;

    }else{

      await db.collection("iscrizioni")
        .doc(iscrizione.id)
        .update({
          pagato: iscrizione.pagato + residuo,
          statoPagamento: "parziale"
        });

      residuo = 0;
    }
  }

  // DOPO distribuzione pagamento

caricaIscritti();

// Mostra pulsante stampa
document.getElementById("btnStampaRicevuta").style.display = "block";
}

async function stampaRicevutaDiretta(atletaId){

  const { jsPDF } = window.jspdf;

  const atletaDoc = await db.collection("atleti")
    .doc(atletaId)
    .get();

  if(!atletaDoc.exists) return;

  const atleta = atletaDoc.data();

  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("atletaId","==", atletaId)
    .get();

  let totalePagato = 0;
  let periodi = [];

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();
    totalePagato += iscr.pagato || 0;

    const settimanaDoc = await db.collection("settimane")
      .doc(iscr.settimanaId)
      .get();

    if(settimanaDoc.exists){
      const settimana = settimanaDoc.data();

      if(settimana.dal && settimana.al){
        periodi.push(
          `${formattaData(settimana.dal)} - ${formattaData(settimana.al)}`
        );
      }
    }
  }

  const periodoTesto = periodi.join("  |  ");
  const anno = new Date().getFullYear();
  const dataOggi = new Date().toLocaleDateString("it-IT");

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a5"
  });

  // 🔹 LOGO
  try{
    pdf.addImage("img/logo.png", "PNG", 10, 8, 35, 12);
  }catch(e){}

  // 🔹 INTESTAZIONE
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("A.S.D. MALUSCI CAMP", 55, 12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Via Montalbano N°98 51039 QUARRATA (PT)", 55, 17);
  pdf.text("P.IVA 01963540479", 55, 22);

  pdf.setDrawColor(0);
  pdf.line(10, 28, 200, 28);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `RICEVUTA DI PAGAMENTO - ANNO ${anno}`,
    15,
    38
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  let y = 48;

  pdf.text(
    `Ha versato la somma di € ${totalePagato.toFixed(2)} a titolo di partecipazione`,
    15,
    y
  );

  y += 6;
  pdf.text(
    "al Camp Estivo Malusci Camp con pernottamento in Lizzano Belvedere (BO)",
    15,
    y
  );

  y += 6;
  pdf.text(`Periodo: ${periodoTesto}`, 15, y);

  y += 10;
  pdf.text(`Atleta: ${atleta.cognome || ""} ${atleta.nome || ""}`, 15, y);

  y += 6;
  pdf.text(
    `Nato/a a ${atleta.luogoNascita || "________"} il ${formattaData(atleta.dataNascita) || "________"}`,
    15,
    y
  );

  y += 6;
  pdf.text(
    `Residente in ${atleta.indirizzo || "______________________________"}`,
    15,
    y
  );

  y += 6;
  pdf.text("Codice Fiscale ________________________________", 15, y);

  y += 12;
  pdf.text(`Luogo ____________________    Data ${dataOggi}`, 15, y);

  // 🔹 BOX TIMBRO E FIRMA
  pdf.rect(120, 85, 65, 35);
  pdf.setFontSize(8);
  pdf.text("Per Associazione Sportiva Dilettantistica", 122, 92);
  pdf.text("Timbro e Firma", 122, 98);

  pdf.save(`Ricevuta_${atleta.cognome}.pdf`);
}

function formattaData(dataISO){
  if(!dataISO) return "";
  const d = new Date(dataISO);
  return d.toLocaleDateString("it-IT");
}

function apriPopupAggiungi(){

  const popup = document.getElementById("popupAggiungi");
  const input = document.getElementById("ricercaCognome");
  const risultati = document.getElementById("risultatiRicerca");

  // Mostra popup
  popup.style.display = "flex";

  // Reset campo e risultati
  input.value = "";
  risultati.innerHTML = "";

  // Focus automatico sul campo ricerca
  setTimeout(() => {
    input.focus();
  }, 100);
}


function chiudiPopupAggiungi(){

  const popup = document.getElementById("popupAggiungi");
  const input = document.getElementById("ricercaCognome");
  const risultati = document.getElementById("risultatiRicerca");

  popup.style.display = "none";

  // Pulizia
  input.value = "";
  risultati.innerHTML = "";
}
async function cercaAtleta(){

  const testo = document
    .getElementById("ricercaCognome")
    .value
    .toLowerCase()
    .trim();

  const box = document.getElementById("risultatiRicerca");
  box.innerHTML = "";

  if(testo.length < 2) return;

  const snapshot = await db.collection("atleti").get();

  snapshot.forEach(doc => {

    const atleta = doc.data();

    if(atleta.cognomeLower?.includes(testo)){

      const div = document.createElement("div");
      div.className = "riga-risultato";
      div.innerText = atleta.cognome + " " + atleta.nome;

      div.onclick = () => aggiungiIscrizioneManuale(doc.id);

      box.appendChild(div);
    }

  });
}
async function aggiungiIscrizioneManuale(atletaId){

  // 🔹 controllo se già iscritto
  const giaIscritto = await db.collection("iscrizioni")
    .where("atletaId","==", atletaId)
    .where("settimanaId","==", settimanaID)
    .get();

  if(!giaIscritto.empty){
    alert("Atleta già iscritto a questa settimana.");
    return;
  }

  // 🔹 recupero prezzo settimana
  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(!settimanaDoc.exists) return;

  const settimana = settimanaDoc.data();

  await db.collection("iscrizioni").add({
    atletaId: atletaId,
    settimanaId: settimanaID,
    quota: Number(settimana.prezzo),
    pagato: 0,
    statoPagamento: "da_pagare",
    anno: new Date().getFullYear(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("Iscrizione aggiunta!");

  chiudiPopupAggiungi();
  caricaIscritti();
}

document.getElementById("popupAggiungi")
  .addEventListener("click", function(e){

    if(e.target.id === "popupAggiungi"){
      chiudiPopupAggiungi();
    }

});