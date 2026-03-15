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

  try{

    // genera PDF ricevuta
    const pdfBlob = await generaPDFRicevuta(atletaId);

    const reader = new FileReader();

    reader.readAsDataURL(pdfBlob);

    reader.onloadend = function(){

      const base64PDF = reader.result;

      emailjs.send(
        "service_ezo9gbn",
        "template_lr908qc",
        {
          email: email,
          attachment: base64PDF
        }
      )
      .then(function(){

        alert("Ricevuta inviata a " + email);

      })
      .catch(function(error){

        console.error(error);
        alert("Errore invio email");

      });

    };

  }catch(err){

    console.error(err);
    alert("Errore generazione ricevuta");

  }

}