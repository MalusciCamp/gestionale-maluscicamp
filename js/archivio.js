// HEADER
fetch("components/header.html")
.then(r=>r.text())
.then(h=>document.getElementById("header").innerHTML=h);


// ================= CARICA ATLETE =================

function caricaAtlete(){

  const container = document.getElementById("listaAtlete");
  container.innerHTML="";

  db.collection("atleti")
  .orderBy("createdAt","desc")
  .get()
  .then(snapshot=>{

    snapshot.forEach(doc=>{

      const data = doc.data();

      const card = document.createElement("div");
      card.className="atleta-card";

      card.innerHTML = `
        <div class="atleta-info">
          <h3>${data.nome} ${data.cognome}</h3>
          <p>Classe: ${data.classe || "-"}</p>
          <p>Ruolo: ${data.ruolo || "-"}</p>
        </div>

        <div class="atleta-actions">
          <button onclick="modificaAtleta('${doc.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>

          <button onclick="eliminaAtleta('${doc.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;

      container.appendChild(card);

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


// ================= MODIFICA (placeholder) =================

function modificaAtleta(id){
  alert("Modifica atleta - prossimo step");
}


// AVVIO
window.onload = caricaAtlete;