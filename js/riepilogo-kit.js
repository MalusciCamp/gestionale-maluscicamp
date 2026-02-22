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

// ================= HEADER =================

fetch("components/header.html")
  .then(r => r.text())
  .then(h => document.getElementById("header").innerHTML = h);

// ================= PARAMETRI =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

// ================= CARICA DATI =================

window.addEventListener("DOMContentLoaded", async () => {

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

  for(const doc of iscrizioniSnap.docs){

    const iscr = doc.data();

    const atletaDoc = await db.collection("atleti")
      .doc(iscr.atletaId)
      .get();

    if(!atletaDoc.exists) continue;

    const atleta = atletaDoc.data();

    totale++;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${atleta.cognome} ${atleta.nome}</td>
      <td>${atleta.altezza || "-"}</td>
      <td>${atleta.taglia || "-"}</td>
      <td>${atleta.scarpa || "-"}</td>
    `;

    tbody.appendChild(tr);
  }

  document.getElementById("totaleAtleti").innerText = totale;

});