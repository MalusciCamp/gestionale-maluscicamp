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

function pagamentoNelFiltro(dataPagamento, filtroData){

  if(!filtroData) return true;

  const dataPag = dataPagamento?.toDate
    ? dataPagamento.toDate()
    : new Date(dataPagamento);

  const inizio = new Date(filtroData);
  inizio.setHours(0, 0, 0, 0);

  const fine = new Date(filtroData);
  fine.setHours(23, 59, 59, 999);

  return dataPag >= inizio && dataPag <= fine;
}

async function costruisciDatiReport(filtroData = null){

  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("settimanaId", "==", settimanaID)
    .get();

  const righe = [];
  let totaleIncassare = 0;
  let totaleSconti = 0;
  let totaleIncassato = 0;
  let contanti = 0;
  let bonifico = 0;
  let carta = 0;
  let assegno = 0;

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();
    totaleIncassare += Number(iscr.quota || 0);

    const atletaDoc = await db.collection("atleti")
      .doc(iscr.atletaId)
      .get();

    if(!atletaDoc.exists) continue;

    const atleta = atletaDoc.data();

    const pagamentiSnap = await db.collection("pagamenti")
      .where("atletaId", "==", iscr.atletaId)
      .where("settimanaId", "==", settimanaID)
      .get();

    let movimenti = [];
    let totaleAtleta = 0;
    let scontoExtraAtleta = 0;
    let contantiAtleta = 0;
    let bonificoAtleta = 0;
    let cartaAtleta = 0;
    let assegnoAtleta = 0;

    pagamentiSnap.forEach(p => {

      const data = p.data();

      if(!pagamentoNelFiltro(data.data, filtroData)) return;

      const importo = Number(data.importo || 0);
      const sExtra = Number(data.scontoExtra || 0);

      totaleAtleta += importo;
      scontoExtraAtleta += sExtra;

      if(data.metodo === "Contanti") contantiAtleta += importo;
      if(data.metodo === "Bonifico") bonificoAtleta += importo;
      if(data.metodo === "Carta" || data.metodo === "Carta di Credito") cartaAtleta += importo;
      if(data.metodo === "Assegno") assegnoAtleta += importo;

      movimenti.push(
        formattaData(data.data?.toDate()) +
        " - €" + importo +
        " " + data.metodo +
        (sExtra > 0 ? " (Sconto €" + sExtra + ")" : "")
      );

    });

    if(filtroData && movimenti.length === 0) continue;

    const scontoIniziale = filtroData ? 0 : Number(iscr.sconto || 0);
    const scontoTotaleAtleta = scontoIniziale + scontoExtraAtleta;
    const quota = Number(iscr.quota || 0);
    const quotaNetta = quota - scontoTotaleAtleta;
    const residuoAtleta = filtroData
      ? null
      : quotaNetta - totaleAtleta;

    if(!filtroData){
      totaleSconti += scontoTotaleAtleta;
      totaleIncassato += totaleAtleta;
    }else{
      totaleIncassato += totaleAtleta;
      totaleSconti += scontoExtraAtleta;
    }

    contanti += contantiAtleta;
    bonifico += bonificoAtleta;
    carta += cartaAtleta;
    assegno += assegnoAtleta;

    let stato = "da_pagare";

    if(!filtroData){
      if(totaleAtleta >= quotaNetta && quotaNetta > 0){
        stato = "pagato";
      }else if(totaleAtleta > 0){
        stato = "parziale";
      }
    }else{
      stato = "pagamento";
    }

    righe.push({
      atleta: atleta.cognome + " " + atleta.nome,
      quota: quota,
      sconti: scontoTotaleAtleta,
      pagato: totaleAtleta,
      residuo: residuoAtleta,
      stato: stato,
      movimenti: movimenti
    });
  }

  return {
    righe,
    totali: {
      totaleIscritti: iscrizioniSnap.size,
      totaleIncassare: filtroData ? 0 : totaleIncassare,
      totaleSconti,
      totaleIncassato,
      contanti,
      bonifico,
      carta,
      assegno,
      totaleResiduo: filtroData
        ? 0
        : totaleIncassare - totaleSconti - totaleIncassato
    }
  };
}

async function caricaRiepilogo(){

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(!settimanaDoc.exists) return;

  document.getElementById("titoloSettimana")
    .innerText = "Riepilogo - " + settimanaDoc.data().nome;

  const { righe, totali } = await costruisciDatiReport(null);
  datiReport = righe;

  const tbody = document.getElementById("tabellaPagamenti");
  tbody.innerHTML = "";

  righe.forEach(riga => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${riga.atleta}</td>
      <td>${riga.quota} €</td>
      <td>${riga.sconti} €</td>
      <td>${riga.pagato} €</td>
      <td>${riga.residuo} €</td>
      <td>${riga.stato}</td>
      <td style="text-align:left">${riga.movimenti.join("<br>")}</td>
    `;

    tbody.appendChild(tr);

  });

  document.getElementById("totaleIncassare").innerText = totali.totaleIncassare + " €";
  document.getElementById("totaleIscritti").innerText = totali.totaleIscritti;
  document.getElementById("totaleSconti").innerText = totali.totaleSconti + " €";
  document.getElementById("totaleIncassato").innerText = totali.totaleIncassato + " €";
  document.getElementById("totaleContanti").innerText = totali.contanti + " €";
  document.getElementById("totaleBonifico").innerText = totali.bonifico + " €";
  document.getElementById("totaleCarta").innerText = totali.carta + " €";
  document.getElementById("totaleAssegno").innerText = totali.assegno + " €";
  document.getElementById("totaleResiduo").innerText = totali.totaleResiduo + " €";
}

// ================= PDF REPORT =================

// ================= PDF REPORT =================

async function stampaReportPagamenti(){

  const { righe, totali } = await costruisciDatiReport(filtroDataAttivo);
  datiReport = righe;

  if(datiReport.length === 0){
    alert("Nessun dato da stampare");
    return;
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
pdf.text("Totale iscritti: " + totali.totaleIscritti, 15 + pdf.getTextWidth(titoloReport) + 5, 38);
pdf.setFont("helvetica","bold");

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.text("Settimana: " + nomeSettimana, 15, 45);
  pdf.text("Data generazione: " + dataOggi, 150, 45);

  // ================= TOTALI =================

  const totaleQuote = totali.totaleIncassare;
  const totaleSconti = totali.totaleSconti;
  const totalePagato = totali.totaleIncassato;
  const contanti = totali.contanti;
  const bonifico = totali.bonifico;
  const carta = totali.carta;
  const assegno = totali.assegno;
  const residuo = totali.totaleResiduo;

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(10);

  pdf.text("Totale Quote: € " + totaleQuote.toFixed(2), 15, 55);
  pdf.text("Totale Sconti: € " + totaleSconti.toFixed(2), 15, 60);
  pdf.text("Totale Incassato: € " + totalePagato.toFixed(2), 15, 65);
  pdf.text("Residuo: € " + residuo.toFixed(2), 15, 70);

  pdf.text("Contanti: € " + contanti.toFixed(2), 100, 55);
  pdf.text("Bonifico: € " + bonifico.toFixed(2), 100, 60);
  pdf.text("Carta: € " + carta.toFixed(2), 100, 65);
  pdf.text("Assegno: € " + assegno.toFixed(2), 100, 70);

  pdf.line(15, 78, 195, 78);

  // ================= TABELLA =================

  let y = 86;

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

  const { righe, totali } = await costruisciDatiReport(filtroDataAttivo);
  datiReport = righe;

  const tbody = document.getElementById("tabellaPagamenti");
  tbody.innerHTML = "";

  righe.forEach(riga => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${riga.atleta}</td>
      <td>${riga.quota} €</td>
      <td>${riga.sconti} €</td>
      <td>${riga.pagato} €</td>
      <td>-</td>
      <td>${riga.stato}</td>
      <td style="text-align:left">${riga.movimenti.join("<br>")}</td>
    `;

    tbody.appendChild(tr);

  });

  document.getElementById("totaleIncassato").innerText = totali.totaleIncassato + " €";
  document.getElementById("totaleIscritti").innerText = totali.totaleIscritti;
  document.getElementById("totaleContanti").innerText = totali.contanti + " €";
  document.getElementById("totaleBonifico").innerText = totali.bonifico + " €";
  document.getElementById("totaleCarta").innerText = totali.carta + " €";
  document.getElementById("totaleAssegno").innerText = totali.assegno + " €";
}

function resetFiltro(){
  filtroDataAttivo = null;
  document.getElementById("filtroData").value = "";
  caricaRiepilogo();
}