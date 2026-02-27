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


// ================= GENERA REPORT PROFESSIONALE =================

async function generaReport() {

  const checkboxes = document.querySelectorAll(".campi-grid input:checked");

  if (checkboxes.length === 0) {
    alert("Seleziona almeno un campo");
    return;
  }

  const campiSelezionati = Array.from(checkboxes).map(cb => cb.value);

  try {

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

    // 🔹 Recupero iscritti
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

    // 🔹 Orientamento automatico
    const orientation =
      campiSelezionati.length > 6 ? "landscape" : "portrait";

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
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
    pdf.text("Data generazione: " + dataOggi, pageWidth - 60, 45);

    // ================= PREPARA COLONNE =================

    const mappaTitoli = {
      cognome: "Cognome",
      nome: "Nome",
      classe: "Classe",
      ruolo: "Ruolo",
      dataNascita: "Data Nascita",
      luogoNascita: "Luogo Nascita",
      indirizzo: "Indirizzo",
      telefono: "Telefono",
      email: "Email",
      codiceFiscale: "Codice Fiscale",
    };

    const head = [
      campiSelezionati.map(c => mappaTitoli[c] || c)
    ];

    const body = atleti.map(atleta => {

  return campiSelezionati.map(campo => {

    if (campo === "codiceFiscale") {

      return atleta.documenti?.tesseraSanitaria?.trim() || "";
    }

    if (campo === "dataNascita") {

      const data = atleta.dataNascita?.toDate
        ? atleta.dataNascita.toDate()
        : atleta.dataNascita;

      return data
        ? new Date(data).toLocaleDateString("it-IT")
        : "";
    }

    return atleta[campo] || "";
  });

});
    // ================= TABELLA PROFESSIONALE =================

    pdf.autoTable({
      startY: 60,
      head: head,
      body: body,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 15, right: 15 }
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
        pdf.internal.pageSize.getHeight() - 10
      );
    }

    pdf.save("Report_Iscritti_" + nomeSettimana + ".pdf");
    chiudiReport();

  } catch (error) {
    console.error("Errore generazione report:", error);
    alert("Errore generazione report");
  }
}