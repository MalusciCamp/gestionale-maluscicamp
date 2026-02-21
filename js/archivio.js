// HEADER
fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


// ================= CARICA ATLETE =================

function caricaAtlete(){

  const tbody =
    document.getElementById("tbodyAtleti");

  tbody.innerHTML = "";

  db.collection("atleti")
  .orderBy("cognome")
  .get()
  .then(snapshot=>{

    snapshot.forEach(doc=>{

      const d = doc.data();

      const tr = document.createElement("tr");

      tr.innerHTML = `
            <td>${d.cognome}</td>
            <td>${d.nome}</td>
            <td>${d.classe || ""}</td>
            <td>${d.ruolo || "-"}</td>

        <td>
          <button onclick="visualizzaScheda('${doc.id}')">
            👁
          </button>

          <button onclick="eliminaAtleta('${doc.id}')">
            🗑
          </button>
        </td>
      `;

      tbody.appendChild(tr);

    });

  });

}

window.onload = caricaAtlete;

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