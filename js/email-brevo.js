// Invio email tramite Firebase Cloud Function + Brevo

let sendCampEmailFn = null;

function getSendCampEmailFn() {
  if (!sendCampEmailFn) {
    sendCampEmailFn = firebase
      .app()
      .functions("europe-west1")
      .httpsCallable("sendCampEmail");
  }
  return sendCampEmailFn;
}

async function inviaEmailBrevo(payload) {
  const result = await getSendCampEmailFn()(payload);
  return result.data;
}
