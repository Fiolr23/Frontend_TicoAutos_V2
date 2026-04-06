const API_BASE = "http://localhost:3000";

const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const btn = document.getElementById("btnLogin");

function setMsg(text, type) {
  msg.textContent = text;
  msg.className = `msg ${type || ""}`.trim();
}

// Si  del registro, autollenar correo
const lastEmail = sessionStorage.getItem("lastEmail");
if (lastEmail) document.getElementById("email").value = lastEmail;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email.includes("@")) return setMsg("Correo inválido", "err");
  if (password.length < 6) return setMsg("Contraseña mínima 6 caracteres", "err");

  btn.disabled = true;
  btn.textContent = "Ingresando...";

  try {
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) return setMsg(data.message || "Error en login", "err");

    // Guardar token para usarlo en rutas protegidas
    sessionStorage.setItem("token", data.token);
    if (data.user?.id) {
      sessionStorage.setItem("userId", data.user.id);
    }

    setMsg(" Login exitoso", "ok");

    //redirigir a una página principal
    setTimeout(() => {
      window.location.href = "./index.html"; 
    }, 800);

  } catch (error) {
    console.error(error);
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Iniciar sesión";
  }
});
