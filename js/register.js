// Dirección de tu backend
const API_BASE = "http://localhost:3000";

// Tomamos los elementos del HTML
const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");
const btn = document.getElementById("btnRegister");

// Función para mostrar mensajes en pantalla
function setMsg(text, type) {
  msg.textContent = text;
  msg.className = `msg ${type || ""}`; 
}

// Cuando se envía el formulario
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // evita que la página se recargue

  const name = document.getElementById("name").value.trim();
  const lastname = document.getElementById("lastname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Validaciones 
  if (name.length < 2) return setMsg("Nombre muy corto", "err");
  if (lastname.length < 2) return setMsg("Apellido muy corto", "err");
  if (!email.includes("@")) return setMsg("Correo inválido", "err");
  if (password.length < 6) return setMsg("Contraseña mínima 6 caracteres", "err");

  btn.disabled = true;
  btn.textContent = "Registrando...";

  try {
    // Enviamos datos al backend
    const resp = await fetch(`${API_BASE}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lastname, email, password })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return setMsg(data.message || "Error en registro", "err");
    }

    setMsg("Registro exitoso.");

    // Guardamos el correo para usarlo en login
    sessionStorage.setItem("lastEmail", email);

    // Redirige después de 1 segundo
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1000);

  } catch (error) {
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Registrarme";
  }
});