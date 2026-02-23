// ================= PARAMETRI =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if (!settimanaID) {
  alert("Settimana non trovata");
}

// Usa Firebase già inizializzato
const db = firebase.firestore();

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

    div.innerHTML = `
      <div class="camera-header">
        <strong>Camera ${camera.numero}</strong>
        <span>${camera.atlete.length}/${camera.maxPosti}</span>
      </div>
      <ul></ul>
      <button class="btn-elimina">🗑️ Elimina</button>
    `;

    // Bottone elimina camera
    div.querySelector(".btn-elimina").onclick = (e) => {
      e.stopPropagation();
      eliminaCamera(camera.numero);
    };

    const ul = div.querySelector("ul");

    camera.atlete.forEach(id => {

      const atleta = tutteIscritte.find(a => a.id === id);
      if (!atleta) return;

      const li = document.createElement("li");
      li.innerHTML = `
        ${atleta.cognome} ${atleta.nome}
        <span class="remove">❌</span>
      `;

      li.querySelector(".remove").onclick = (e) => {
        e.stopPropagation();
        rimuoviAtleta(camera.numero, id);
      };

      ul.appendChild(li);

    });

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

function stampaCamere() {

  window.print();

}