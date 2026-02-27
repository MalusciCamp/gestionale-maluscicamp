// ================= PARAMETRO SETTIMANA =================

const params = new URLSearchParams(window.location.search);
const settimanaID = params.get("id");

if (!settimanaID) {
  alert("Settimana non trovata");
}


// ================= POPUP CONTROLLO =================

function chiudiTuttiPopup() {
  const mail = document.getElementById("popupMail");
  const report = document.getElementById("popupReport");

  if (mail) mail.style.display = "none";
  if (report) report.style.display = "none";
}


// ================= MAIL =================

function apriMailBox() {
  chiudiTuttiPopup();
  document.getElementById("popupMail").style.display = "flex";
}

function chiudiMail() {
  document.getElementById("popupMail").style.display = "none";
}

function inviaMailSettimana() {

  const oggetto = document.getElementById("oggettoMail").value.trim();
  const testo = document.getElementById("testoMail").value.trim();

  if (!oggetto || !testo) {
    alert("Compila oggetto e testo");
    return;
  }

  alert("Funzione invio email non ancora attiva.");
  chiudiMail();
}


// ================= REPORT =================

function apriReport() {
  chiudiTuttiPopup();
  document.getElementById("popupReport").style.display = "flex";
}

function chiudiReport() {
  document.getElementById("popupReport").style.display = "none";
}


// ================= CLICK FUORI POPUP =================

document.addEventListener("click", function (e) {

  const popupMail = document.getElementById("popupMail");
  const popupReport = document.getElementById("popupReport");

  if (e.target === popupMail) chiudiMail();
  if (e.target === popupReport) chiudiReport();
});


// ================= GENERA REPORT PREMIUM =================

async function generaReport() {

  const checkboxes = document.querySelectorAll(".campi-grid input:checked");

  if (checkboxes.length === 0) {
    alert("Seleziona almeno un campo");
    return;
  }

  const campiSelezionati = Array.from(checkboxes).map(cb => cb.value);

  try {

    if (!window.jspdf) {
      alert("Libreria PDF non caricata");
      return;
    }

    // ================= RECUPERO SETTIMANA =================

    const settimanaDoc = await db.collection("settimane")
      .doc(settimanaID)
      .get();

    let nomeSettimana = "";
    let periodo = "";

    if (settimanaDoc.exists) {

      const data = settimanaDoc.data();
      nomeSettimana = data.nome || "";

      if (data.dal && data.al) {

        const dal = data.dal.toDate
          ? data.dal.toDate()
          : new Date(data.dal);

        const al = data.al.toDate
          ? data.al.toDate()
          : new Date(data.al);

        periodo =
          dal.toLocaleDateString("it-IT") +
          " - " +
          al.toLocaleDateString("it-IT");
      }
    }

    // ================= RECUPERO ATLETI =================

    const iscrizioniSnap = await db.collection("iscrizioni")
      .where("settimanaId", "==", settimanaID)
      .get();

    if (iscrizioniSnap.empty) {
      alert("Nessun iscritto trovato");
      return;
    }

    const atleti = [];

    for (const doc of iscrizioniSnap.docs) {

      const atletaId = doc.data().atletaId;

      const atletaDoc = await db.collection("atleti")
        .doc(atletaId)
        .get();

      if (atletaDoc.exists) {
        atleti.push(atletaDoc.data());
      }
    }

    // 🔹 Ordine alfabetico
    atleti.sort((a,b)=>
      (a.cognome || "").localeCompare(b.cognome || "")
    );

    // ================= ORIENTAMENTO DINAMICO =================

    const orientation =
      campiSelezionati.length > 6 ? "landscape" : "portrait";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const dataOggi = new Date().toLocaleDateString("it-IT");

    // ================= HEADER UFFICIALE =================

    try {
      pdf.addImage("img/logo.png", "PNG", 15, 10, 30, 12);
    } catch (e) {}

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("A.S.D. MALUSCI CAMP", 55, 15);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Via Montalbano N°98 - 51039 Quarrata (PT)", 55, 20);
    pdf.text("P.IVA 01963540479", 55, 24);

    pdf.line(15, 30, pageWidth - 15, 30);

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("REPORT ISCRITTI", 15, 38);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Settimana: " + nomeSettimana, 15, 45);
    pdf.text("Periodo: " + periodo, 15, 50);
    pdf.text("Data generazione: " + dataOggi, pageWidth - 70, 45);

    // ================= PREPARAZIONE TABELLA =================

    let y = 60;

    const margine = 15;
    const spazioDisponibile = pageWidth - (margine * 2);

    const numeroColonne = campiSelezionati.length + 1; // +1 per numerazione

    const colWidth = spazioDisponibile / numeroColonne;

    // 🔹 Funzione titoli leggibili
    function titoloCampo(campo) {

      const mappa = {
        cognome: "Cognome",
        nome: "Nome",
        classe: "Classe",
        ruolo: "Ruolo",
        dataNascita: "Data Nascita",
        luogoNascita: "Luogo Nascita",
        indirizzo: "Indirizzo",
        telefono: "Telefono",
        email: "Email",
        certMedico: "Cert. Medico"
      };

      return mappa[campo] || campo;
    }

    // ================= HEADER TABELLA =================

    // ================= HEADER TABELLA =================

pdf.setFont("helvetica","bold");
pdf.setFontSize(8);

// Sfondo grigio chiaro sicuro
pdf.setFillColor(240,240,240);
pdf.setDrawColor(200,200,200);

// Colonna numerazione
pdf.rect(margine, y, colWidth, 8, "FD");
pdf.setTextColor(0,0,0);
pdf.text("#", margine + 2, y + 5);

// Colonne dinamiche
campiSelezionati.forEach((campo, i) => {

  const x = margine + colWidth * (i + 1);

  pdf.rect(x, y, colWidth, 8, "FD");
  pdf.text(titoloCampo(campo), x + 2, y + 5);

});

// Ripristina colori normali
pdf.setTextColor(0,0,0);

    y += 10;

    pdf.setFont("helvetica","normal");
    pdf.setFontSize(8);

    // ================= RIGHE =================

    atleti.forEach((atleta, index) => {

      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }

      // Numero riga
      pdf.text(String(index + 1), margine + 2, y);

      campiSelezionati.forEach((campo, i) => {

        let valore = "";

        if (campo === "certMedico") {
          valore = atleta.documenti?.certMedico ? "SI" : "NO";
        }
        else if (campo === "dataNascita") {

          const data = atleta.dataNascita?.toDate
            ? atleta.dataNascita.toDate()
            : atleta.dataNascita;

          valore = data
            ? new Date(data).toLocaleDateString("it-IT")
            : "";
        }
        else {
          valore = atleta[campo] || "";
        }

        const x = margine + colWidth * (i + 1);

        // Word wrap automatico
        const testoDiviso = pdf.splitTextToSize(
          String(valore),
          colWidth - 2
        );

        pdf.text(testoDiviso, x + 1, y);
      });

      y += 7;
    });

    // ================= FOOTER =================

    const pageCount = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {

      pdf.setPage(i);
      pdf.setFontSize(8);

      pdf.text(
        "Documento generato il " +
        dataOggi +
        " - Pagina " +
        i +
        "/" +
        pageCount,
        15,
        pageHeight - 10
      );
    }

    pdf.save("Report_Iscritti_" + nomeSettimana + ".pdf");
    chiudiReport();

  } catch (error) {
    console.error("Errore generazione report:", error);
    alert("Errore generazione report");
  }
}