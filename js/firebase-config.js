// Firebase Config

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestionale-maluscicamp.firebaseapp.com",
  projectId: "gestionale-maluscicamp"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();