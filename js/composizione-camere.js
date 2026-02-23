// ================= FIREBASE CONFIG =================

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= PARAMETRI =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

let camere = [];
let tutteIscritte = [];
let cameraSelezionata = null;

// ================= CARICAMENTO INIZIALE =================

window.addEventListener("DOMContentLoaded", async () => {
  await caricaTitolo();
  await caricaIscritte();
  await caricaCamereSalvate();
  renderizza();
});

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

  for (const doc of snap.docs) {
    const atletaId = doc.data().atletaId;
    const atletaDoc = await db.collection("atleti").doc(atletaId).get();
    if (atletaDoc.exists) {
      tutteIscritte.push({
        id: atletaId,
        ...atletaDoc.data()
      });
    }
  }
}

async function caricaCamereSalvate() {
  const doc = await db.collection("settimane").doc(settimanaID).get();
  if (doc.exists && doc.data().camere) {
    camere = doc.data().camere;
  }
}

// ================= CREAZIONE CAMERA =================

function creaCamera() {

  const numero = parseInt(numeroCamera.value);
  const maxPosti = parseInt(maxPosti.value);

  if (!numero || !maxPosti) return alert("Compila i campi");

  if (camere.find(c => c.numero === numero))
    return alert("Numero camera già esistente");

  camere.push({
    numero,
    maxPosti,
    atlete: []
  });

  renderizza();
}

// ================= RENDER =================

function renderizza() {

  renderLista();
  renderCamere();
}

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

function renderCamere() {

  const container = document.getElementById("camereContainer");
  container.innerHTML = "";

  camere.forEach(camera => {

    const div = document.createElement("div");
    div.className = "camera";

    div.innerHTML = `
      <h4>Camera ${camera.numero} (${camera.atlete.length}/${camera.maxPosti})</h4>
      <ul></ul>
      <button onclick="eliminaCamera(${camera.numero})">🗑️ Elimina</button>
    `;

    const ul = div.querySelector("ul");

    camera.atlete.forEach(id => {
      const atleta = tutteIscritte.find(a => a.id === id);
      if (!atleta) return;

      const li = document.createElement("li");
      li.innerHTML = `
        ${atleta.cognome} ${atleta.nome}
        <span onclick="rimuoviAtleta(${camera.numero}, '${id}')">❌</span>
      `;
      ul.appendChild(li);
    });

    container.appendChild(div);
  });
}

// ================= ASSEGNAZIONE =================

function assegnaAtleta(atletaId) {

  const numero = prompt("Inserisci numero camera");
  const camera = camere.find(c => c.numero == numero);

  if (!camera) return alert("Camera non trovata");

  if (camera.atlete.length >= camera.maxPosti)
    return alert("Camera piena");

  camera.atlete.push(atletaId);
  renderizza();
}

function rimuoviAtleta(numero, atletaId) {

  const camera = camere.find(c => c.numero == numero);
  camera.atlete = camera.atlete.filter(id => id !== atletaId);
  renderizza();
}

function eliminaCamera(numero) {

  camere = camere.filter(c => c.numero !== numero);
  renderizza();
}

// ================= SALVA =================

async function salvaComposizione() {

  await db.collection("settimane")
    .doc(settimanaID)
    .update({
      camere: camere
    });

  alert("Composizione salvata!");
}

// ================= STAMPA =================

function stampaCamere() {
  window.print();
}