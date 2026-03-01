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
// 🔥 MONITOR GLOBALE LETTURE FIRESTORE
// ======================================

(function(){

  let totaleLetture = 0;

  function logLetture(tipo, snapshot){
    const count = snapshot.size || 0;
    totaleLetture += count;

    console.log(
      "🔥 FIRESTORE",
      tipo,
      "| letti:", count,
      "| totale sessione:", totaleLetture
    );
  }

  // Intercetta .get()
  const originalGetQuery = firebase.firestore.Query.prototype.get;
  firebase.firestore.Query.prototype.get = function(...args){
    return originalGetQuery.apply(this, args).then(snapshot=>{
      logLetture("GET", snapshot);
      return snapshot;
    });
  };

  const originalGetCollection = firebase.firestore.CollectionReference.prototype.get;
  firebase.firestore.CollectionReference.prototype.get = function(...args){
    return originalGetCollection.apply(this, args).then(snapshot=>{
      logLetture("GET", snapshot);
      return snapshot;
    });
  };

  // Intercetta .onSnapshot()
  const originalSnapshot = firebase.firestore.Query.prototype.onSnapshot;
  firebase.firestore.Query.prototype.onSnapshot = function(...args){
    return originalSnapshot.apply(this, [
      snapshot => {
        logLetture("SNAPSHOT", snapshot);
        return args[0]?.(snapshot);
      }
    ]);
  };

  console.log("✅ Monitor globale Firestore attivo");

})();

// ================= CONTATORE LETTURE GLOBALE =================

let lettureOggi = Number(localStorage.getItem("lettureOggi")) || 0;

// funzione per aggiornare UI
function aggiornaContatoreUI(){
  const el = document.getElementById("contatoreLetture");
  if(el){
    el.innerText = "🔥 Letture: " + lettureOggi;
  }
}

// wrapper GET
const originalGet = firebase.firestore.Query.prototype.get;

firebase.firestore.Query.prototype.get = function(...args){
  return originalGet.apply(this, args).then(snapshot=>{
    lettureOggi += snapshot.size;
    localStorage.setItem("lettureOggi", lettureOggi);
    aggiornaContatoreUI();
    return snapshot;
  });
};

// wrapper DOC GET
const originalDocGet = firebase.firestore.DocumentReference.prototype.get;

firebase.firestore.DocumentReference.prototype.get = function(...args){
  return originalDocGet.apply(this, args).then(doc=>{
    if(doc.exists){
      lettureOggi += 1;
      localStorage.setItem("lettureOggi", lettureOggi);
      aggiornaContatoreUI();
    }
    return doc;
  });
};

// reset automatico giornaliero
const oggi = new Date().toDateString();
const giornoSalvato = localStorage.getItem("giornoLetture");

if(giornoSalvato !== oggi){
  lettureOggi = 0;
  localStorage.setItem("lettureOggi", 0);
  localStorage.setItem("giornoLetture", oggi);
}