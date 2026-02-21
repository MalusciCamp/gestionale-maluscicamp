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

            <td>
              <span class="cert-toggle ${atleta.documenti?.certMedico ? "green" : "red"}">
                ${atleta.documenti?.certMedico ? "SI" : "NO"}
              </span>
            </td>

            <td>
              <span class="cert-toggle ${atleta.documenti?.tesseraSanitaria ? "green" : "red"}">
                ${atleta.documenti?.tesseraSanitaria ? "SI" : "NO"}
              </span>
            </td>

            <td>
              <span class="cert-toggle ${atleta.documenti?.documentoIdentita ? "green" : "red"}">
                ${atleta.documenti?.documentoIdentita ? "SI" : "NO"}
              </span>
            </td>

            <td class="stato-${iscrizione.statoPagamento}">
              ${iscrizione.statoPagamento}
            </td>

            <td class="azioni-box">
              <button onclick="salvaDocumentiRiga('${atletaId}', this)">
                💾
              </button>

              <button onclick="apriPagamento('${atletaId}')">
                💰
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

function toggleCert(el){

  if(el.innerText === "SI"){
    el.innerText = "NO";
    el.classList.remove("green");
    el.classList.add("red");
  }else{
    el.innerText = "SI";
    el.classList.remove("red");
    el.classList.add("green");
  }

}

async function salvaDocumentiRiga(atletaId, btn){

  const tr = btn.closest("tr");

  const cert = tr.querySelector(".cert-toggle").innerText === "SI";

  const tessera = tr.querySelector(`.tessera-${atletaId}`).value;
  const documento = tr.querySelector(`.documento-${atletaId}`).value;

  await db.collection("atleti")
    .doc(atletaId)
    .update({
      documenti:{
        certMedico: cert,
        tesseraSanitariaNumero: tessera,
        documentoIdentitaNumero: documento
      }
    });

  btn.innerText = "✔";
  setTimeout(()=>{
    btn.innerText = "💾";
  },1000);
}

let atletaPagamentoInCorso = null;
let iscrizioniAtletaCache = [];

async function apriPagamento(atletaId){

  atletaPagamentoInCorso = atletaId;

  const snapshot = await db.collection("iscrizioni")
    .where("atletaId","==", atletaId)
    .get();

  let totale = 0;
  let pagato = 0;

  iscrizioniAtletaCache = [];

  snapshot.forEach(doc=>{
    const data = doc.data();
    totale += data.quota;
    pagato += data.pagato || 0;

    iscrizioniAtletaCache.push({
      id: doc.id,
      quota: data.quota,
      pagato: data.pagato || 0
    });
  });

  totaleDovuto.innerText = totale;
  totalePagato.innerText = pagato;
  residuoPagamento.innerText = totale - pagato;

  importoPagamento.value = "";
  metodoPagamento.value = "";

  document.getElementById("popupPagamento").style.display = "flex";
}

function chiudiPopupPagamento(){
  document.getElementById("popupPagamento").style.display = "none";
}

async function registraPagamento(){

  const importo = Number(importoPagamento.value);
  const metodo = metodoPagamento.value;

  if(!importo || importo <= 0){
    alert("Inserisci importo valido");
    return;
  }

  if(!metodo){
    alert("Seleziona metodo pagamento");
    return;
  }

  // 1️⃣ CREA MOVIMENTO PAGAMENTO
  await db.collection("pagamenti").add({
    atletaId: atletaPagamentoInCorso,
    importo: importo,
    metodo: metodo,
    data: firebase.firestore.FieldValue.serverTimestamp(),
    anno: new Date().getFullYear()
  });

  // 2️⃣ DISTRIBUZIONE AUTOMATICA
  let residuo = importo;

  for(let iscrizione of iscrizioniAtletaCache){

    if(residuo <= 0) break;

    const daPagare = iscrizione.quota - iscrizione.pagato;

    if(daPagare <= 0) continue;

    if(residuo >= daPagare){

      await db.collection("iscrizioni")
        .doc(iscrizione.id)
        .update({
          pagato: iscrizione.quota,
          statoPagamento: "pagato"
        });

      residuo -= daPagare;

    }else{

      await db.collection("iscrizioni")
        .doc(iscrizione.id)
        .update({
          pagato: iscrizione.pagato + residuo,
          statoPagamento: "parziale"
        });

      residuo = 0;
    }
  }

  chiudiPopupPagamento();
  caricaIscritti();
}