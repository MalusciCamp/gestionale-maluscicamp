// ================= FIREBASE INIT SICURO =================

if (!firebase.apps.length) {

  const firebaseConfig = {
    apiKey: "AIzaSyDVomjMP2gDUy_mEIe-tnVf4hEdF7GFvws",
    authDomain: "gestionale-maluscicamp.firebaseapp.com",
    projectId: "gestionale-maluscicamp",
    storageBucket: "gestionale-maluscicamp.appspot.com",
    messagingSenderId: "615282026849",
    appId: "1:615282026849:web:bf46adfca227570d7d7d20"
  };

  firebase.initializeApp(firebaseConfig);

}

const db = firebase.firestore();


// ================= PARAMETRI =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if (!settimanaID) {
  alert("Settimana non trovata");
}


// ================= VARIABILI GLOBALI =================

let camere = [];
let tutteIscritte = [];
let cameraSelezionata = null;

// ================= AVVIO =================

window.addEventListener("DOMContentLoaded", async () => {

  await caricaTitolo();
  await caricaIscritte();
  await caricaCamereSalvate();
  renderizza();

});

// ================= CARICAMENTI =================

async function caricaTitolo() {

  const doc = await db.collection("settimane").doc(settimanaID).get();

  if (doc.exists) {
    document.getElementById("titoloPagina").innerText =
      "Composizione Camere - " + doc.data().nome;
  }

}

async function caricaIscritte() {

  const snap = await db.collection("iscrizioni")
    .where("settimanaId", "==", settimanaID)
    .get();

  tutteIscritte = [];

  for (const docIscr of snap.docs) {

    const atletaId = docIscr.data().atletaId;

    const atletaDoc = await db.collection("atleti")
      .doc(atletaId)
      .get();

    if (atletaDoc.exists) {

      tutteIscritte.push({
        id: atletaId,
        ...atletaDoc.data()
      });

    }
  }

  // Ordine alfabetico
  tutteIscritte.sort((a, b) =>
    (a.cognome || "").localeCompare(b.cognome || "")
  );

}

async function caricaCamereSalvate() {

  const doc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  if (doc.exists && doc.data().camere) {
    camere = doc.data().camere;
  }

}

// ================= CREAZIONE CAMERA =================

function creaCamera() {

  const numeroVal = parseInt(document.getElementById("numeroCamera").value);
  const maxPostiVal = parseInt(document.getElementById("maxPosti").value);

  if (!numeroVal || !maxPostiVal) {
    alert("Compila tutti i campi");
    return;
  }

  if (maxPostiVal !== 4 && maxPostiVal !== 5) {
    alert("I posti devono essere 4 o 5");
    return;
  }

  if (camere.find(c => c.numero === numeroVal)) {
    alert("Numero camera già esistente");
    return;
  }

  camere.push({
    numero: numeroVal,
    maxPosti: maxPostiVal,
    atlete: []
  });

  document.getElementById("numeroCamera").value = "";
  document.getElementById("maxPosti").value = "";

  renderizza();
}

// ================= RENDER GENERALE =================

function renderizza() {

  renderLista();
  renderCamere();

}

// ================= LISTA ATLETE =================

function renderLista() {

  const lista = document.getElementById("listaAtlete");
  lista.innerHTML = "";

  const assegnate = camere.flatMap(c => c.atlete);

  tutteIscritte.forEach(atleta => {

    if (!assegnate.includes(atleta.id)) {

      const li = document.createElement("li");
      li.innerText = atleta.cognome + " " + atleta.nome;

      li.onclick = () => assegnaAtleta(atleta.id);

      lista.appendChild(li);
    }

  });

}

// ================= CAMERE =================

function renderCamere() {

  const container = document.getElementById("camereContainer");
  container.innerHTML = "";

  camere.forEach(camera => {

    const div = document.createElement("div");
    div.className = "camera-box";

    // Evidenzia selezionata
    if (cameraSelezionata === camera.numero) {
      div.classList.add("attiva");
    }

    // Evidenzia piena
    if (camera.atlete.length >= camera.maxPosti) {
      div.classList.add("piena");
    }

    div.onclick = () => {
      cameraSelezionata = camera.numero;
      renderizza();
    };

    // HEADER CAMERA
    const header = document.createElement("div");
    header.className = "camera-header";
    header.innerHTML = `
      <span>Camera ${camera.numero}</span>
      <span>${camera.atlete.length}/${camera.maxPosti}</span>
    `;

    div.appendChild(header);

    // GRIGLIA POSTI
    const postiGrid = document.createElement("div");
    postiGrid.className = "posti-grid";

    for (let i = 0; i < camera.maxPosti; i++) {

      const posto = document.createElement("div");
      posto.className = "posto";

      if (camera.atlete[i]) {

  const atletaId = camera.atlete[i];
  const atleta = tutteIscritte.find(a => a.id === atletaId);

  posto.innerText = atleta
    ? atleta.cognome + " " + atleta.nome
    : "";

  posto.style.cursor = "pointer";

  posto.onclick = (e) => {
    e.stopPropagation();
    rimuoviAtleta(camera.numero, atletaId);
  };

} else {

  posto.innerText = "Posto libero";
  posto.style.cursor = "default";

}

      postiGrid.appendChild(posto);
    }

    div.appendChild(postiGrid);

    // BOTTONE ELIMINA
    const btnElimina = document.createElement("button");
    btnElimina.innerText = "🗑️ Elimina";
    btnElimina.onclick = (e) => {
      e.stopPropagation();
      eliminaCamera(camera.numero);
    };

    div.appendChild(btnElimina);

    container.appendChild(div);

  });

}

// ================= ASSEGNAZIONE =================

function assegnaAtleta(atletaId) {

  if (!cameraSelezionata) {
    alert("Seleziona prima una camera");
    return;
  }

  const camera = camere.find(c => c.numero === cameraSelezionata);

  if (!camera) return;

  if (camera.atlete.length >= camera.maxPosti) {
    alert("Camera piena");
    return;
  }

  camera.atlete.push(atletaId);

  renderizza();

}

// ================= MODIFICHE =================

function rimuoviAtleta(numero, atletaId) {

  const camera = camere.find(c => c.numero === numero);
  if (!camera) return;

  camera.atlete = camera.atlete.filter(id => id !== atletaId);

  renderizza();
}

function eliminaCamera(numero) {

  camere = camere.filter(c => c.numero !== numero);

  if (cameraSelezionata === numero) {
    cameraSelezionata = null;
  }

  renderizza();
}

// ================= SALVATAGGIO =================

async function salvaComposizione() {

  await db.collection("settimane")
    .doc(settimanaID)
    .update({
      camere: camere
    });

  alert("Composizione salvata correttamente!");

}

// ================= STAMPA =================

async function stampaCamere(){

  if(!camere || camere.length === 0){
    alert("Nessuna camera da stampare");
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF("p", "mm", "a4");

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

  // ================= DATI SETTIMANA =================

  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  let nomeSettimana = "";
  let periodo = "";

  if(settimanaDoc.exists){
    const data = settimanaDoc.data();
    nomeSettimana = data.nome || "";

    if(data.dal && data.al){

  const dal = new Date(data.dal).toLocaleDateString("it-IT");
  const al = new Date(data.al).toLocaleDateString("it-IT");

  periodo = dal + " - " + al;
}
  }

  pdf.setFontSize(12);
  pdf.setFont("helvetica","bold");
  pdf.text("Composizione Camere", 15, 40);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.text(nomeSettimana, 15, 46);
  pdf.text(periodo, 15, 52);

  let y = 65;

  const camereOrdinate = [...camere].sort((a,b)=>a.numero - b.numero);

  camereOrdinate.forEach(camera => {

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(11);
    pdf.text(`Camera ${camera.numero}`, 15, y);

    y += 6;

    pdf.setFont("helvetica","normal");
    pdf.setFontSize(10);

    camera.atlete.forEach(id => {

      const atleta = tutteIscritte.find(a => a.id === id);

      if(atleta){
        pdf.text(`- ${atleta.cognome} ${atleta.nome}`, 20, y);
        y += 5;
      }

    });

    y += 6;

  });

  pdf.save(`Camere_${nomeSettimana}.pdf`);
}

function formattaData(dataISO){
  if(!dataISO) return "";

  const d = new Date(dataISO);
  return d.toLocaleDateString("it-IT");
}