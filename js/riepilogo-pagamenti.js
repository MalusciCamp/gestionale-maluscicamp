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

  let totaleSconti = 0;



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

  // 🔹 Totale da incassare
  totaleIncassare += Number(iscr.quota || 0);
  totaleSconti += Number(iscr.scontoIniziale || 0);

  // 🔹 Recupero atleta
  const atletaDoc = await db.collection("atleti")
    .doc(iscr.atletaId)
    .get();

  if(!atletaDoc.exists) continue;

  const atleta = atletaDoc.data();

  // 🔹 Recupero pagamenti REALI
  const pagamentiSnap = await db.collection("pagamenti")
    .where("atletaId","==", iscr.atletaId)
    .where("settimanaId","==", settimanaID)
    .get();

  let movimenti = [];
  let totaleAtleta = 0;
  let scontoExtraAtleta = 0;

  pagamentiSnap.forEach(p => {

    const data = p.data();
    const importo = Number(data.importo || 0);
    const sExtra = Number(data.scontoExtra || 0);
totaleSconti += sExtra;
scontoExtraAtleta += sExtra;

    totaleAtleta += importo;

    // Totali globali per metodo
    if(data.metodo === "Contanti") contanti += importo;
    if(data.metodo === "Bonifico") bonifico += importo;
    if(data.metodo === "Carta") carta += importo;

    movimenti.push(
      formattaData(data.data?.toDate()) +
      " - €" + importo +
      " " + data.metodo
    );

  });

  // 🔥 Totale incassato globale
  totaleIncassato += totaleAtleta;
  const scontoIniziale = Number(iscr.scontoIniziale || 0);
const scontoTotaleAtleta = scontoIniziale + scontoExtraAtleta;

const quotaNetta = Number(iscr.quota || 0) - scontoTotaleAtleta;
const residuoAtleta = quotaNetta - totaleAtleta;

  // 🔹 Calcolo stato dinamico
  let stato = "da_pagare";

  if(totaleAtleta >= quotaNetta && quotaNetta > 0){
    stato = "pagato";
  }else if(totaleAtleta > 0){
    stato = "parziale";
  }

  // 🔹 Creazione riga tabella
  const tr = document.createElement("tr");

 tr.innerHTML = `
  <td>${atleta.cognome} ${atleta.nome}</td>
  <td>${Number(iscr.quota || 0)} €</td>
  <td>${scontoTotaleAtleta} €</td>
  <td>${totaleAtleta} €</td>
  <td>${residuoAtleta} €</td>
  <td>${stato}</td>
  <td style="text-align:left">${movimenti.join("<br>")}</td>
`;
  tbody.appendChild(tr);

  // 🔹 Salvataggio per PDF
 datiReport.push({
  atleta: atleta.cognome + " " + atleta.nome,
  quota: Number(iscr.quota || 0),
  sconti: scontoTotaleAtleta,
  pagato: totaleAtleta,
  residuo: residuoAtleta,
  stato: stato,
  movimenti: movimenti
});

}

  document.getElementById("totaleIncassare").innerText = totaleIncassare + " €";
  document.getElementById("totaleSconti").innerText = totaleSconti + " €";
  document.getElementById("totaleIncassato").innerText = totaleIncassato + " €";
  document.getElementById("totaleContanti").innerText = contanti + " €";
  document.getElementById("totaleBonifico").innerText = bonifico + " €";
  document.getElementById("totaleCarta").innerText = carta + " €";
document.getElementById("totaleResiduo").innerText =
  (totaleIncassare - totaleSconti - totaleIncassato) + " €";
}

// ================= PDF REPORT =================

async function stampaReportPagamenti(){

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  const nomeSettimana = settimanaDoc.exists
    ? settimanaDoc.data().nome
    : "";

  const dataOggi = new Date().toLocaleDateString("it-IT");
  const anno = new Date().getFullYear();

  // ================= HEADER =================

  try{
    pdf.addImage("img/logo.png", "PNG", 15, 10, 30, 12);
  }catch(e){}

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(14);
  pdf.text("A.S.D. MALUSCI CAMP", 55, 15);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(9);
  pdf.text("Via Montalbano N°98 - 51039 Quarrata (PT)", 55, 20);
  pdf.text("P.IVA 01963540479", 55, 24);

  pdf.setDrawColor(0);
  pdf.line(15, 30, 195, 30);

  pdf.setFontSize(12);
  pdf.setFont("helvetica","bold");
  pdf.text("RIEPILOGO PAGAMENTI", 15, 38);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.text("Settimana: " + nomeSettimana, 15, 45);
  pdf.text("Data generazione: " + dataOggi, 150, 45);

  // ================= TOTALI =================

  let totaleIncassare = 0;
  let totaleIncassato = 0;
  let totaleSconti = 0;
  let contanti = 0;
  let bonifico = 0;
  let carta = 0;

  datiReport.forEach(d=>{
    totaleIncassare += d.quota;
totaleSconti += d.sconti || 0;
totaleIncassato += d.pagato;

    d.movimenti.forEach(m=>{
      if(m.includes("Contanti")) contanti += parseFloat(m.split("€")[1]);
      if(m.includes("Bonifico")) bonifico += parseFloat(m.split("€")[1]);
      if(m.includes("Carta")) carta += parseFloat(m.split("€")[1]);
    });
  });

  const residuo = totaleIncassare - totaleSconti - totaleIncassato;

  pdf.setFontSize(10);
  pdf.setFont("helvetica","bold");

  pdf.text("Totale da incassare: € " + totaleIncassare.toFixed(2), 15, 55);
  pdf.text("Totale sconti: € " + totaleSconti.toFixed(2), 15, 60);
  pdf.text("Totale incassato: € " + totaleIncassato.toFixed(2), 15, 60);
  pdf.text("Contanti: € " + contanti.toFixed(2), 100, 55);
  pdf.text("Bonifico: € " + bonifico.toFixed(2), 100, 60);
  pdf.text("Carta: € " + carta.toFixed(2), 100, 65);
  pdf.text("Rimanenza: € " + residuo.toFixed(2), 15, 65);

  pdf.line(15, 70, 195, 70);

  // ================= TABELLA =================

  let y = 78;

  pdf.setFont("helvetica","bold");
  pdf.text("Atleta", 15, y);
  pdf.text("Quota", 70, y);
  pdf.text("Sconti", 85, y);
  pdf.text("Pagato", 90, y);
  pdf.text("Stato", 110, y);
  pdf.text("Movimenti", 130, y);

  y += 5;
  pdf.line(15, y, 195, y);
  y += 5;

  pdf.setFont("helvetica","normal");

  for(const d of datiReport){

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

    pdf.text(d.atleta, 15, y);
    pdf.text(d.quota + " €", 70, y);
pdf.text((d.sconti || 0) + " €", 85, y);
pdf.text(d.pagato + " €", 105, y);

    // Stato colorato
    if(d.stato === "pagato"){
      pdf.setTextColor(0,150,0);
    } else if(d.stato === "parziale"){
      pdf.setTextColor(255,140,0);
    } else {
      pdf.setTextColor(200,0,0);
    }

    pdf.text(d.stato, 110, y);
    pdf.setTextColor(0,0,0);

    let movY = y;

    d.movimenti.forEach(m=>{
      pdf.text(m, 130, movY);
      movY += 4;
    });

    y = movY + 4;
  }

  // ================= FOOTER =================

  const pageCount = pdf.internal.getNumberOfPages();

  for(let i=1;i<=pageCount;i++){
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(
      "Documento generato il " + dataOggi + " - Pagina " + i + "/" + pageCount,
      15,
      290
    );
  }

  pdf.save("Riepilogo_Pagamenti_" + nomeSettimana + ".pdf");
}
// ================= UTILITY =================

function formattaData(d){
  if(!d) return "";
  return new Date(d).toLocaleDateString("it-IT");
}