// ================= HEADER =================

fetch("components/header.html")
.then(r => r.text())
.then(h => document.getElementById("header").innerHTML = h);


// ================= CARICA ATLETE =================

function caricaAtlete(){

  const tbody = document.getElementById("tbodyAtleti");
  if(!tbody) return;

  tbody.innerHTML = "";

  db.collection("atleti")
  .get()
  .then(snapshot=>{

    const atlete = [];

    snapshot.forEach(doc=>{
      atlete.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // ===== ORDINE ALFABETICO COGNOME =====
    atlete.sort((a,b)=>{
      return (a.cognome || "")
        .toLowerCase()
        .localeCompare(
          (b.cognome || "").toLowerCase()
        );
    });

    // ===== CREAZIONE RIGHE =====
    atlete.forEach(d=>{

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${d.cognome || ""}</td>
        <td>${d.nome || ""}</td>
        <td>${d.classe || ""}</td>
        <td>${d.ruolo || "-"}</td>

        <td>
          <div class="archivio-actions">

            <button class="view"
              onclick="visualizzaScheda('${d.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>

            <button class="delete"
              onclick="eliminaAtleta('${d.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>

          </div>
        </td>
      `;

      tbody.appendChild(tr);

    });

  });

}


// ================= ELIMINA =================

function eliminaAtleta(id){

  if(!confirm("Eliminare atleta?")) return;

  db.collection("atleti")
  .doc(id)
  .delete()
  .then(()=>{
    alert("Eliminata");
    caricaAtlete();
  });

}


// ================= VISUALIZZA =================

function visualizzaScheda(id){

  localStorage.setItem("atletaEditId", id);

  window.location.href = "girlcamp.html";

}


// ================= AVVIO =================

window.onload = caricaAtlete;