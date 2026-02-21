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


// ================= CARICA ISCRITTI =================

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
            <td>${atleta.documenti?.certMedico ? "SI" : "NO"}</td>
            <td>${atleta.documenti?.tesseraSanitariaNumero || "-"}</td>
            <td>${atleta.documenti?.documentoIdentitaNumero || "-"}</td>
            <td class="stato-${iscrizione.statoPagamento}">
              ${iscrizione.statoPagamento}
            </td>
            <td>
              <button onclick="apriPagamento('${atletaId}')">
                <i class="fa-solid fa-euro-sign"></i>
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