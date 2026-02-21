// Firebase Config
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

// HEADER
fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);

// GET SETTIMANA ID
const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

const tbody = document.getElementById("listaIscritti");

// Carica nome settimana
db.collection("settimane").doc(settimanaID).get()
.then(doc=>{
  if(doc.exists){
    document.getElementById("titoloSettimana").textContent =
      "Iscritti - " + doc.data().nome;
  }
});

// Carica iscritti
function caricaIscritti(){

  tbody.innerHTML="";

  db.collection("iscrizioni")
  .where("settimanaId","==", settimanaID)
  .get()
  .then(snapshot=>{

    snapshot.forEach(async docIscr=>{

      const iscrizione = docIscr.data();
      const atletaId = iscrizione.atletaId;

      const atletaDoc = await db.collection("atleti").doc(atletaId).get();
      const atleta = atletaDoc.data();

      const tr = document.createElement("tr");

      const statoClass = "stato-" + iscrizione.statoPagamento;

      tr.innerHTML = `
        <td>${atleta.cognome} ${atleta.nome}</td>
        <td>${atleta.documenti?.certMedico ? "SI" : "NO"}</td>
        <td>${atleta.documenti?.tesseraSanitariaNumero || "-"}</td>
        <td>${atleta.documenti?.documentoIdentitaNumero || "-"}</td>
        <td class="${statoClass}">${iscrizione.statoPagamento}</td>
        <td>
          <button onclick="apriPagamento('${atletaId}')">
            <i class="fa-solid fa-euro-sign"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);

    });

  });
}

caricaIscritti();

// Placeholder popup pagamento
function apriPagamento(atletaId){
  alert("Qui apriremo il popup pagamento con distribuzione automatica.");
}

// Placeholder aggiunta iscrizione
function apriPopupAggiungi(){
  alert("Qui faremo popup ricerca cognome con autocomplete.");
}