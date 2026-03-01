// ===============================
// FIREBASE CONFIG
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();


// ======================================
// 🔥 MONITOR PROFESSIONALE LETTURE
// ======================================

(function(){

  console.log("✅ Monitor globale Firestore attivo");

  let lettureOggi = Number(localStorage.getItem("lettureOggi")) || 0;
  let totaleSessione = 0;

  // ================= RESET GIORNALIERO =================

  const oggiLocale = new Date().toDateString();
  const giornoSalvato = localStorage.getItem("giornoLetture");

  if(giornoSalvato !== oggiLocale){
    lettureOggi = 0;
    localStorage.setItem("lettureOggi", 0);
    localStorage.setItem("giornoLetture", oggiLocale);
  }

  // ================= AGGIORNA UI =================

  function aggiornaContatoreUI(){
    const el = document.getElementById("contatoreLetture");
    if(el){
      el.innerText = "🔥 Letture: " + lettureOggi;
    }
  }

  // ================= INTERCETTA QUERY GET =================

  const originalQueryGet = firebase.firestore.Query.prototype.get;

  firebase.firestore.Query.prototype.get = function(...args){
    return originalQueryGet.apply(this, args).then(snapshot => {

      const count = snapshot.size || 0;

      totaleSessione += count;
      lettureOggi += count;

      localStorage.setItem("lettureOggi", lettureOggi);

      console.log(
        "🔥 FIRESTORE GET | letti:",
        count,
        "| totale sessione:",
        totaleSessione
      );

      aggiornaContatoreUI();

      return snapshot;
    });
  };

  // ================= INTERCETTA DOC GET =================

  const originalDocGet = firebase.firestore.DocumentReference.prototype.get;

  firebase.firestore.DocumentReference.prototype.get = function(...args){
    return originalDocGet.apply(this, args).then(doc => {

      if(doc.exists){
        totaleSessione += 1;
        lettureOggi += 1;

        localStorage.setItem("lettureOggi", lettureOggi);

        console.log(
          "🔥 FIRESTORE DOC GET | letti: 1 | totale sessione:",
          totaleSessione
        );

        aggiornaContatoreUI();
      }

      return doc;
    });
  };

  // ================= SYNC SU FIRESTORE =================

  function getDataOggi(){
    return new Date().toISOString().slice(0,10);
  }

  async function sincronizzaMonitor(){

    const lettureLocali = Number(localStorage.getItem("lettureOggi") || 0);

    if(lettureLocali <= 0) return;

    const oggi = getDataOggi();

    try{

      // 🔹 Storico globale
      await db.collection("monitor")
        .doc("globale")
        .set({
          totaleStorico: firebase.firestore.FieldValue.increment(lettureLocali),
          ultimoAggiornamento: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });

      // 🔹 Giornaliero
      await db.collection("monitor")
        .doc("giorni")
        .collection("giorni")
        .doc(oggi)
        .set({
          totaleGiorno: firebase.firestore.FieldValue.increment(lettureLocali),
          data: oggi
        }, { merge:true });

      localStorage.setItem("lettureOggi", 0);

      console.log("✅ Sync monitor completata:", lettureLocali);

    }catch(err){
      console.error("Errore sync monitor:", err);
    }
  }

  // 🔹 Sync ogni 10 minuti (sicura)
  setInterval(() => {
    sincronizzaMonitor();
  }, 10 * 60 * 1000);

  // 🔹 Sync quando chiudi pagina
  window.addEventListener("beforeunload", () => {
    sincronizzaMonitor();
  });

})();