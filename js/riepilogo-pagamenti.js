let filtroDataAttivo = null;

// ================= FIREBASE =================



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

  totaleAtleta += importo;
  scontoExtraAtleta += sExtra;

  // Totali globali per metodo
  if(data.metodo === "Contanti") contanti += importo;
  if(data.metodo === "Bonifico") bonifico += importo;
  if(data.metodo === "Carta") carta += importo;

  movimenti.push(
    formattaData(data.data?.toDate()) +
    " - €" + importo +
    " " + data.metodo +
    (sExtra > 0 ? " (Sconto €" + sExtra + ")" : "")
  );

});

// 🔥 CORRETTO: campo giusto
const scontoIniziale = Number(iscr.sconto || 0);

// 🔥 Calcolo totale sconti atleta
const scontoTotaleAtleta = scontoIniziale + scontoExtraAtleta;

// 🔥 Aggiorno totale generale sconti UNA SOLA VOLTA
totaleSconti += scontoTotaleAtleta;

const quotaNetta = Number(iscr.quota || 0) - scontoTotaleAtleta;
const residuoAtleta = quotaNetta - totaleAtleta;

// 🔹 Totale incassato globale
totaleIncassato += totaleAtleta;

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

// ================= PDF REPORT =================

async function stampaReportPagamenti(){

  datiReport = [];
  let pagamentiSnap;

if(filtroDataAttivo){

  const inizio = new Date(filtroDataAttivo);
  inizio.setHours(0,0,0,0);

  const fine = new Date(filtroDataAttivo);
  fine.setHours(23,59,59,999);

  pagamentiSnap = await db.collection("pagamenti")
    .where("settimanaId","==", settimanaID)
    .where("data", ">=", inizio)
    .where("data", "<=", fine)
    .get();

}else{

  pagamentiSnap = await db.collection("pagamenti")
    .where("settimanaId","==", settimanaID)
    .get();
}

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  const nomeSettimana = settimanaDoc.exists
    ? settimanaDoc.data().nome
    : "";

  const dataOggi = new Date().toLocaleDateString("it-IT");

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

  pdf.line(15, 30, 195, 30);

  pdf.setFontSize(12);
pdf.setFont("helvetica","bold");

let titoloReport = "RIEPILOGO PAGAMENTI";

if(filtroDataAttivo){
  const dataFormattata = new Date(filtroDataAttivo)
    .toLocaleDateString("it-IT");
  titoloReport = `RIEPILOGO PAGAMENTI GIORNO ${dataFormattata}`;
}

pdf.text(titoloReport, 15, 38);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.text("Settimana: " + nomeSettimana, 15, 45);
  pdf.text("Data generazione: " + dataOggi, 150, 45);

  // ================= TOTALI =================

  let totaleQuote = 0;
  let totaleSconti = 0;
  let totalePagato = 0;
  let contanti = 0;
  let bonifico = 0;
  let carta = 0;

  datiReport.forEach(d=>{
    totaleQuote += d.quota;
    totaleSconti += d.sconti || 0;
    totalePagato += d.pagato;

    d.movimenti.forEach(m=>{
      if(m.includes("Contanti")) contanti += parseFloat(m.split("€")[1]);
      if(m.includes("Bonifico")) bonifico += parseFloat(m.split("€")[1]);
      if(m.includes("Carta")) carta += parseFloat(m.split("€")[1]);
    });
  });

  const residuo = totaleQuote - totaleSconti - totalePagato;

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(10);

  pdf.text("Totale Quote: € " + totaleQuote.toFixed(2), 15, 55);
  pdf.text("Totale Sconti: € " + totaleSconti.toFixed(2), 15, 60);
  pdf.text("Totale Incassato: € " + totalePagato.toFixed(2), 15, 65);
  pdf.text("Residuo: € " + residuo.toFixed(2), 15, 70);

  pdf.text("Contanti: € " + contanti.toFixed(2), 100, 55);
  pdf.text("Bonifico: € " + bonifico.toFixed(2), 100, 60);
  pdf.text("Carta: € " + carta.toFixed(2), 100, 65);

  pdf.line(15, 75, 195, 75);

  // ================= TABELLA =================

  let y = 83;

  pdf.setFont("helvetica","bold");
  pdf.text("Atleta", 15, y);
  pdf.text("Quota", 80, y);
  pdf.text("Sconti", 100, y);
  pdf.text("Pagato", 120, y);
  pdf.text("Movimenti", 140, y);

  y += 5;
  pdf.line(15, y, 195, y);
  y += 6;

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(9);

  for(const d of datiReport){

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica","bold");
    pdf.text(d.atleta, 15, y);

    pdf.setFont("helvetica","normal");
    pdf.text(d.quota + " €", 80, y);
    pdf.text((d.sconti || 0) + " €", 100, y);
    pdf.text(d.pagato + " €", 120, y);

    let movY = y;

    d.movimenti.forEach(m=>{
      pdf.text("- " + m, 140, movY);
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

async function filtraPerData(){

  const dataInput = document.getElementById("filtroData").value;
  if(!dataInput) return;

  filtroDataAttivo = dataInput;

  const inizio = new Date(dataInput);
  inizio.setHours(0,0,0,0);

  const fine = new Date(dataInput);
  fine.setHours(23,59,59,999);

  const pagamentiSnap = await db.collection("pagamenti")
    .where("settimanaId","==", settimanaID)
    .where("data", ">=", inizio)
    .where("data", "<=", fine)
    .get();

  const tbody = document.getElementById("tabellaPagamenti");
  tbody.innerHTML = "";   // 🔥 SVUOTA TABELLA

  let totale = 0;
  let contanti = 0;
  let bonifico = 0;
  let carta = 0;

  for(const doc of pagamentiSnap.docs){

    const p = doc.data();
    const importo = Number(p.importo || 0);

    totale += importo;

    if(p.metodo === "Contanti") contanti += importo;
    if(p.metodo === "Bonifico") bonifico += importo;
    if(p.metodo === "Carta") carta += importo;

    // 🔹 Recupero atleta
    const atletaDoc = await db.collection("atleti")
      .doc(p.atletaId)
      .get();

    const atleta = atletaDoc.data();

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${atleta.cognome} ${atleta.nome}</td>
      <td>-</td>
      <td>${p.scontoExtra || 0} €</td>
      <td>${importo} €</td>
      <td>-</td>
      <td>pagamento</td>
      <td>${formattaData(p.data?.toDate())} - €${importo} ${p.metodo}</td>
    `;

    tbody.appendChild(tr);
  }

  // 🔹 Aggiorno box
  document.getElementById("totaleIncassato").innerText = totale + " €";
  document.getElementById("totaleContanti").innerText = contanti + " €";
  document.getElementById("totaleBonifico").innerText = bonifico + " €";
  document.getElementById("totaleCarta").innerText = carta + " €";
}

function resetFiltro(){
  filtroDataAttivo = null;
  document.getElementById("filtroData").value = "";
  caricaRiepilogo();
}