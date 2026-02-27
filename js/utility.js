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


// ================= GENERA REPORT UFFICIALE =================

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

    // 🔹 Recupero settimana
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

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

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

    pdf.line(15, 30, 195, 30);

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("REPORT ISCRITTI", 15, 38);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Settimana: " + nomeSettimana, 15, 45);
    pdf.text("Periodo: " + periodo, 15, 50);
    pdf.text("Data generazione: " + dataOggi, 150, 45);

    // ================= TABELLA =================

    let y = 60;

    const colWidth = 180 / campiSelezionati.length;
    let xStart = 15;

    // 🔹 Intestazione colonne
    pdf.setFillColor(230, 230, 230);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);

    campiSelezionati.forEach((campo, index) => {

      pdf.rect(xStart + (index * colWidth), y, colWidth, 8, "F");
      pdf.text(
        campo.toUpperCase(),
        xStart + 2 + (index * colWidth),
        y + 5
      );

    });

    y += 10;

    pdf.setFont("helvetica", "normal");

    // 🔹 Righe atleti
    atleti.forEach(atleta => {

      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      campiSelezionati.forEach((campo, index) => {

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

        pdf.text(
          String(valore),
          xStart + 2 + (index * colWidth),
          y
        );

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
        290
      );
    }

    pdf.save("Report_Iscritti_" + nomeSettimana + ".pdf");
    chiudiReport();

  } catch (error) {
    console.error("Errore generazione report:", error);
    alert("Errore generazione report");
  }
}