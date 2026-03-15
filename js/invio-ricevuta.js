async function inviaRicevutaEmail(atletaId){

  const atleta = cacheAtleti[atletaId];

  if(!atleta){
    alert("Atleta non trovato");
    return;
  }

  let email = atleta.email || "";

  // SE EMAIL ESISTE
  if(email !== ""){

    inviaPDF(atletaId, email);
    return;

  }

  // SE EMAIL NON ESISTE → POPUP
  const nuovaEmail = prompt("Inserisci email genitore");

  if(!nuovaEmail) return;

  try{

    // salva email atleta
    await db.collection("atleti")
      .doc(atletaId)
      .update({
        email: nuovaEmail
      });

    // aggiorna cache
    cacheAtleti[atletaId].email = nuovaEmail;

    inviaPDF(atletaId, nuovaEmail);

  }catch(error){

    console.error(error);
    alert("Errore salvataggio email");

  }

}
async function inviaPDF(atletaId, email){

  alert("Invio ricevuta a: " + email);

}