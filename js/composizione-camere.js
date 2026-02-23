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

async function stampaCamere() {

  if (camere.length === 0) {
    alert("Nessuna camera da stampare");
    return;
  }

  // Recupero dati settimana
  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  let nomeSettimana = "";
  let periodo = "";

  if (settimanaDoc.exists) {
    const data = settimanaDoc.data();
    nomeSettimana = data.nome || "";

    if (data.dal && data.al) {
      periodo = `${formattaData(data.dal)} - ${formattaData(data.al)}`;
    }
  }

  // Ordina camere per numero
  const camereOrdinate = [...camere].sort((a,b) => a.numero - b.numero);

  let html = `
  <html>
  <head>
    <title>Stampa Camere</title>
    <style>
      body { font-family: Arial; padding: 30px; }
      .intestazione { text-align: center; margin-bottom: 30px; }
      .intestazione h2 { margin: 5px 0; }
      .camera { margin-bottom: 25px; page-break-inside: avoid; }
      .camera h3 { margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
      ul { list-style: none; padding: 0; }
      li { padding: 3px 0; }
    </style>
  </head>
  <body>

  <div class="intestazione">
    <h2>A.S.D. MALUSCI CAMP</h2>
    <div>${nomeSettimana}</div>
    <div>${periodo}</div>
  </div>
  `;

  camereOrdinate.forEach(camera => {

    html += `
      <div class="camera">
        <h3>Camera ${camera.numero}</h3>
        <ul>
    `;

    camera.atlete.forEach(id => {
      const atleta = tutteIscritte.find(a => a.id === id);
      if (atleta) {
        html += `<li>${atleta.cognome} ${atleta.nome}</li>`;
      }
    });

    html += `
        </ul>
      </div>
    `;
  });

  html += `
  </body>
  </html>
  `;

  const win = window.open("", "", "width=900,height=700");
  win.document.write(html);
  win.document.close();
  win.print();
}