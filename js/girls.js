// HEADER LOAD
fetch("components/header.html")
.then(r => r.text())
.then(h => document.getElementById("header").innerHTML = h);


// ================= POPUP =================

function openPopup(){
  document.getElementById("iscrizioneModal").style.display="flex";
  caricaSettimane();
}

function closeIscrizionePopup(){
  document.getElementById("iscrizioneModal").style.display="none";
}

function openArchivio(){
  alert("Archivio - prossimo step");
}


// ================= DOCUMENTI =================

document.addEventListener("click",e=>{
  if(e.target.classList.contains("documento")){
    e.target.classList.toggle("green");
    e.target.classList.toggle("red");
  }
});


// ================= ALLERGIE =================

function toggleAllergie(btn,stato){

  document.querySelectorAll(".allergia-btn")
  .forEach(b=>b.classList.replace("green","red"));

  btn.classList.replace("red","green");

  const box=document.getElementById("descrizioneAllergie");
  stato?box.classList.remove("hidden"):box.classList.add("hidden");
}


// ================= SETTIMANE =================

function caricaSettimane(){

  const c=document.getElementById("settimaneToggle");
  c.innerHTML="";

  db.collection("settimane").get()
  .then(s=>{

    s.forEach(doc=>{

      const d=doc.data();

      const box=document.createElement("div");
      box.className="toggle red";
      box.innerText=d.nome;
      box.dataset.id=doc.id;
      box.dataset.prezzo=d.prezzo;

      box.onclick=()=>{
        box.classList.toggle("green");
        box.classList.toggle("red");
        calcolaTotale();
      };

      c.appendChild(box);
    });

  });
}


// ================= CALCOLI =================

function calcolaTotale(){

  let tot=0;

  document.querySelectorAll("#settimaneToggle .green")
  .forEach(b=>tot+=Number(b.dataset.prezzo));

  document.getElementById("totalePagamento").value=tot;
  calcolaSconto();
}

function calcolaSconto(){

  const s=Number(document.getElementById("scontoPagamento").value)||0;
  const tot=Number(document.getElementById("totalePagamento").value)||0;

  document.getElementById("totaleScontato").value=tot-s;
  calcolaRimanenza();
}

function calcolaRimanenza(){

  const a=Number(document.getElementById("accontoPagamento").value)||0;
  const t=Number(document.getElementById("totaleScontato").value)||0;

  document.getElementById("restoPagamento").value=t-a;
}

document.getElementById("scontoPagamento")
.addEventListener("input",calcolaSconto);

document.getElementById("accontoPagamento")
.addEventListener("input",calcolaRimanenza);


// ================= SALVATAGGIO =================

function salvaIscrizione(){

  const atleta={
    nome:nome.value,
    cognome:cognome.value,
    classe:classe.value,
    ruolo:ruolo.value,
    altezza:altezza.value,
    taglia:taglia.value,
    scarpa:scarpa.value,
    telefono1:telefono1.value,
    telefono2:telefono2.value,
    email:email.value,
    allergie:{
      stato:document.querySelector(".allergia-btn.green")?.innerText==="SI",
      descrizione:descrizioneAllergie.value
    },
    createdAt:new Date()
  };

  db.collection("atleti").add(atleta)
  .then(ref=>{

    document.querySelectorAll("#settimaneToggle .green")
    .forEach(w=>{

      db.collection("iscrizioni").add({
        atletaId:ref.id,
        settimanaId:w.dataset.id,
        nome:atleta.nome,
        cognome:atleta.cognome,
        classe:atleta.classe,
        rimanenza:restoPagamento.value,
        createdAt:new Date()
      });

    });

    alert("Salvato!");
    closeIscrizionePopup();
  });
}