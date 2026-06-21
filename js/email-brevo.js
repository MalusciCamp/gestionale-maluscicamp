// Invio email tramite Firebase HTTP Function + Brevo

const SEND_CAMP_EMAIL_URL =
  "https://europe-west1-gestionale-maluscicamp.cloudfunctions.net/sendCampEmail";

async function inviaEmailBrevo(payload) {
  const response = await fetch(SEND_CAMP_EMAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let data = {};

  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Errore invio email");
  }

  return data;
}
