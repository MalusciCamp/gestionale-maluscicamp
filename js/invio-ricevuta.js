async function inviaRicevutaEmail(atletaId) {

  const id = atletaId || atletaPagamentoInCorso;

  if (!id) {
    alert("Atleta non selezionato");
    return;
  }

  const atleta = cacheAtleti[id];

  if (!atleta) {
    alert("Atleta non trovato");
    return;
  }

  let email = atleta.email || "";

  if (email !== "") {
    inviaPDF(id, email);
    return;
  }

  const nuovaEmail = prompt("Inserisci email genitore");

  if (!nuovaEmail) return;

  const emailValida = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailValida.test(nuovaEmail)) {
    alert("Email non valida");
    return;
  }

  try {
    await db.collection("atleti").doc(id).update({
      email: nuovaEmail
    });

    cacheAtleti[id].email = nuovaEmail;

    inviaPDF(id, nuovaEmail);
  } catch (error) {
    console.error(error);
    alert("Errore salvataggio email");
  }
}

async function salvaDataInvioRicevuta(atletaId) {
  let iscrizioneId = cacheIscrizioni[atletaId];

  if (!iscrizioneId) {
    const snap = await db.collection("iscrizioni")
      .where("atletaId", "==", atletaId)
      .where("settimanaId", "==", settimanaID)
      .get();

    if (!snap.empty) {
      iscrizioneId = snap.docs[0].id;
      cacheIscrizioni[atletaId] = iscrizioneId;
    }
  }

  if (!iscrizioneId) {
    return new Date();
  }

  await db.collection("iscrizioni").doc(iscrizioneId).update({
    ricevutaEmailInviataIl: firebase.firestore.FieldValue.serverTimestamp()
  });

  return new Date();
}

async function inviaPDF(atletaId, email) {
  document.body.style.cursor = "wait";

  try {
    const info = await assicuraNumeroRicevuta(atletaId, settimanaID);

    if (!info) {
      alert("Nessun pagamento trovato per assegnare la ricevuta");
      return;
    }

    const linkRicevuta =
      "https://maluscicamp.github.io/gestionale-maluscicamp/ricevuta.html?atleta=" +
      atletaId +
      "&settimana=" +
      settimanaID;

    await inviaEmailBrevo({
      type: "ricevuta",
      to: email,
      link_ricevuta: linkRicevuta
    });

    const dataInvio = await salvaDataInvioRicevuta(atletaId);
    aggiornaUiRicevutaInviata(atletaId, dataInvio);
  } catch (error) {
    console.error(error);
    alert("Errore invio email");
  }

  document.body.style.cursor = "default";
}