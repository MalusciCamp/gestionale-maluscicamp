// HEADER
fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


// ================= CARICA ATLETE =================

function caricaAtlete(){

  const tbody = document.getElementById("tbodyAtleti");
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

    // ORDINE ALFABETICO CASE INSENSITIVE
    atlete.sort((a,b)=>{
      return (a.cognome || "")
        .toLowerCase()
        .localeCompare((b.cognome || "").toLowerCase());
    });

    atlete.forEach(d=>{

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${d.cognome || ""}</td>
        <td>${d.nome || ""}</td>
        <td>${d.classe || ""}</td>
        <td>${d.ruolo || "-"}</td>

    <td>
  <div class="archivio-actions">
    <button class="view" onclick="visualizzaScheda('${doc.id}')">
      <i class="fa-solid fa-eye"></i>
    </button>

    <button class="delete" onclick="eliminaAtleta('${doc.id}')">
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>
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