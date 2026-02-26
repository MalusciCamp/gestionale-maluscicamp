// ================= PARAMETRO SETTIMANA =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if(!settimanaID){
  alert("Settimana non trovata");
}
