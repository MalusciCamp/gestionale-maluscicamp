// Firebase Config

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// ===== DEBUG LETTURE FIRESTORE =====
function debugLetture(nome, snapshot){
  const numero = snapshot.size || 0;
  console.log("🔥", nome, "- documenti letti:", numero);
}