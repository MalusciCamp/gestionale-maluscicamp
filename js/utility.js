// ================= PARAMETRO SETTIMANA =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if (!settimanaID) {
  alert("Settimana non trovata");
}


// ================= POPUP CONTROLLO =================

function chiudiTuttiPopup() {
  const mail = document.getElementById("popupMail");
  const report = document.getElementById("popupReport");
  const dettaglio = document.getElementById("popupDettaglioMail");

  if (mail) mail.style.display = "none";
  if (report) report.style.display = "none";
  if (dettaglio) dettaglio.style.display = "none";
}


// ================= MAIL =================

const EMAIL_VALIDA_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let ultimoInvioMail = null;
let erroriInvioMail = [];
let invioDettaglioCorrente = null;

const STORICO_MAIL_LIMITE = 30;

function escapeHtml(testo) {
  return String(testo || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formattaDataOraInvio(timestamp) {
  if (!timestamp) return { data: "-", ora: "-" };

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { data: "-", ora: "-" };

  return {
    data: date.toLocaleDateString("it-IT"),
    ora: date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  };
}

function apriMailBox() {
  chiudiTuttiPopup();
  document.getElementById("popupMail").style.display = "flex";
  nascondiReportErroriMail();
}

function chiudiMail() {
  document.getElementById("popupMail").style.display = "none";
}

function nascondiReportErroriMail() {
  const box = document.getElementById("reportErroriMail");
  if (box) {
    box.style.display = "none";
    box.innerHTML = "";
  }
  erroriInvioMail = [];
}

function validaEmail(email) {
  return EMAIL_VALIDA_REGEX.test(String(email || "").trim());
}

async function caricaDatiSettimanaMail() {
  const settimanaDoc = await db.collection("settimane")
    .doc(settimanaID)
    .get();

  let nomeSettimana = "";
  let periodo = "";

  if (settimanaDoc.exists) {
    const data = settimanaDoc.data();
    nomeSettimana = data.nome || "";

    if (data.dal && data.al) {
      const dal = data.dal.toDate ? data.dal.toDate() : new Date(data.dal);
      const al = data.al.toDate ? data.al.toDate() : new Date(data.al);
      periodo =
        dal.toLocaleDateString("it-IT") +
        " - " +
        al.toLocaleDateString("it-IT");
    }
  }

  return { nomeSettimana, periodo };
}

async function inviaEmailAdAtleta(atletaId, atleta, email, contesto) {
  await inviaEmailBrevo({
    type: "massiva",
    to: email,
    oggetto: contesto.oggetto,
    messaggio: contesto.testo,
    atleta: atleta.cognome + " " + atleta.nome,
    settimana: contesto.nomeSettimana,
    periodo: contesto.periodo
  });
}

function aggiornaProgresso(processati, totali, testoExtra) {
  const progressBox = document.getElementById("progressContainer");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  progressBox.style.display = "block";

  const percent = totali > 0 ? Math.round((processati / totali) * 100) : 0;
  progressBar.style.width = percent + "%";
  progressText.innerText = testoExtra || ("Elaborati: " + processati + " / " + totali);
}

function renderReportErroriMail(inviate, totali) {
  const box = document.getElementById("reportErroriMail");
  if (!box) return;

  if (erroriInvioMail.length === 0) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  let html = `
    <h3>⚠️ Report invio non riuscito (${erroriInvioMail.length})</h3>
    <p class="riepilogo-ok">Inviate con successo: ${inviate} su ${totali}</p>
  `;

  erroriInvioMail.forEach((err) => {
    const inputEmail = err.emailMancante
      ? `<input type="email" id="emailRetry_${err.atletaId}" placeholder="Inserisci email genitore">`
      : (err.email
        ? `<p style="font-size:12px;margin:0 0 8px;color:#555;">Email: ${err.email}</p>`
        : "");

    html += `
      <div class="report-errore-item" id="erroreItem_${err.atletaId}">
        <div class="nome-atleta">${err.nome}</div>
        <div class="motivo">${err.motivo}</div>
        ${inputEmail}
        <button type="button" class="btn-reinvia"
          onclick="reinviaEmailAtleta('${err.atletaId}')">
          Invia di nuovo
        </button>
      </div>
    `;
  });

  box.innerHTML = html;
  box.style.display = "block";
}

function creaContestoInvio(dati) {
  return {
    oggetto: dati.oggetto,
    testo: dati.testo,
    nomeSettimana: dati.nomeSettimana,
    periodo: dati.periodo
  };
}

async function eseguiReinvioSingolo(atletaId, email, contesto, opzioni = {}) {
  const { emailMancante = false, btn = null } = opzioni;

  if (emailMancante) {
    if (!email) {
      alert("Inserisci un indirizzo email");
      if (btn) btn.disabled = false;
      return null;
    }

    if (!validaEmail(email)) {
      alert("Email non valida");
      if (btn) btn.disabled = false;
      return null;
    }

    try {
      await db.collection("atleti").doc(atletaId).update({ email });
    } catch (error) {
      console.error(error);
      alert("Errore salvataggio email");
      if (btn) btn.disabled = false;
      return null;
    }
  }

  const atletaDoc = await db.collection("atleti").doc(atletaId).get();
  if (!atletaDoc.exists) {
    alert("Atleta non trovato");
    if (btn) btn.disabled = false;
    return null;
  }

  const atleta = atletaDoc.data();
  await inviaEmailAdAtleta(atletaId, atleta, email, contesto);

  return {
    atleta,
    nome: ((atleta.cognome || "") + " " + (atleta.nome || "")).trim(),
    email
  };
}

async function aggiornaDestinatarioNelLog(invioId, atletaId, aggiornamenti) {
  const docRef = db.collection("mailInvii").doc(invioId);
  const doc = await docRef.get();
  if (!doc.exists) return;

  const data = doc.data();
  const destinatari = (data.destinatari || []).map((d) => {
    if (d.atletaId !== atletaId) return d;
    return { ...d, ...aggiornamenti };
  });

  const inviate = destinatari.filter((d) => d.stato === "ok").length;
  const fallite = destinatari.length - inviate;

  await docRef.update({
    destinatari,
    inviate,
    fallite
  });

  if (invioDettaglioCorrente && invioDettaglioCorrente.id === invioId) {
    invioDettaglioCorrente = {
      id: invioId,
      ...data,
      destinatari,
      inviate,
      fallite
    };
    renderDettaglioInvio(invioDettaglioCorrente);
  }

  await caricaStoricoMail();
}

async function reinviaEmailAtleta(atletaId) {
  if (!ultimoInvioMail) {
    alert("Dati invio non disponibili. Ripeti l'invio massivo.");
    return;
  }

  const errore = erroriInvioMail.find((e) => e.atletaId === atletaId);
  if (!errore) return;

  const btn = document.querySelector(`#erroreItem_${atletaId} .btn-reinvia`);
  if (btn) btn.disabled = true;

  let email = errore.email || "";

  if (errore.emailMancante) {
    const input = document.getElementById("emailRetry_" + atletaId);
    email = input ? input.value.trim() : "";
  }

  try {
    const risultato = await eseguiReinvioSingolo(
      atletaId,
      email,
      ultimoInvioMail,
      { emailMancante: errore.emailMancante, btn }
    );

    if (!risultato) return;

    erroriInvioMail = erroriInvioMail.filter((e) => e.atletaId !== atletaId);

    const item = document.getElementById("erroreItem_" + atletaId);
    if (item) item.remove();

    if (erroriInvioMail.length === 0) {
      nascondiReportErroriMail();
      alert("Email inviata con successo. Tutti gli errori sono stati risolti.");
    } else {
      const box = document.getElementById("reportErroriMail");
      const titolo = box.querySelector("h3");
      if (titolo) {
        titolo.textContent = "⚠️ Report invio non riuscito (" + erroriInvioMail.length + ")";
      }
      alert("Email inviata a " + risultato.nome);
    }

  } catch (error) {
    console.error(error);
    errore.motivo = "Errore invio: " + (error.message || "riprova tra poco");
    errore.email = email;
    errore.emailMancante = false;

    const motivoEl = document.querySelector(`#erroreItem_${atletaId} .motivo`);
    if (motivoEl) motivoEl.textContent = errore.motivo;

    alert("Invio non riuscito: " + error.message);
    if (btn) btn.disabled = false;
  }
}

async function reinviaEmailDaStorico(invioId, atletaId) {
  const btn = document.querySelector(
    `#dettaglioRiga_${atletaId} .btn-reinvia-storico`
  );
  if (btn) btn.disabled = true;

  const doc = await db.collection("mailInvii").doc(invioId).get();
  if (!doc.exists) {
    alert("Invio non trovato");
    if (btn) btn.disabled = false;
    return;
  }

  const data = doc.data();
  const destinatario = (data.destinatari || []).find((d) => d.atletaId === atletaId);
  if (!destinatario || destinatario.stato === "ok") {
    if (btn) btn.disabled = false;
    return;
  }

  let email = destinatario.email || "";

  if (destinatario.emailMancante) {
    const input = document.getElementById("emailStorico_" + atletaId);
    email = input ? input.value.trim() : "";
  }

  const contesto = creaContestoInvio(data);

  try {
    const risultato = await eseguiReinvioSingolo(
      atletaId,
      email,
      contesto,
      { emailMancante: destinatario.emailMancante, btn }
    );

    if (!risultato) return;

    await aggiornaDestinatarioNelLog(invioId, atletaId, {
      stato: "ok",
      motivo: "",
      email: risultato.email,
      emailMancante: false,
      nome: risultato.nome
    });

    alert("Email inviata a " + risultato.nome);

  } catch (error) {
    console.error(error);

    await aggiornaDestinatarioNelLog(invioId, atletaId, {
      stato: "errore",
      motivo: "Errore invio: " + (error.message || "riprova tra poco"),
      email,
      emailMancante: false
    });

    alert("Invio non riuscito: " + error.message);
    if (btn) btn.disabled = false;
  }
}

async function inviaMailSettimana() {

  const oggetto = document.getElementById("oggettoMail").value.trim();
  const testo = document.getElementById("testoMail").value.trim();

  if (!oggetto || !testo) {
    alert("Compila oggetto e testo");
    return;
  }

  const btnInvia = document.querySelector("#popupMail .popup-content > button");
  if (btnInvia) btnInvia.disabled = true;

  erroriInvioMail = [];
  nascondiReportErroriMail();

  try {

    const iscrizioniSnap = await db.collection("iscrizioni")
      .where("settimanaId", "==", settimanaID)
      .get();

    if (iscrizioniSnap.empty) {
      alert("Nessun iscritto trovato");
      return;
    }

    const { nomeSettimana, periodo } = await caricaDatiSettimanaMail();

    ultimoInvioMail = { oggetto, testo, nomeSettimana, periodo };

    const totali = iscrizioniSnap.size;
    let processati = 0;
    let inviate = 0;
    const destinatariLog = [];

    aggiornaProgresso(0, totali, "Preparazione invio...");

    for (const doc of iscrizioniSnap.docs) {

      const atletaId = doc.data().atletaId;
      const atletaDoc = await db.collection("atleti").doc(atletaId).get();

      processati++;
      aggiornaProgresso(processati, totali, "Elaborati: " + processati + " / " + totali);

      if (!atletaDoc.exists) {
        const errore = {
          atletaId,
          nome: "Atleta sconosciuto",
          motivo: "Anagrafica atleta non trovata",
          email: "",
          emailMancante: false
        };
        erroriInvioMail.push(errore);
        destinatariLog.push({ ...errore, stato: "errore" });
        continue;
      }

      const atleta = atletaDoc.data();
      const nome = (atleta.cognome || "") + " " + (atleta.nome || "");
      const email = (atleta.email || "").trim();

      if (!email) {
        const errore = {
          atletaId,
          nome: nome.trim(),
          motivo: "Email mancante",
          email: "",
          emailMancante: true
        };
        erroriInvioMail.push(errore);
        destinatariLog.push({ ...errore, stato: "errore" });
        continue;
      }

      if (!validaEmail(email)) {
        const errore = {
          atletaId,
          nome: nome.trim(),
          motivo: "Email non valida: " + email,
          email,
          emailMancante: true
        };
        erroriInvioMail.push(errore);
        destinatariLog.push({ ...errore, stato: "errore" });
        continue;
      }

      try {
        await inviaEmailAdAtleta(atletaId, atleta, email, ultimoInvioMail);
        inviate++;
        destinatariLog.push({
          atletaId,
          nome: nome.trim(),
          email,
          stato: "ok",
          motivo: "",
          emailMancante: false
        });
        aggiornaProgresso(processati, totali, "Inviate: " + inviate + " / " + totali);
        await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (error) {
        const errore = {
          atletaId,
          nome: nome.trim(),
          motivo: "Errore invio: " + (error.message || "sconosciuto"),
          email,
          emailMancante: false
        };
        erroriInvioMail.push(errore);
        destinatariLog.push({ ...errore, stato: "errore" });
      }
    }

    document.getElementById("progressBar").style.width = "100%";
    document.getElementById("progressText").innerText =
      "Completato: " + inviate + " inviate, " + erroriInvioMail.length + " errori";

    await salvaLogInvio({
      oggetto,
      testo,
      nomeSettimana,
      periodo,
      totali,
      inviate,
      destinatari: destinatariLog
    });

    await caricaStoricoMail();

    renderReportErroriMail(inviate, totali);

    if (erroriInvioMail.length === 0) {
      alert("Email inviate con successo a tutti: " + inviate);
      chiudiMail();
    } else {
      alert(
        "Invio completato.\n" +
        "Inviate: " + inviate + "\n" +
        "Non inviate: " + erroriInvioMail.length + "\n\n" +
        "Controlla il report sotto per correggere e reinviare."
      );
    }

  } catch (error) {

    console.error(error);
    alert("Errore invio email: " + (error.message || "riprova tra poco"));

  } finally {
    if (btnInvia) btnInvia.disabled = false;
  }
}

async function salvaLogInvio(dati) {
  const fallite = dati.destinatari.filter((d) => d.stato !== "ok").length;

  await db.collection("mailInvii").add({
    settimanaId: settimanaID,
    dataInvio: firebase.firestore.FieldValue.serverTimestamp(),
    oggetto: dati.oggetto,
    testo: dati.testo,
    nomeSettimana: dati.nomeSettimana,
    periodo: dati.periodo,
    totale: dati.totali,
    inviate: dati.inviate,
    fallite,
    destinatari: dati.destinatari
  });
}

// ================= STORICO INVII =================

function classeBadgeInvio(inviate, totale) {
  if (inviate === totale) return "ok";
  if (inviate === 0) return "errore";
  return "parziale";
}

async function caricaStoricoMail() {
  const lista = document.getElementById("storicoMailLista");
  if (!lista || !settimanaID) return;

  try {
    const snap = await db.collection("mailInvii")
      .where("settimanaId", "==", settimanaID)
      .orderBy("dataInvio", "desc")
      .limit(STORICO_MAIL_LIMITE)
      .get();

    renderStoricoMail(snap.docs);

  } catch (error) {
    console.error("Errore caricamento storico mail:", error);

    const messaggio = String(error.message || "");
    if (messaggio.includes("index") || messaggio.includes("indexes")) {
      lista.innerHTML =
        '<p class="storico-mail-vuoto">Indice Firestore mancante. Controlla la console del browser per il link di creazione automatica.</p>';
    } else {
      lista.innerHTML =
        '<p class="storico-mail-vuoto">Errore caricamento storico invii.</p>';
    }
  }
}

function renderStoricoMail(docs) {
  const lista = document.getElementById("storicoMailLista");
  if (!lista) return;

  if (!docs.length) {
    lista.innerHTML =
      '<p class="storico-mail-vuoto">Nessun invio registrato per questa settimana.</p>';
    return;
  }

  lista.innerHTML = docs.map((doc) => {
    const data = doc.data();
    const { data: dataIt, ora } = formattaDataOraInvio(data.dataInvio);
    const inviate = data.inviate || 0;
    const totale = data.totale || 0;
    const badgeClass = classeBadgeInvio(inviate, totale);

    return `
      <button type="button" class="storico-mail-item" onclick="apriDettaglioInvio('${doc.id}')">
        <div class="storico-mail-data">
          <strong>${escapeHtml(dataIt)}</strong>
          ${escapeHtml(ora)}
        </div>
        <div class="storico-mail-oggetto" title="${escapeHtml(data.oggetto)}">
          ${escapeHtml(data.oggetto)}
        </div>
        <span class="storico-mail-badge ${badgeClass}">${inviate} su ${totale}</span>
        <i class="fa-solid fa-chevron-right storico-mail-chevron"></i>
      </button>
    `;
  }).join("");
}

async function apriDettaglioInvio(invioId) {
  chiudiTuttiPopup();

  try {
    const doc = await db.collection("mailInvii").doc(invioId).get();
    if (!doc.exists) {
      alert("Invio non trovato");
      return;
    }

    invioDettaglioCorrente = { id: doc.id, ...doc.data() };
    renderDettaglioInvio(invioDettaglioCorrente);
    document.getElementById("popupDettaglioMail").style.display = "flex";

  } catch (error) {
    console.error(error);
    alert("Errore apertura dettaglio");
  }
}

function chiudiDettaglioInvio() {
  const popup = document.getElementById("popupDettaglioMail");
  if (popup) popup.style.display = "none";
  invioDettaglioCorrente = null;
}

function renderDettaglioInvio(data) {
  const contenuto = document.getElementById("dettaglioMailContenuto");
  const titolo = document.getElementById("dettaglioMailTitolo");
  if (!contenuto) return;

  const { data: dataIt, ora } = formattaDataOraInvio(data.dataInvio);
  const inviate = data.inviate || 0;
  const totale = data.totale || 0;
  const fallite = data.fallite != null ? data.fallite : (totale - inviate);

  if (titolo) titolo.textContent = "Dettaglio invio";

  const destinatari = [...(data.destinatari || [])].sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "")
  );

  const righe = destinatari.map((d) => {
    const isErrore = d.stato !== "ok";
    let azioni = "";

    if (isErrore) {
      const inputEmail = d.emailMancante
        ? `<input type="email" id="emailStorico_${d.atletaId}" placeholder="Inserisci email">`
        : (d.email
          ? `<div class="dettaglio-motivo">Email: ${escapeHtml(d.email)}</div>`
          : "");

      azioni = `
        ${inputEmail}
        <div class="dettaglio-motivo">${escapeHtml(d.motivo || "Invio non riuscito")}</div>
        <button type="button" class="btn-reinvia-storico"
          onclick="reinviaEmailDaStorico('${data.id}', '${d.atletaId}')">
          Invia di nuovo
        </button>
      `;
    }

    return `
      <tr class="${isErrore ? "riga-errore" : ""}" id="dettaglioRiga_${d.atletaId}">
        <td>${escapeHtml(d.nome)}</td>
        <td>${escapeHtml(d.email || "-")}</td>
        <td>
          <span class="stato-invio ${isErrore ? "errore" : "ok"}">
            <i class="fa-solid fa-${isErrore ? "circle-xmark" : "circle-check"}"></i>
            ${isErrore ? "Non inviata" : "Inviata"}
          </span>
          ${azioni ? `<div class="dettaglio-reinvia">${azioni}</div>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  contenuto.innerHTML = `
    <div class="dettaglio-meta">
      <span><strong>Data:</strong> ${escapeHtml(dataIt)}</span>
      <span><strong>Ora:</strong> ${escapeHtml(ora)}</span>
      <span><strong>Settimana:</strong> ${escapeHtml(data.nomeSettimana || "")}</span>
    </div>
    <div class="dettaglio-riepilogo">
      <div class="dettaglio-riepilogo-box totale">
        <span class="num">${totale}</span>Totale
      </div>
      <div class="dettaglio-riepilogo-box ok">
        <span class="num">${inviate}</span>Inviate
      </div>
      <div class="dettaglio-riepilogo-box ko">
        <span class="num">${fallite}</span>Non inviate
      </div>
    </div>
    <div class="dettaglio-testo-box">
      <strong>Oggetto: ${escapeHtml(data.oggetto)}</strong>
      ${escapeHtml(data.testo)}
    </div>
    <div class="dettaglio-destinatari">
      <table>
        <thead>
          <tr>
            <th>Atleta</th>
            <th>Email</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>${righe}</tbody>
      </table>
    </div>
  `;
}

window.apriDettaglioInvio = apriDettaglioInvio;
window.chiudiDettaglioInvio = chiudiDettaglioInvio;
window.reinviaEmailDaStorico = reinviaEmailDaStorico;
window.reinviaEmailAtleta = reinviaEmailAtleta;

document.addEventListener("DOMContentLoaded", () => {
  caricaStoricoMail();
});

// ================= REPORT =================

function apriReport() {
  chiudiTuttiPopup();
  document.getElementById("popupReport").style.display = "flex";
}

function chiudiReport() {
  document.getElementById("popupReport").style.display = "none";
}


// ================= CLICK FUORI POPUP =================

document.addEventListener("click", function (e) {

  const popupMail = document.getElementById("popupMail");
  const popupReport = document.getElementById("popupReport");
  const popupDettaglio = document.getElementById("popupDettaglioMail");

  if (e.target === popupMail) chiudiMail();
  if (e.target === popupReport) chiudiReport();
  if (e.target === popupDettaglio) chiudiDettaglioInvio();
});


// ================= GENERA REPORT PROFESSIONALE =================

async function generaReport() {

  const checkboxes = document.querySelectorAll(".campi-grid input:checked");

  if (checkboxes.length === 0) {
    alert("Seleziona almeno un campo");
    return;
  }

  const campiSelezionati = Array.from(checkboxes).map(cb => cb.value);

  try {

    const settimanaDoc = await db.collection("settimane")
      .doc(settimanaID)
      .get();

    let nomeSettimana = "";
    let periodo = "";

    if (settimanaDoc.exists) {

      const data = settimanaDoc.data();
      nomeSettimana = data.nome || "";

      if (data.dal && data.al) {

        const dal = data.dal.toDate
          ? data.dal.toDate()
          : new Date(data.dal);

        const al = data.al.toDate
          ? data.al.toDate()
          : new Date(data.al);

        periodo =
          dal.toLocaleDateString("it-IT") +
          " - " +
          al.toLocaleDateString("it-IT");
      }
    }

    // 🔹 Recupero iscritti
    const iscrizioniSnap = await db.collection("iscrizioni")
      .where("settimanaId", "==", settimanaID)
      .get();

    if (iscrizioniSnap.empty) {
      alert("Nessun iscritto trovato");
      return;
    }

    const atleti = [];

    for (const doc of iscrizioniSnap.docs) {

      const atletaId = doc.data().atletaId;

      const atletaDoc = await db.collection("atleti")
        .doc(atletaId)
        .get();

      if (atletaDoc.exists) {
        atleti.push(atletaDoc.data());
      }
    }

    // 🔹 Ordine alfabetico
    atleti.sort((a,b)=>
      (a.cognome || "").localeCompare(b.cognome || "")
    );

    // 🔹 Orientamento automatico
    const orientation =
      campiSelezionati.length > 6 ? "landscape" : "portrait";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const dataOggi = new Date().toLocaleDateString("it-IT");

    // ================= HEADER UFFICIALE =================

    try {
      pdf.addImage("img/logo.png", "PNG", 15, 10, 30, 12);
    } catch (e) {}

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("A.S.D. MALUSCI CAMP", 55, 15);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Via Montalbano N°98 - 51039 Quarrata (PT)", 55, 20);
    pdf.text("P.IVA 01963540479", 55, 24);

    pdf.line(15, 30, pageWidth - 15, 30);

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    const titoloReport = "REPORT ISCRITTI";
    pdf.text(titoloReport, 15, 38);
    pdf.text("Totale iscritti: " + atleti.length, 15 + pdf.getTextWidth(titoloReport) + 5, 38);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Settimana: " + nomeSettimana, 15, 45);
    pdf.text("Periodo: " + periodo, 15, 50);
    pdf.text("Data generazione: " + dataOggi, pageWidth - 60, 45);

    // ================= PREPARA COLONNE =================

    const mappaTitoli = {
      cognome: "Cognome",
      nome: "Nome",
      classe: "Classe",
      ruolo: "Ruolo",
      dataNascita: "Data Nascita",
      luogoNascita: "Luogo Nascita",
      indirizzo: "Indirizzo",
      telefono: "Telefono",
      email: "Email",
      codiceFiscale: "Codice Fiscale",
      allergie: "Allergie",
    };

    const head = [
      campiSelezionati.map(c => mappaTitoli[c] || c)
    ];

    const body = atleti.map(atleta => {

  return campiSelezionati.map(campo => {

    if (campo === "codiceFiscale") {

      return atleta.documenti?.tesseraSanitaria?.trim() || "";
    }

    if (campo === "dataNascita") {

      const data = atleta.dataNascita?.toDate
        ? atleta.dataNascita.toDate()
        : atleta.dataNascita;

      return data
        ? new Date(data).toLocaleDateString("it-IT")
        : "";
    }

 if (campo === "allergie") {

  const haAllergie = atleta.allergie?.stato === true;
  const descrizione = atleta.allergie?.descrizione || "";

  if (!haAllergie) {
    return "NO";
  }

  if (descrizione.trim() !== "") {
    return "SI - " + descrizione;
  }

  return "SI";
}



    return atleta[campo] || "";
  });

});
    // ================= TABELLA PROFESSIONALE =================

    pdf.autoTable({
      startY: 60,
      head: head,
      body: body,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 15, right: 15 }
    });

    // ================= FOOTER =================

    const pageCount = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        "Documento generato il " +
        dataOggi +
        " - Pagina " +
        i +
        "/" +
        pageCount,
        15,
        pdf.internal.pageSize.getHeight() - 10
      );
    }

   window.open(pdf.output("bloburl"));
    chiudiReport();

  } catch (error) {
    console.error("Errore generazione report:", error);
    alert("Errore generazione report");
  }
}