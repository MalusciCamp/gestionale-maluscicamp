const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const brevoApiKey = defineSecret("BREVO_API_KEY");
const brevoSenderEmail = defineSecret("BREVO_SENDER_EMAIL");
const brevoSenderName = defineSecret("BREVO_SENDER_NAME");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMassEmailHtml({ messaggio, atleta, settimana, periodo }) {
  const righe = String(messaggio || "")
    .split("\n")
    .map((riga) => `<p style="margin:0 0 12px;">${escapeHtml(riga)}</p>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;">
      <p style="margin:0 0 12px;">Gentile ${escapeHtml(atleta)},</p>
      ${righe}
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#555;">
        <strong>${escapeHtml(settimana)}</strong><br>
        ${escapeHtml(periodo)}
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#888;">
        A.S.D. Malusci Camp
      </p>
    </div>
  `;
}

function buildRicevutaEmailHtml({ linkRicevuta }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;">
      <p style="margin:0 0 12px;">Gentile genitore,</p>
      <p style="margin:0 0 12px;">
        in allegato trovi il link per scaricare la ricevuta di pagamento del Malusci Camp.
      </p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(linkRicevuta)}"
           style="background:#1e88e5;color:#fff;padding:12px 20px;
                  text-decoration:none;border-radius:6px;display:inline-block;">
          Scarica ricevuta
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#888;">
        Se il pulsante non funziona, copia questo link nel browser:<br>
        ${escapeHtml(linkRicevuta)}
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#888;">
        A.S.D. Malusci Camp
      </p>
    </div>
  `;
}

async function inviaConBrevo(apiKey, senderEmail, senderName, payload) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Errore Brevo HTTP ${response.status}`);
  }
}

exports.sendCampEmail = onCall(
  {
    region: "europe-west1",
    secrets: [brevoApiKey, brevoSenderEmail, brevoSenderName],
    cors: [
      "https://maluscicamp.github.io",
      "http://localhost:5000",
      "http://127.0.0.1:5500",
      "http://localhost:5500"
    ]
  },
  async (request) => {
    const data = request.data || {};
    const type = data.type || "massiva";
    const to = String(data.to || "").trim().toLowerCase();

    if (!EMAIL_REGEX.test(to)) {
      throw new HttpsError("invalid-argument", "Email destinatario non valida");
    }

    let subject;
    let htmlContent;

    if (type === "ricevuta") {
      const linkRicevuta = String(data.link_ricevuta || "").trim();

      if (!linkRicevuta) {
        throw new HttpsError("invalid-argument", "Link ricevuta mancante");
      }

      subject = "Ricevuta pagamento - Malusci Camp";
      htmlContent = buildRicevutaEmailHtml({ linkRicevuta });
    } else {
      const oggetto = String(data.oggetto || "").trim();
      const messaggio = String(data.messaggio || "").trim();

      if (!oggetto || !messaggio) {
        throw new HttpsError("invalid-argument", "Oggetto e messaggio obbligatori");
      }

      subject = oggetto;
      htmlContent = buildMassEmailHtml({
        messaggio,
        atleta: data.atleta || "iscritto",
        settimana: data.settimana || "",
        periodo: data.periodo || ""
      });
    }

    try {
      await inviaConBrevo(
        brevoApiKey.value(),
        brevoSenderEmail.value(),
        brevoSenderName.value(),
        {
          sender: {
            email: brevoSenderEmail.value(),
            name: brevoSenderName.value()
          },
          to: [{ email: to }],
          subject,
          htmlContent
        }
      );
    } catch (error) {
      console.error("Errore invio Brevo:", error);
      throw new HttpsError("internal", "Invio email fallito. Controlla mittente e API key Brevo.");
    }

    return { success: true };
  }
);
