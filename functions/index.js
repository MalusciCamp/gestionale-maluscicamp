const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const smtpPassword = defineSecret("SMTP_PASSWORD");

const SMTP_HOST = "smtps.aruba.it";
const SMTP_PORT = 465;
const SMTP_USER = "info@albertomaluscicamp.it";
const SMTP_SENDER_NAME = "ASD MALUSCI CAMP";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ORIGINS = new Set([
  "https://maluscicamp.github.io",
  "http://localhost:5000",
  "http://127.0.0.1:5500",
  "http://localhost:5500"
]);

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
        ASD Malusci Camp
      </p>
    </div>
  `;
}

function buildRicevutaEmailHtml({ linkRicevuta }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222;max-width:600px;">
      <p style="margin:0 0 12px;">Gentile genitore,</p>
      <p style="margin:0 0 12px;">
        clicca il link qui sotto per scaricare la ricevuta di pagamento del Malusci Camp.
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
        ASD Malusci Camp
      </p>
    </div>
  `;
}

function setCorsHeaders(req, res) {
  const origin = req.get("Origin") || "";

  if (ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost")) {
    res.set("Access-Control-Allow-Origin", origin);
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
}

function createTransporter(password) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: password
    }
  });
}

async function inviaConAruba(password, { to, subject, html }) {
  const transporter = createTransporter(password);

  await transporter.sendMail({
    from: `"${SMTP_SENDER_NAME}" <${SMTP_USER}>`,
    to,
    subject,
    html
  });
}

async function inviaEmailDaPayload(password, data) {
  const type = data.type || "massiva";
  const to = String(data.to || "").trim().toLowerCase();

  if (!EMAIL_REGEX.test(to)) {
    throw new Error("Email destinatario non valida");
  }

  let subject;
  let html;

  if (type === "ricevuta") {
    const linkRicevuta = String(data.link_ricevuta || "").trim();

    if (!linkRicevuta) {
      throw new Error("Link ricevuta mancante");
    }

    subject = "Ricevuta pagamento - Malusci Camp";
    html = buildRicevutaEmailHtml({ linkRicevuta });
  } else {
    const oggetto = String(data.oggetto || "").trim();
    const messaggio = String(data.messaggio || "").trim();

    if (!oggetto || !messaggio) {
      throw new Error("Oggetto e messaggio obbligatori");
    }

    subject = oggetto;
    html = buildMassEmailHtml({
      messaggio,
      atleta: data.atleta || "iscritto",
      settimana: data.settimana || "",
      periodo: data.periodo || ""
    });
  }

  await inviaConAruba(password, { to, subject, html });
}

exports.sendCampEmail = onRequest(
  {
    region: "europe-west1",
    invoker: "public",
    secrets: [smtpPassword]
  },
  async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Metodo non consentito" });
      return;
    }

    try {
      await inviaEmailDaPayload(smtpPassword.value(), req.body || {});
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Errore invio email Aruba:", error);
      res.status(500).json({
        error: error.message || "Invio email fallito"
      });
    }
  }
);
