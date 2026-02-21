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


// ================= AGGIUNTA MANUALE (placeholder) =================

function apriPopupAggiungi(){
  alert("Prossimo step: ricerca cognome e aggiunta manuale.");
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

async function stampaRicevuta(){

  if(!ultimoPagamentoRegistrato){
    alert("Nessun pagamento registrato.");
    return;
  }

  const { jsPDF } = window.jspdf;

  // 🔹 Recupero atleta
  const atletaDoc = await db.collection("atleti")
    .doc(ultimoPagamentoRegistrato.atletaId)
    .get();

  if(!atletaDoc.exists) return;

  const atleta = atletaDoc.data();

  // 🔹 Recupero iscrizioni atleta
  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("atletaId","==", ultimoPagamentoRegistrato.atletaId)
    .get();

  let totalePagato = 0;
  let periodi = [];

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();
    totalePagato += iscr.pagato || 0;

    // Recupero settimana
    const settimanaDoc = await db.collection("settimane")
      .doc(iscr.settimanaId)
      .get();

    if(settimanaDoc.exists){
      const settimana = settimanaDoc.data();

      if(settimana.dataInizio && settimana.dataFine){
        periodi.push(
          `${formattaData(settimana.dataInizio)} - ${formattaData(settimana.dataFine)}`
        );
      }
    }
  }

  const periodoTesto = periodi.join("  |  ");

  // 🔹 Numero progressivo
  const configRef = db.collection("config").doc("ricevute");
  let numeroRicevuta = 1;

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(configRef);

    if(!doc.exists){
      transaction.set(configRef, { numeroProgressivo: 2 });
      numeroRicevuta = 1;
    } else {
      numeroRicevuta = doc.data().numeroProgressivo;
      transaction.update(configRef, {
        numeroProgressivo: numeroRicevuta + 1
      });
    }
  });

  // 🔹 PDF A5 orizzontale
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a5"
  });

  const anno = new Date().getFullYear();
  const dataOggi = new Date().toLocaleDateString("it-IT");

  // LOGO
  try{
    pdf.addImage("img/logo.png", "PNG", 10, 10, 40, 15);
  }catch(e){}

  pdf.setFontSize(12);
  pdf.text("A.S.D. MALUSCI CAMP", 60, 15);
  pdf.text("Via Montalbano N°98 51039 QUARRATA (PT)", 60, 20);
  pdf.text("P.IVA 01963540479", 60, 25);

  pdf.setFontSize(14);
  pdf.text(`RICEVUTA DI PAGAMENTO N° ${numeroRicevuta}   ANNO ${anno}`, 20, 40);

  pdf.setFontSize(11);

  pdf.text(`Ha versato la somma di € ${totalePagato.toFixed(2)}`, 20, 55);

  pdf.text("A titolo di: Partecipazione a Camp Estivo Malusci Camp", 20, 65);

  pdf.text(`Periodo: ${periodoTesto}`, 20, 75);

  pdf.text("Con pernottamento in Lizzano Belvedere (BO)", 20, 85);

  pdf.text(`Atleta: ${atleta.cognome} ${atleta.nome}`, 20, 95);

  pdf.text(
    `Nato/a a ${atleta.luogoNascita} il ${formattaData(atleta.dataNascita)}`,
    20,
    105
  );

  pdf.text("CF ____________________________", 20, 115);

  pdf.text(`Residente in ${atleta.indirizzo || ""}`, 20, 125);

  pdf.text(`Luogo ____________________`, 20, 140);
  pdf.text(`Data ${dataOggi}`, 100, 140);

  pdf.text("Per Associazione Sportiva Dilettantistica", 20, 155);
  pdf.text("(Timbro e Firma)", 20, 165);

  pdf.save(`Ricevuta_${atleta.cognome}_${numeroRicevuta}.pdf`);
}


// 🔹 Funzione formato data
function formattaData(dataISO){
  if(!dataISO) return "";
  const d = new Date(dataISO);
  return d.toLocaleDateString("it-IT");
}