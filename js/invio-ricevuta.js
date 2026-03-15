async function inviaRicevutaEmail(atletaId){

  const atleta = cacheAtleti[atletaId];

  if(!atleta){
    alert("Atleta non trovato");
    return;
  }

  let email = atleta.email || "";

  // EMAIL GIÀ PRESENTE
  if(email !== ""){
    inviaPDF(atletaId, email);
    return;
  }

  // EMAIL MANCANTE → CHIEDI INSERIMENTO
  const nuovaEmail = prompt("Inserisci email genitore");

  if(!nuovaEmail) return;

const emailValida = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if(!emailValida.test(nuovaEmail)){
  alert("Email non valida");
  return;
}

  try{

    // salva email su Firebase
    await db.collection("atleti")
      .doc(atletaId)
      .update({
        email: nuovaEmail
      });

    // aggiorna cache locale
    cacheAtleti[atletaId].email = nuovaEmail;

    inviaPDF(atletaId, nuovaEmail);

  }catch(error){

    console.error(error);
    alert("Errore salvataggio email");

  }

}



async function inviaPDF(atletaId, email){
    document.body.style.cursor = "wait";

  const linkRicevuta =
  "https://maluscicamp.github.io/gestionale-maluscicamp/ricevuta.html?atleta="
  + atletaId +
  "&settimana=" + settimanaID;

  try{

    await emailjs.send(
      "service_ezo9gbn",
      "template_lr908qc",
      {
        email: email,
        link_ricevuta: linkRicevuta
      }
    );

    alert("Ricevuta inviata a " + email);

  }catch(error){

    console.error(error);
    alert("Errore invio email");

  }
document.body.style.cursor = "default";
}