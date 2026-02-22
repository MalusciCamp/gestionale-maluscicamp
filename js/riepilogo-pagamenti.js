// ================= FIREBASE =================

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

fetch("components/header.html")
  .then(r => r.text())
  .then(h => document.getElementById("header").innerHTML = h);

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

let datiReport = [];

// ================= CARICAMENTO =================

window.addEventListener("DOMContentLoaded", async () => {
  await caricaRiepilogo();
});

async function caricaRiepilogo(){

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(!settimanaDoc.exists) return;

  document.getElementById("titoloSettimana")
    .innerText = "Riepilogo - " + settimanaDoc.data().nome;

  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("settimanaId","==", settimanaID)
    .get();

  let totaleIncassare = 0;
  let totaleIncassato = 0;

  let contanti = 0;
  let bonifico = 0;
  let carta = 0;

  const tbody = document.getElementById("tabellaPagamenti");
  tbody.innerHTML = "";

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();
    totaleIncassare += iscr.quota || 0;
    totaleIncassato += iscr.pagato || 0;

    const atletaDoc = await db.collection("atleti")
      .doc(iscr.atletaId)
      .get();

    if(!atletaDoc.exists) continue;

    const atleta = atletaDoc.data();

    const pagamentiSnap = await db.collection("pagamenti")
      .where("atletaId","==", iscr.atletaId)
      .get();

    let movimenti = [];
    let totaleAtleta = 0;

    pagamentiSnap.forEach(p => {

      const data = p.data();

      totaleAtleta += data.importo;

      if(data.metodo === "Contanti") contanti += data.importo;
      if(data.metodo === "Bonifico") bonifico += data.importo;
      if(data.metodo === "Carta") carta += data.importo;

      movimenti.push(
        formattaData(data.data?.toDate()) +
        " - €" + data.importo +
        " " + data.metodo
      );

    });

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${atleta.cognome} ${atleta.nome}</td>
      <td>${iscr.quota} €</td>
      <td>${totaleAtleta} €</td>
      <td>${iscr.statoPagamento}</td>
      <td style="text-align:left">${movimenti.join("<br>")}</td>
    `;

    tbody.appendChild(tr);

    datiReport.push({
      atleta: atleta.cognome + " " + atleta.nome,
      quota: iscr.quota,
      pagato: totaleAtleta,
      stato: iscr.statoPagamento,
      movimenti: movimenti
    });
  }

  document.getElementById("totaleIncassare").innerText = totaleIncassare + " €";
  document.getElementById("totaleIncassato").innerText = totaleIncassato + " €";
  document.getElementById("totaleContanti").innerText = contanti + " €";
  document.getElementById("totaleBonifico").innerText = bonifico + " €";
  document.getElementById("totaleCarta").innerText = carta + " €";
  document.getElementById("totaleResiduo").innerText =
    (totaleIncassare - totaleIncassato) + " €";
}

// ================= PDF REPORT =================

async function stampaReportPagamenti(){

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  pdf.setFontSize(16);
  pdf.text("RIEPILOGO PAGAMENTI SETTIMANA", 20, 20);

  pdf.setFontSize(10);

  let y = 30;

  pdf.text("Atleta", 20, y);
  pdf.text("Quota", 80, y);
  pdf.text("Pagato", 105, y);
  pdf.text("Stato", 130, y);
  pdf.text("Movimenti", 155, y);

  y += 5;
  pdf.line(20, y, 190, y);
  y += 5;

  datiReport.forEach(d => {

    pdf.text(d.atleta, 20, y);
    pdf.text(d.quota + " €", 80, y);
    pdf.text(d.pagato + " €", 105, y);
    pdf.text(d.stato, 130, y);

    let movY = y;

    d.movimenti.forEach(m => {
      pdf.text(m, 155, movY);
      movY += 4;
    });

    y = movY + 3;

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

  });

  pdf.save("Report_Pagamenti.pdf");
}

// ================= UTILITY =================

function formattaData(d){
  if(!d) return "";
  return new Date(d).toLocaleDateString("it-IT");
}