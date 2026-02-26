// ================= CAMP DA URL =================

const params = new URLSearchParams(window.location.search);
const CAMP = params.get("camp");

if(!CAMP){
  alert("Camp non specificato");
}

// ================= TITOLO DINAMICO =================

if(CAMP === "girls"){
  document.getElementById("titoloArchivio").innerText = "Archivio Atlete - Girls Camp";
} else if(CAMP === "boys"){
  document.getElementById("titoloArchivio").innerText = "Archivio Atleti - Boys Camp";
}
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
    .where("camp","==",CAMP)
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

    })
    .catch(err=>{
      console.error("Errore caricamento archivio:", err);
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

  if(CAMP === "girls"){
    window.location.href = "girlcamp.html";
  } else if(CAMP === "boys"){
    window.location.href = "boys-camp.html";
  }

}


// ================= AVVIO =================

window.onload = caricaAtlete;

async function cercaArchivio(){

  const testo = document
    .getElementById("inputRicercaArchivio")
    .value
    .toLowerCase()
    .trim();

  const box = document.getElementById("risultatiRicercaArchivio");
  box.innerHTML = "";

  if(testo.length < 2){
    box.style.display = "none";
    return;
  }

  const snapshot = await db.collection("atleti").get();

  snapshot.forEach(doc => {

    const atleta = doc.data();

    if(atleta.cognomeLower?.includes(testo)){

      const div = document.createElement("div");
      div.className = "riga-risultato-archivio";
      div.innerText = atleta.cognome + " " + atleta.nome;

      div.onclick = () => {
        window.location.href = "scheda.html?id=" + doc.id;
      };

      box.appendChild(div);
    }

  });

  box.style.display = "block";
}
document.addEventListener("click", function(e){

  const box = document.getElementById("risultatiRicercaArchivio");
  const input = document.getElementById("inputRicercaArchivio");

  if(!input.contains(e.target) && !box.contains(e.target)){
    box.style.display = "none";
  }

});