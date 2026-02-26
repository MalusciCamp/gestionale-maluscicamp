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

// 🔥 IMPORTANTE: usare let e non ridichiarare se esiste
let db;
try{
  db = firebase.firestore();
}catch(e){
  console.error("Errore inizializzazione Firestore", e);
}



// ================= PARAMETRO SETTIMANA =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if(!settimanaID){
  alert("Settimana non trovata");
}



// ================= GESTIONE POPUP =================

function chiudiTuttiPopup(){
  const mail = document.getElementById("popupMail");
  const report = document.getElementById("popupReport");

  if(mail) mail.style.display = "none";
  if(report) report.style.display = "none";
}


// ===== MAIL =====

function apriMailBox(){
  chiudiTuttiPopup();
  document.getElementById("popupMail").style.display = "flex";
}

function chiudiMail(){
  document.getElementById("popupMail").style.display = "none";
}

function inviaMailSettimana(){

  const oggetto = document.getElementById("oggettoMail").value.trim();
  const testo = document.getElementById("testoMail").value.trim();

  if(!oggetto || !testo){
    alert("Compila oggetto e testo");
    return;
  }

  alert("Funzione invio email non ancora attiva.\n\nSistema pronto per configurazione.");

  chiudiMail();
}



// ===== REPORT =====

function apriReport(){
  chiudiTuttiPopup();
  document.getElementById("popupReport").style.display = "flex";
}

function chiudiReport(){
  document.getElementById("popupReport").style.display = "none";
}



// ================= CHIUSURA CLICK FUORI =================

document.addEventListener("click", function(e){

  const popupMail = document.getElementById("popupMail");
  const popupReport = document.getElementById("popupReport");

  if(e.target === popupMail){
    chiudiMail();
  }

  if(e.target === popupReport){
    chiudiReport();
  }

});



// ================= GENERA REPORT =================

async function generaReport(){

  const checkboxes = document.querySelectorAll(".campi-grid input:checked");

  if(checkboxes.length === 0){
    alert("Seleziona almeno un campo");
    return;
  }

  const campiSelezionati = Array.from(checkboxes).map(cb => cb.value);

  try {

    if(!window.jspdf){
      alert("Libreria PDF non caricata");
      return;
    }

    const iscrizioniSnap = await db.collection("iscrizioni")
      .where("settimanaId","==",settimanaID)
      .get();

    if(iscrizioniSnap.empty){
      alert("Nessun iscritto trovato");
      return;
    }

    const atleti = [];

    for(const doc of iscrizioniSnap.docs){

      const atletaId = doc.data().atletaId;

      const atletaDoc = await db.collection("atleti")
        .doc(atletaId)
        .get();

      if(atletaDoc.exists){
        atleti.push(atletaDoc.data());
      }
    }

    if(atleti.length === 0){
      alert("Nessun atleta trovato");
      return;
    }

    // ===== CREA PDF =====

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p","mm","a4");

    pdf.setFontSize(14);
    pdf.text("Report Iscritti Settimana",15,20);

    let y = 30;

    atleti.forEach(atleta => {

      if(y > 270){
        pdf.addPage();
        y = 20;
      }

      let riga = "";

      campiSelezionati.forEach(campo => {

        let valore = "";

        if(campo === "certMedico"){
          valore = atleta.documenti?.certMedico ? "SI" : "NO";
        }
        else if(campo === "dataNascita"){
          const data = atleta.dataNascita?.toDate
            ? atleta.dataNascita.toDate()
            : atleta.dataNascita;

          valore = data
            ? new Date(data).toLocaleDateString("it-IT")
            : "";
        }
        else{
          valore = atleta[campo] || "";
        }

        riga += valore + "   |   ";

      });

      pdf.setFontSize(9);
      pdf.text(riga,15,y);

      y += 6;

    });

    pdf.save("Report_Iscritti.pdf");

    chiudiReport();

  } catch(error){
    console.error("Errore generazione report:", error);
    alert("Errore generazione report");
  }
}