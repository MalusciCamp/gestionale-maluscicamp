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

      // 🔹 Calcolo pagamenti reali
const pagamentiSnap = await db.collection("pagamenti")
  .where("atletaId","==", atletaId)
  .where("settimanaId","==", settimanaID)
  .get();

let pagato = 0;
let scontoExtraTotale = 0;

pagamentiSnap.forEach(p=>{
  const data = p.data();
  pagato += Number(data.importo || 0);
  scontoExtraTotale += Number(data.scontoExtra || 0);
});

const quota = Number(iscrizione.quota || 0);
const scontoIscrizione = Number(atleta.pagamento?.sconto || 0);

const quotaNetta = quota - scontoIscrizione - scontoExtraTotale;

let stato = "da_pagare";

if(pagato >= quotaNetta && quotaNetta > 0){
  stato = "pagato";
}else if(pagato > 0){
  stato = "parziale";
}
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
  ${
    atleta.documenti?.tesseraSanitaria?.trim()
      ? `
        <span class="ts-numero">
          ${atleta.documenti.tesseraSanitaria}
        </span>
      `
      : `
        <input 
          type="text"
          class="input-ts"
          placeholder="Inserisci CF"
          maxlength="16"
          onblur="salvaTesseraInline('${atletaId}', this)"
        >
      `
  }
</td>

<td>
  <span class="cert-toggle ${atleta.documenti?.documentoIdentita ? "green" : "red"}"
        onclick="toggleCert(this)">
    ${atleta.documenti?.documentoIdentita ? "SI" : "NO"}
  </span>
</td>
            <td class="stato-${stato}">
  ${stato}
</td>

    <td class="azioni-box">

  <button onclick="salvaDocumentiRiga('${atletaId}', this)">
    💾
  </button>

  <button onclick="apriPagamento('${atletaId}')">
    💰
  </button>

  ${stato === "pagato" ? `
    <button onclick="stampaRicevutaDiretta('${atletaId}')">
      🖨️
    </button>
  ` : ""}

  <button onclick="eliminaIscrizione('${docIscr.id}')">
    🗑️
  </button>

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
    certMedico: toggles[0]?.innerText === "SI",
    documentoIdentita: toggles[1]?.innerText === "SI"
  };

  await db.collection("atleti")
    .doc(atletaId)
    .update({
      documenti: {
        ...documenti,
        tesseraSanitaria: (
          (await db.collection("atleti").doc(atletaId).get())
          .data()?.documenti?.tesseraSanitaria || ""
        )
      }
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

 // ================= RECUPERO ISCRIZIONE =================

const iscrizioniSnap = await db.collection("iscrizioni")
  .where("atletaId","==", atletaId)
  .where("settimanaId","==", settimanaID)
  .get();

if(iscrizioniSnap.empty){
  alert("Iscrizione non trovata");
  return;
}

const iscrizione = iscrizioniSnap.docs[0].data();
let quotaTotale = Number(iscrizione.quota || 0);

  // 🔹 Recupero sconto da atleta
  const atletaDoc = await db.collection("atleti")
    .doc(atletaId)
    .get();

  const atletaData = atletaDoc.data() || {};
  const scontoIscrizione = Number(atletaData?.pagamento?.sconto || 0);

  // 🔹 Calcolo pagato
  const pagamentiSnap = await db.collection("pagamenti")
    .where("atletaId","==", atletaId)
    .where("settimanaId","==", settimanaID)
    .get();

 let pagato = 0;
let scontoExtraTotale = 0;

pagamentiSnap.forEach(p=>{
  const data = p.data();
  pagato += Number(data.importo || 0);
  scontoExtraTotale += Number(data.scontoExtra || 0);
});

  // 🔹 Aggiorno campi
  document.getElementById("totaleDovuto").innerText = quotaTotale;
  document.getElementById("totalePagato").innerText = pagato;

  // 🔹 Mostra sconto
  if(scontoIscrizione > 0){
    document.getElementById("scontoIscrizione").innerText = scontoIscrizione;
    document.getElementById("rigaScontoIscrizione").style.display = "block";
  }else{
    document.getElementById("rigaScontoIscrizione").style.display = "none";
  }

  // 🔥 RESIDUO CORRETTO
 const residuo = quotaTotale - scontoIscrizione - scontoExtraTotale - pagato;
  document.getElementById("residuoPagamento").innerText = residuo;

  // reset campi
  document.getElementById("scontoPagamento").value = 0;
  document.getElementById("importoPagamento").value = "";
  document.getElementById("metodoPagamento").value = "";

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
// 🔹 CREA PAGAMENTO
const pagamentoRef = db.collection("pagamenti").doc();

await pagamentoRef.set({
  atletaId: atletaPagamentoInCorso,
  settimanaId: settimanaID,
  importo: importo,
  metodo: metodo,

  // 🔥 NUOVO CAMPO SCONTO EXTRA
  scontoExtra: Number(document.getElementById("scontoPagamento")?.value) || 0,

  numeroRicevuta: null,
  data: firebase.firestore.FieldValue.serverTimestamp(),
  anno: new Date().getFullYear()
});

  // 🔹 NON chiudere popup
  await caricaIscritti();
  await apriPagamento(atletaPagamentoInCorso);

  // 🔹 Mostra pulsante stampa
  const btn = document.getElementById("btnStampaRicevuta");

 if(btn){
  btn.style.display = "block";

  btn.onclick = function(){
    stampaRicevutaDiretta(atletaPagamentoInCorso);
  };
}

} // 🔥 CHIUSURA CORRETTA DI registraPagamento

async function stampaRicevutaDiretta(atletaId){

  const anno = new Date().getFullYear();

  // ================= RECUPERO PAGAMENTI =================

  const pagamentiSnap = await db.collection("pagamenti")
    .where("atletaId","==", atletaId)
    .where("settimanaId","==", settimanaID)
    .orderBy("data")
    .get();

  if(pagamentiSnap.empty) return;

  let numeroRicevuta = null;
  let totalePagato = 0;

  pagamentiSnap.forEach(doc=>{
    const data = doc.data();
    totalePagato += Number(data.importo || 0);

    if(data.numeroRicevuta){
      numeroRicevuta = data.numeroRicevuta;
    }
  });

  // ================= ASSEGNA NUMERO SE NON ESISTE =================

  if(!numeroRicevuta){

    const configRef = db.collection("config").doc("contatori");
    const configDoc = await configRef.get();

    let progressivo = 1;

    if(configDoc.exists){
      progressivo = configDoc.data().numeroRicevute || 1;
    }

    numeroRicevuta = progressivo;

    await configRef.set({
      numeroRicevute: progressivo + 1
    }, { merge:true });

    const primoPagamento = pagamentiSnap.docs[0];
    await primoPagamento.ref.update({
      numeroRicevuta: numeroRicevuta
    });
  }

  // ================= RECUPERO DATI ATLETA =================

  const atletaDoc = await db.collection("atleti")
    .doc(atletaId)
    .get();

  if(!atletaDoc.exists) return;

  const atleta = atletaDoc.data();
  // ================= RECUPERO ISCRIZIONE =================

const iscrizioniSnap = await db.collection("iscrizioni")
  .where("atletaId","==", atletaId)
  .where("settimanaId","==", settimanaID)
  .get();

if(iscrizioniSnap.empty){
  alert("Iscrizione non trovata");
  return;
}

const iscrizione = iscrizioniSnap.docs[0].data();
let quotaTotale = Number(iscrizione.quota || 0);

  // ================= PERIODO SETTIMANA =================

  let periodoTesto = "";

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(settimanaDoc.exists){
    const settimana = settimanaDoc.data();

    const dal = settimana.dal?.toDate
      ? settimana.dal.toDate()
      : settimana.dal;

    const al = settimana.al?.toDate
      ? settimana.al.toDate()
      : settimana.al;

    if(dal && al){
      periodoTesto =
        `${formattaData(dal)} - ${formattaData(al)}`;
    }
  }

  // ================= DATA NASCITA CORRETTA =================

  const dataNascita = atleta.dataNascita?.toDate
    ? atleta.dataNascita.toDate()
    : atleta.dataNascita;

  const dataNascitaFormattata = dataNascita
    ? formattaData(dataNascita)
    : "__________";

  const dataOggi = new Date().toLocaleDateString("it-IT");

  // ================= CREAZIONE PDF =================

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a5"
  });

  // ================= LOGO =================

  try{
    pdf.addImage("img/logo.png", "PNG", 10, 8, 35, 12);
  }catch(e){}

  // ================= INTESTAZIONE =================

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("A.S.D. MALUSCI CAMP", 55, 12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Via Montalbano N°98 51039 QUARRATA (PT)", 55, 17);
  pdf.text("P.IVA 01963540479", 55, 22);

  pdf.line(10, 28, 200, 28);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `RICEVUTA DI PAGAMENTO N° ${numeroRicevuta} / ${anno}`,
    15,
    38
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  let y = 48;

  pdf.text(
    `Ha versato la somma di € ${quotaTotale.toFixed(2)} a titolo di partecipazione`,
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

  // ================= DATI ATLETA =================

  y += 10;
  pdf.text(
    `Atleta: ${atleta.cognome || ""} ${atleta.nome || ""}`,
    15,
    y
  );

  y += 6;
  pdf.text(
    `C.F. ________________________________________________`,
    15,
    y
  );

  y += 6;
  pdf.text(
    `Nato/a a ${atleta.luogoNascita || "__________"} il ${dataNascitaFormattata}`,
    15,
    y
  );

  y += 6;
  pdf.text(
    `Residente in ${atleta.indirizzo || "__________________________________________"}`,
    15,
    y
  );

  // ================= FIRMA =================

  y += 12;
  pdf.text(
    `Luogo ____________________    Data ${dataOggi}`,
    15,
    y
  );

  pdf.rect(120, 85, 65, 35);
  pdf.setFontSize(8);
  pdf.text("Per Associazione Sportiva Dilettantistica", 122, 92);
  pdf.text("Timbro e Firma", 122, 98);

  pdf.save(`Ricevuta_${numeroRicevuta}_${atleta.cognome}.pdf`);
}


// ================= FORMATTA DATA SICURA =================

function formattaData(data){
  if(!data) return "";
  const d = new Date(data);
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

  const idIscrizione = atletaId + "_" + settimanaID;

  const docRef = db.collection("iscrizioni").doc(idIscrizione);
  const doc = await docRef.get();

  if(doc.exists){
    alert("Atleta già iscritto a questa settimana.");
    return;
  }

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(!settimanaDoc.exists) return;

  const settimana = settimanaDoc.data();

  await docRef.set({
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
window.addEventListener("DOMContentLoaded", () => {

  const popup = document.getElementById("popupAggiungi");

  if(popup){
    popup.addEventListener("click", function(e){

      if(e.target === popup){
        chiudiPopupAggiungi();
      }

    });
  }

});

async function eliminaIscrizione(idIscrizione){

  const conferma = confirm(
    "Eliminando l'iscrizione verranno eliminati anche i pagamenti registrati per questa settimana.\nContinuare?"
  );

  if(!conferma) return;

  const doc = await db.collection("iscrizioni")
    .doc(idIscrizione)
    .get();

  if(!doc.exists) return;

  const iscr = doc.data();
  const atletaId = iscr.atletaId;

  // 🔹 Elimina iscrizione
  await db.collection("iscrizioni")
    .doc(idIscrizione)
    .delete();

  // 🔹 Trova pagamenti collegati
  const pagamentiSnap = await db.collection("pagamenti")
    .where("atletaId","==", atletaId)
    .get();

  const batch = db.batch();

  pagamentiSnap.forEach(p => {

    const data = p.data();

    if(data.settimanaId === settimanaID){
      batch.delete(p.ref);
    }

  });

  await batch.commit();

  caricaIscritti();
}

document.getElementById("popupPagamento")
  .addEventListener("click", function(e){

    if(e.target.id === "popupPagamento"){
      chiudiPopupPagamento();
    }

});
document.getElementById("scontoPagamento")
  ?.addEventListener("input", function(){

    const quota = Number(totaleDovuto.innerText) || 0;
    const scontoIscrizione = Number(document.getElementById("scontoIscrizione")?.innerText) || 0;
    const scontoExtra = Number(this.value) || 0;
    const pagato = Number(totalePagato.innerText) || 0;


    const totaleNetto = quota - scontoIscrizione - scontoExtra;

    residuoPagamento.innerText = totaleNetto - pagato;

  });


// Rendi le funzioni globali
window.stampaRicevutaDiretta = stampaRicevutaDiretta;
window.eliminaIscrizione = eliminaIscrizione;

async function salvaTesseraInline(atletaId, input){

  const valore = input.value.trim().toUpperCase();

  if(valore === ""){
    alert("Inserisci un numero valido");
    return;
  }

  if(valore.length !== 16){
    alert("Il Codice Fiscale deve avere 16 caratteri");
    return;
  }

  try {

    await db.collection("atleti")
      .doc(atletaId)
      .update({
        "documenti.tesseraSanitaria": valore
      });

    // 🔥 Aggiorna visivamente la cella
    input.parentElement.innerHTML = `
      <span class="ts-numero">
        ${valore}
      </span>
    `;

  } catch(error){
    console.error("Errore salvataggio tessera:", error);
    alert("Errore salvataggio");
  }
}
window.salvaTesseraInline = salvaTesseraInline;