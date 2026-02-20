// HEADER
fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


// ================= CARICA ATLETE =================

function caricaAtlete(){

  const tbody = document.getElementById("tabellaAtlete");
  tbody.innerHTML="";

  db.collection("atleti")
  .orderBy("createdAt","desc")
  .get()
  .then(snapshot=>{

    snapshot.forEach(doc=>{

      const data = doc.data();

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${data.nome || ""}</td>
        <td>${data.cognome || ""}</td>
        <td>${data.classe || ""}</td>
        <td>${data.ruolo || ""}</td>
        <td>
          <button onclick="visualizzaScheda('${doc.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>

          <button onclick="eliminaAtleta('${doc.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;

      tbody.appendChild(row);

    });

  });

}


// ================= ELIMINA =================

function eliminaAtleta(id){

  if(!confirm("Eliminare atleta?")) return;

  db.collection("atleti").doc(id).delete()
  .then(()=>{
    alert("Eliminata");
    caricaAtlete();
  });

}


// ================= VISUALIZZA SCHEDA =================

function visualizzaScheda(id){

  window.location.href = "scheda-atleta.html?id=" + id;

}


// AVVIO
window.onload = caricaAtlete;