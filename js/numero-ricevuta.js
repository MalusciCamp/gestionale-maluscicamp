async function assicuraNumeroRicevuta(atletaId, settimanaId) {
  if (!atletaId || !settimanaId) return null;

  const anno = new Date().getFullYear();

  let pagamentiSnap;

  try {
    pagamentiSnap = await db.collection("pagamenti")
      .where("atletaId", "==", atletaId)
      .where("settimanaId", "==", settimanaId)
      .orderBy("data")
      .get();
  } catch (error) {
    pagamentiSnap = await db.collection("pagamenti")
      .where("atletaId", "==", atletaId)
      .where("settimanaId", "==", settimanaId)
      .get();
  }

  if (pagamentiSnap.empty) return null;

  let numeroRicevuta = null;

  pagamentiSnap.forEach((doc) => {
    const data = doc.data();
    if (data.numeroRicevuta != null && data.numeroRicevuta !== "") {
      numeroRicevuta = data.numeroRicevuta;
    }
  });

  if (!numeroRicevuta) {
    const configRef = db.collection("config").doc("contatori");
    const configDoc = await configRef.get();

    let progressivo = 1;

    if (configDoc.exists) {
      progressivo = configDoc.data().numeroRicevute || 1;
    }

    numeroRicevuta = progressivo;

    await configRef.set({
      numeroRicevute: progressivo + 1
    }, { merge: true });

    await pagamentiSnap.docs[0].ref.update({
      numeroRicevuta: numeroRicevuta,
      anno: anno
    });
  }

  if (typeof aggiornaUiNumeroRicevuta === "function") {
    aggiornaUiNumeroRicevuta(atletaId, numeroRicevuta, anno);
  }

  return { numeroRicevuta, anno };
}
