document.getElementById("loginBtn").addEventListener("click", () => {

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // LOGIN ADMIN FISSO DI TEST
  if (username === "admin" && password === "admin123") {

    // Vai alla dashboard
    window.location.href = "dashboard.html";

  } else {
    alert("Credenziali errate");
  }

});
