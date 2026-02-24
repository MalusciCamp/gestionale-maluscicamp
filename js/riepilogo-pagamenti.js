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

  datiReport = [];

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(!settimanaDoc.exists) return;

  const settimana = settimanaDoc.data();
  const dataInizio = new Date(settimana.dal);
  const dataFine = new Date(settimana.al);

  document.getElementById("titoloSettimana")
    .innerText = "Riepilogo - " + settimana.nome;

  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("settimanaId","==", settimanaID)
    .get();

  let totaleIncassare = 0;
  let totaleSconti = 0;

  let contantiPre = 0;
  let contantiDurante = 0;
  let bonificoPre = 0;
  let bonificoDurante = 0;
  let cartaPre = 0;
  let cartaDurante = 0;

  const tbody = document.getElementById("tabellaPagamenti");
  tbody.innerHTML = "";

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();
    const quota = Number(iscr.quota || 0);
    totaleIncassare += quota;

    let scontoIniziale = Number(iscr.scontoIniziale || 0);

    const atletaDoc = await db.collection("atleti")
      .doc(iscr.atletaId)
      .get();

    if(!atletaDoc.exists) continue;

    const atleta = atletaDoc.data();

    const pagamentiSnap = await db.collection("pagamenti")
      .where("atletaId","==", iscr.atletaId)
      .where("settimanaId","==", settimanaID)
      .get();

    let totalePagato = 0;
    let scontoExtra = 0;
    let movimenti = [];

    pagamentiSnap.forEach(p => {

      const data = p.data();
      const importo = Number(data.importo || 0);
      const sExtra = Number(data.scontoExtra || 0);

      totalePagato += importo;
      scontoExtra += sExtra;

      const dataPagamento = data.data?.toDate();
      if(!dataPagamento) return;

      // Divisione temporale
      if(data.metodo === "Contanti"){
        if(dataPagamento < dataInizio){
          contantiPre += importo;
        }else{
          contantiDurante += importo;
        }
      }

      if(data.metodo === "Bonifico"){
        if(dataPagamento < dataInizio){
          bonificoPre += importo;
        }else{
          bonificoDurante += importo;
        }
      }

      if(data.metodo === "Carta"){
        if(dataPagamento < dataInizio){
          cartaPre += importo;
        }else{
          cartaDurante += importo;
        }
      }

      movimenti.push(
        formattaData(dataPagamento) +
        " - €" + importo +
        " " + data.metodo +
        (sExtra > 0 ? " (Sconto €" + sExtra + ")" : "")
      );

    });

    const scontoTotaleAtleta = scontoIniziale + scontoExtra;
    totaleSconti += scontoTotaleAtleta;

    const quotaNetta = quota - scontoTotaleAtleta;

    let stato = "da_pagare";
    if(totalePagato >= quotaNetta && quotaNetta > 0){
      stato = "pagato";
    }else if(totalePagato > 0){
      stato = "parziale";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${atleta.cognome} ${atleta.nome}</td>
      <td>${quota} €</td>
      <td>${scontoTotaleAtleta} €</td>
      <td>${totalePagato} €</td>
      <td>${quotaNetta - totalePagato} €</td>
      <td>${stato}</td>
      <td style="text-align:left">${movimenti.join("<br>")}</td>
    `;
    tbody.appendChild(tr);

    datiReport.push({
      atleta: atleta.cognome + " " + atleta.nome,
      quota: quota,
      sconti: scontoTotaleAtleta,
      pagato: totalePagato,
      residuo: quotaNetta - totalePagato,
      stato: stato,
      movimenti: movimenti
    });
  }

  const totaleMovimenti =
    contantiPre + contantiDurante +
    bonificoPre + bonificoDurante +
    cartaPre + cartaDurante;

  const residuoFinale =
    totaleIncassare - totaleSconti - totaleMovimenti;

  // BOX TOTALI
  document.getElementById("totaleIncassare").innerText = totaleIncassare + " €";
  document.getElementById("totaleSconti").innerText = totaleSconti + " €";

  document.getElementById("contantiPre").innerText = contantiPre + " €";
  document.getElementById("contantiDurante").innerText = contantiDurante + " €";

  document.getElementById("bonificoPre").innerText = bonificoPre + " €";
  document.getElementById("bonificoDurante").innerText = bonificoDurante + " €";

  document.getElementById("cartaPre").innerText = cartaPre + " €";
  document.getElementById("cartaDurante").innerText = cartaDurante + " €";

  document.getElementById("totaleResiduo").innerText = residuoFinale + " €";
}


// ================= PDF =================

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

  pdf.setFontSize(14);
  pdf.text("RIEPILOGO PAGAMENTI - " + nomeSettimana, 15, 20);

  let y = 30;

  let totaleQuota = 0;
  let totaleSconti = 0;
  let totalePagato = 0;

  datiReport.forEach(d=>{
    totaleQuota += d.quota;
    totaleSconti += d.sconti;
    totalePagato += d.pagato;
  });

  const residuo = totaleQuota - totaleSconti - totalePagato;

  pdf.setFontSize(10);
  pdf.text("Totale Quote: € " + totaleQuota.toFixed(2), 15, y); y+=5;
  pdf.text("Totale Sconti: € " + totaleSconti.toFixed(2), 15, y); y+=5;
  pdf.text("Totale Incassato: € " + totalePagato.toFixed(2), 15, y); y+=5;
  pdf.text("Residuo: € " + residuo.toFixed(2), 15, y); y+=10;

  pdf.line(15, y, 195, y);
  y+=5;

  for(const d of datiReport){

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

    pdf.text(d.atleta, 15, y);
    pdf.text("Quota: " + d.quota + " €", 70, y);
    pdf.text("Sconti: " + d.sconti + " €", 110, y);
    pdf.text("Pagato: " + d.pagato + " €", 150, y);
    y+=5;

    d.movimenti.forEach(m=>{
      pdf.text("- " + m, 20, y);
      y+=4;
    });

    y+=4;
  }

  pdf.save("Riepilogo_Pagamenti_" + nomeSettimana + ".pdf");
}

// ================= UTILITY =================

function formattaData(d){
  if(!d) return "";
  return new Date(d).toLocaleDateString("it-IT");
}