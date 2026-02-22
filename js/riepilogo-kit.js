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

  pdf.setFontSize(16);
  pdf.text("RIEPILOGO KIT", 15, 15);

  pdf.setFontSize(11);
  pdf.text("Totale Atleti: " + datiKit.length, 15, 25);

  let y = 35;

  pdf.setFont("helvetica","bold");
  pdf.text("Nome", 15, y);
  pdf.text("Taglia", 90, y);
  pdf.text("Scarpa", 120, y);

  y += 5;
  pdf.setFont("helvetica","normal");

  datiKit.forEach(d=>{
    if(y > 280){
      pdf.addPage();
      y = 20;
    }

    pdf.text(d.nome, 15, y);
    pdf.text(String(d.taglia), 90, y);
    pdf.text(String(d.scarpa), 120, y);

    y += 6;
  });

  pdf.save("Riepilogo_Kit.pdf");
}