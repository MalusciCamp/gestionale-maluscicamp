const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

fetch("components/header.html")
  .then(r => r.text())
  .then(h => document.getElementById("header").innerHTML = h);

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

let datiKit = [];
let totaliTaglie = {};
let totaliScarpe = {};

window.addEventListener("DOMContentLoaded", async () => {
  await caricaKit();
});

async function caricaKit(){

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if(settimanaDoc.exists){
    document.getElementById("titoloSettimana")
      .innerText = "Riepilogo Kit - " + settimanaDoc.data().nome;
  }

  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("settimanaId","==", settimanaID)
    .get();

  const tbody = document.getElementById("tabellaKit");
  tbody.innerHTML = "";

  let totale = 0;
  datiKit = [];
  totaliTaglie = {};
  totaliScarpe = {};

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();

    const atletaDoc = await db.collection("atleti")
      .doc(iscr.atletaId)
      .get();

    if(!atletaDoc.exists) continue;

    const atleta = atletaDoc.data();

    totale++;

    const taglia = atleta.taglia || "N/D";
    const scarpa = atleta.scarpa || "N/D";

    totaliTaglie[taglia] = (totaliTaglie[taglia] || 0) + 1;
    totaliScarpe[scarpa] = (totaliScarpe[scarpa] || 0) + 1;

    datiKit.push({
      nome: atleta.cognome + " " + atleta.nome,
      altezza: atleta.altezza || "-",
      taglia: taglia,
      scarpa: scarpa
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${atleta.cognome} ${atleta.nome}</td>
      <td>${atleta.altezza || "-"}</td>
      <td>${taglia}</td>
      <td>${scarpa}</td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById("totaleAtleti").innerText = totale;

  stampaTotali();
}

function stampaTotali(){

  const boxTaglie = document.getElementById("totaliTaglie");
  const boxScarpe = document.getElementById("totaliScarpe");

  boxTaglie.innerHTML = "";
  boxScarpe.innerHTML = "";

  Object.keys(totaliTaglie)
    .sort()
    .forEach(t=>{
      boxTaglie.innerHTML += `<div>${t}: <strong>${totaliTaglie[t]}</strong></div>`;
    });

  Object.keys(totaliScarpe)
    .sort((a,b)=>a-b)
    .forEach(s=>{
      boxScarpe.innerHTML += `<div>${s}: <strong>${totaliScarpe[s]}</strong></div>`;
    });
}

async function stampaKit(){

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  const dataOggi = new Date().toLocaleDateString("it-IT");
  const anno = new Date().getFullYear();

  // ================= HEADER UFFICIALE =================

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

  pdf.setFontSize(13);
  pdf.setFont("helvetica","bold");
  pdf.text("RIEPILOGO KIT UFFICIALE", 15, 38);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.text("Data generazione: " + dataOggi, 150, 38);

  // ================= TOTALE ATLETI =================

  pdf.setFontSize(12);
  pdf.setFont("helvetica","bold");
  pdf.text("Totale Atleti Iscritti: " + datiKit.length, 15, 50);

  // ================= RIEPILOGO TAGLIE =================

  let y = 60;

  pdf.setFontSize(11);
  pdf.setFont("helvetica","bold");
  pdf.text("Riepilogo Taglie:", 15, y);

  y += 6;
  pdf.setFont("helvetica","normal");

  Object.keys(totaliTaglie)
    .sort()
    .forEach(t=>{
      pdf.text(`${t}: ${totaliTaglie[t]}`, 20, y);
      y += 5;
    });

  // ================= RIEPILOGO SCARPE =================

  y += 4;

  pdf.setFont("helvetica","bold");
  pdf.text("Riepilogo Numeri Scarpa:", 15, y);

  y += 6;
  pdf.setFont("helvetica","normal");

  Object.keys(totaliScarpe)
    .sort((a,b)=>a-b)
    .forEach(s=>{
      pdf.text(`${s}: ${totaliScarpe[s]}`, 20, y);
      y += 5;
    });

  // ================= TABELLA ATLETI =================

  y += 8;

  pdf.setFont("helvetica","bold");
  pdf.text("Elenco Atleti:", 15, y);

  y += 6;

  pdf.setFontSize(10);
  pdf.setFont("helvetica","bold");

  pdf.text("Atleta", 15, y);
  pdf.text("Altezza", 100, y);
  pdf.text("Taglia", 130, y);
  pdf.text("Scarpa", 160, y);

  y += 4;
  pdf.line(15, y, 195, y);
  y += 6;

  pdf.setFont("helvetica","normal");

  datiKit.forEach(d=>{

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

    pdf.text(d.nome, 15, y);
    pdf.text(String(d.altezza), 100, y);
    pdf.text(String(d.taglia), 130, y);
    pdf.text(String(d.scarpa), 160, y);

    y += 6;
  });

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

  // 🔥 APRE A VIDEO INVECE DI SALVARE
  pdf.output("dataurlnewwindow");
}