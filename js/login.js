document.getElementById("loginBtn").addEventListener("click", () => {

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // LOGIN ADMIN FISSO DI TEST
  if (username === "admin" && password === "admin123") {

    // Vai alla dashboard
    window.location.href = "dashboard.html";

  } else {
    alert("Credenziali errate");
  }

});
// ===============================
// FIREBASE INIT
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyDVomjMP2gDUy_mEIe-tnVf4hEdF7GFvws",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp",
  storageBucket: "gestionale-maluscicamp.appspot.com",
  messagingSenderId: "615282026849",
  appId: "1:615282026849:web:bf46adfca227570d7d7d20"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();


// ===============================
// SE GIÀ LOGGATO → DASHBOARD
// ===============================
const utenteLoggato = sessionStorage.getItem("utenteLoggato");

if (utenteLoggato) {
  window.location.href = "dashboard.html";
}


// ===============================
// LOGIN
// ===============================
document.getElementById("loginBtn").addEventListener("click", login);

function login() {

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Inserisci username e password");
    return;
  }

  db.collection("utenti")
    .where("nickname", "==", username)
    .where("password", "==", password)
    .get()
    .then(snapshot => {

      if (snapshot.empty) {
        alert("Credenziali non valide");
        return;
      }

      // 🔥 SALVA SESSIONE
      sessionStorage.setItem("utenteLoggato", username);

      window.location.href = "dashboard.html";

    })
    .catch(error => {
      console.error("Errore login:", error);
      alert("Errore durante il login");
    });

}