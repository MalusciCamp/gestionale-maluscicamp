// HEADER
fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


// ================= CARICA ATLETE =================

function caricaAtlete(){

  const tbody = document.getElementById("tabellaAtlete");

  if(!tbody) return; // evita errore null

  tbody.innerHTML = "";

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
          <button class="view"
            onclick="visualizzaScheda('${doc.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>

          <button class="delete"
            onclick="eliminaAtleta('${doc.id}')">
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


// ================= SCHEDA =================

function visualizzaScheda(id){

  localStorage.setItem("atletaEditId", id);

  window.location.href = "girlcamp.html";

}

// AVVIO
window.onload = caricaAtlete;