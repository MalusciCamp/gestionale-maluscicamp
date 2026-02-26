// ================= PARAMETRO SETTIMANA =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if(!settimanaID){
  alert("Settimana non trovata");
}

function apriMailBox(){
  document.getElementById("popupMail").style.display="flex";
}

function chiudiMail(){
  document.getElementById("popupMail").style.display="none";
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

function apriReport(){
  document.getElementById("popupReport").style.display="flex";
}

function chiudiReport(){
  document.getElementById("popupReport").style.display="none";
}

async function generaReport(){

  const checkboxes = document.querySelectorAll(".campi-grid input:checked");

  if(checkboxes.length === 0){
    alert("Seleziona almeno un campo");
    return;
  }

  const campiSelezionati = Array.from(checkboxes).map(cb=>cb.value);

  // 🔥 Recupero iscritti settimana
  const iscrizioniSnap = await db.collection("iscrizioni")
    .where("settimanaId","==",settimanaID)
    .get();

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
    alert("Nessun iscritto");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  pdf.setFontSize(12);
  pdf.text("Report Iscritti Settimana",15,20);

  let y = 30;

  atleti.forEach(atleta=>{

    if(y > 270){
      pdf.addPage();
      y = 20;
    }

    let riga = "";

    campiSelezionati.forEach(campo=>{

      let valore = atleta[campo] || "";

      if(campo === "dataNascita" && valore?.toDate){
        valore = valore.toDate().toLocaleDateString("it-IT");
      }

      if(campo === "certMedico"){
        valore = atleta.documenti?.certMedico ? "SI" : "NO";
      }

      riga += valore + "   |   ";

    });

    pdf.setFontSize(9);
    pdf.text(riga,15,y);

    y += 6;

  });

  pdf.save("Report_Iscritti.pdf");

  chiudiReport();
}