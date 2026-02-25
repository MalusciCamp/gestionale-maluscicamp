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

let gruppi = [];
let tuttiIscritti = [];
let gruppoSelezionato = null;

// ================= AVVIO =================

window.addEventListener("DOMContentLoaded", async () => {
  await caricaTitolo();
  await caricaIscritti();
  await caricaGruppiSalvati();
  popolaFiltri();
  renderizza();
});

// ================= CARICAMENTI =================

async function caricaTitolo() {
  const doc = await db.collection("settimane").doc(settimanaID).get();
  if (doc.exists) {
    document.getElementById("titoloPagina").innerText =
      "Composizione Gruppi - " + doc.data().nome;
  }
}

async function caricaIscritti() {
  const snap = await db.collection("iscrizioni")
    .where("settimanaId", "==", settimanaID)
    .get();

  tuttiIscritti = [];

  for (const docIscr of snap.docs) {
    const atletaId = docIscr.data().atletaId;

    const atletaDoc = await db.collection("atleti").doc(atletaId).get();

    if (atletaDoc.exists) {
      tuttiIscritti.push({
        id: atletaId,
        ...atletaDoc.data()
      });
    }
  }

  tuttiIscritti.sort((a, b) =>
    (a.cognome || "").localeCompare(b.cognome || "")
  );
}

async function caricaGruppiSalvati() {
  const doc = await db.collection("settimane").doc(settimanaID).get();

  if (doc.exists && doc.data().gruppi) {
    gruppi = doc.data().gruppi;
  }
}

// ================= CREA GRUPPO =================

function creaGruppo() {

  const nome = document.getElementById("nomeGruppo").value.trim();

  if (!nome) {
    alert("Inserisci nome gruppo");
    return;
  }

  if (gruppi.find(g => g.nome === nome)) {
    alert("Gruppo già esistente");
    return;
  }

  gruppi.push({
    nome: nome,
    maxPosti: 30,
    iscritti: []
  });

  document.getElementById("nomeGruppo").value = "";

  renderizza();
}

// ================= FILTRI =================

function popolaFiltri() {

  const filtroClasse = document.getElementById("filtroClasse");
  const filtroRuolo = document.getElementById("filtroRuolo");

  const classi = [...new Set(tuttiIscritti.map(a => a.classe).filter(Boolean))];
  const ruoli = [...new Set(tuttiIscritti.map(a => a.ruolo).filter(Boolean))];

  classi.sort();
  ruoli.sort();

  filtroClasse.innerHTML = `<option value="">Tutte le classi</option>`;
  filtroRuolo.innerHTML = `<option value="">Tutti i ruoli</option>`;

  classi.forEach(c => {
    filtroClasse.innerHTML += `<option value="${c}">${c}</option>`;
  });

  ruoli.forEach(r => {
    filtroRuolo.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

// ================= RENDER =================

function renderizza() {
  renderLista();
  renderGruppi();
}

// ================= LISTA ISCRITTI =================

function renderLista() {

  const lista = document.getElementById("listaIscritti");
  lista.innerHTML = "";

  const filtroClasseVal = document.getElementById("filtroClasse").value;
  const filtroRuoloVal = document.getElementById("filtroRuolo").value;

  const assegnati = gruppi.flatMap(g => g.iscritti);

  tuttiIscritti.forEach(atleta => {

    if (assegnati.includes(atleta.id)) return;

    if (filtroClasseVal && atleta.classe !== filtroClasseVal) return;
    if (filtroRuoloVal && atleta.ruolo !== filtroRuoloVal) return;

    const li = document.createElement("li");
    li.innerText = `${atleta.cognome} ${atleta.nome} (${atleta.classe || ""} - ${atleta.ruolo || ""})`;

    li.onclick = () => assegnaIscritto(atleta.id);

    lista.appendChild(li);
  });
}

// ================= GRUPPI =================

function renderGruppi() {

  const container = document.getElementById("gruppiContainer");
  container.innerHTML = "";

  gruppi.forEach(gruppo => {

    const div = document.createElement("div");
    div.className = "camera-box";

    if (gruppoSelezionato === gruppo.nome) {
      div.classList.add("attiva");
    }

    if (gruppo.iscritti.length >= gruppo.maxPosti) {
      div.classList.add("piena");
    }

    div.onclick = () => {
      gruppoSelezionato = gruppo.nome;
      renderizza();
    };

    const header = document.createElement("div");
    header.className = "camera-header";
    header.innerHTML = `
      <span>${gruppo.nome}</span>
      <span>${gruppo.iscritti.length}/30</span>
    `;

    div.appendChild(header);

    const postiGrid = document.createElement("div");
    postiGrid.className = "posti-grid";

    gruppo.iscritti.forEach(id => {

      const atleta = tuttiIscritti.find(a => a.id === id);

      const posto = document.createElement("div");
      posto.className = "posto";
      posto.innerText = atleta
        ? atleta.cognome + " " + atleta.nome
        : "";

      posto.onclick = (e) => {
        e.stopPropagation();
        rimuoviIscritto(gruppo.nome, id);
      };

      postiGrid.appendChild(posto);
    });

    div.appendChild(postiGrid);

    const btnElimina = document.createElement("button");
    btnElimina.innerText = "🗑️ Elimina";
    btnElimina.onclick = (e) => {
      e.stopPropagation();
      eliminaGruppo(gruppo.nome);
    };

    div.appendChild(btnElimina);

    container.appendChild(div);
  });
}

// ================= ASSEGNAZIONE =================

function assegnaIscritto(id) {

  if (!gruppoSelezionato) {
    alert("Seleziona prima un gruppo");
    return;
  }

  const gruppo = gruppi.find(g => g.nome === gruppoSelezionato);

  if (!gruppo) return;

  if (gruppo.iscritti.length >= 30) {
    alert("Gruppo pieno (max 30)");
    return;
  }

  gruppo.iscritti.push(id);

  renderizza();
}

// ================= MODIFICHE =================

function rimuoviIscritto(nome, id) {

  const gruppo = gruppi.find(g => g.nome === nome);
  if (!gruppo) return;

  gruppo.iscritti = gruppo.iscritti.filter(i => i !== id);

  renderizza();
}

function eliminaGruppo(nome) {

  gruppi = gruppi.filter(g => g.nome !== nome);

  if (gruppoSelezionato === nome) {
    gruppoSelezionato = null;
  }

  renderizza();
}

// ================= SALVA =================

async function salvaComposizioneGruppi() {

  await db.collection("settimane")
    .doc(settimanaID)
    .update({
      gruppi: gruppi
    });

  alert("Composizione gruppi salvata!");
}