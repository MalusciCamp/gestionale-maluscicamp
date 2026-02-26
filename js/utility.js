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