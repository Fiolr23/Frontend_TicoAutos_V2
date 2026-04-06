const API_BASE = "http://localhost:3000";

// Referencias a elementos del DOM
const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");
const btnRegister = document.getElementById("btnRegister");
const btnValidateCedula = document.getElementById("btnValidateCedula");

const cedulaInput = document.getElementById("cedula");
const nameInput = document.getElementById("name");
const apellidoPaternoInput = document.getElementById("apellidoPaterno");
const apellidoMaternoInput = document.getElementById("apellidoMaterno");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Guarda la cédula que ya fue validada correctamente
let validatedCedula = "";

// Muestra mensajes al usuario (éxito o error)
function setMsg(text, type) {
  msg.textContent = text; // Texto visible
  msg.className = `msg ${type || ""}`; // Clase CSS para estilos
}

// Limpia los datos autocompletados del padrón
function clearPadronFields() {
  nameInput.value = "";
  apellidoPaternoInput.value = "";
  apellidoMaternoInput.value = "";
  validatedCedula = ""; // Invalida la cédula validada
}

// Valida que la cédula tenga exactamente 9 dígitos
function isValidCedula(cedula) {
  return /^\d{9}$/.test(cedula);
}

// Evento que se ejecuta cuando el usuario escribe en la cédula
cedulaInput.addEventListener("input", () => {
  // Elimina todo lo que no sean números y limita a 9 dígitos
  const onlyDigits = cedulaInput.value.replace(/\D/g, "").slice(0, 9);

  // Si el valor cambió, se reemplaza automáticamente
  if (cedulaInput.value !== onlyDigits) {
    cedulaInput.value = onlyDigits;
  }

  // Si ya había una cédula validada y el usuario la cambia
  // se limpian los datos y se invalida la validación
  if (validatedCedula && validatedCedula !== onlyDigits) {
    clearPadronFields();
  }
});

// Evento del botón "Validar cédula"
btnValidateCedula.addEventListener("click", async () => {
  const cedula = cedulaInput.value.trim();

  // Validación básica de formato
  if (!isValidCedula(cedula)) {
    clearPadronFields();
    return setMsg("La cédula debe tener exactamente 9 dígitos", "err");
  }

  // Desactiva el botón mientras se valida
  btnValidateCedula.disabled = true;
  btnValidateCedula.textContent = "Validando...";

  try {
    // El frontend llama al backend (no directamente al padrón)
    const resp = await fetch(
      `${API_BASE}/api/users/validate-cedula?cedula=${encodeURIComponent(cedula)}`
    );

    // Intenta convertir la respuesta a JSON
    const data = await resp.json().catch(() => ({}));

    // Si el backend responde con error
    if (!resp.ok) {
      clearPadronFields();
      return setMsg(data.message || "No se pudo validar la cédula", "err");
    }

    // Autocompleta los campos con datos del padrón
    nameInput.value = data.nombre || "";
    apellidoPaternoInput.value = data.apellidoPaterno || "";
    apellidoMaternoInput.value = data.apellidoMaterno || "";

    // Guarda la cédula validada
    validatedCedula = `${data.cedula || cedula}`.trim();

    setMsg("Cédula validada correctamente.", "ok");
  } catch (_error) {
    // Error de conexión con el servidor
    clearPadronFields();
    setMsg("No se pudo conectar con el servidor para validar la cédula", "err");
  } finally {
    // Reactiva el botón
    btnValidateCedula.disabled = false;
    btnValidateCedula.textContent = "Validar cédula";
  }
});

// Evento al enviar el formulario de registro
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita recargar la página

  // Obtiene valores del formulario
  const cedula = cedulaInput.value.trim();
  const name = nameInput.value.trim();
  const apellidoPaterno = apellidoPaternoInput.value.trim();
  const apellidoMaterno = apellidoMaternoInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validaciones básicas
  if (!isValidCedula(cedula)) {
    return setMsg("La cédula debe tener exactamente 9 dígitos", "err");
  }

  // Verifica que la cédula haya sido validada previamente
  if (validatedCedula !== cedula) {
    return setMsg("Debes validar la cédula antes de registrarte", "err");
  }

  if (name.length < 2) return setMsg("Nombre muy corto", "err");
  if (apellidoPaterno.length < 2) return setMsg("Apellido paterno muy corto", "err");
  if (apellidoMaterno.length < 2) return setMsg("Apellido materno muy corto", "err");
  if (!email.includes("@")) return setMsg("Correo inválido", "err");
  if (password.length < 6) return setMsg("Contraseña mínima 6 caracteres", "err");

  // Desactiva botón para evitar doble envío
  btnRegister.disabled = true;
  btnRegister.textContent = "Registrando...";

  try {
    // Petición POST al backend para registrar usuario
    const resp = await fetch(`${API_BASE}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      // Solo se envían estos datos
      // El backend completa nombre y apellidos desde el padrón
      body: JSON.stringify({ cedula, email, password }),
    });

    const data = await resp.json().catch(() => ({}));

    // Si el backend devuelve error
    if (!resp.ok) {
      return setMsg(data.message || "Error en registro", "err");
    }

    // Registro exitoso
    setMsg("Registro exitoso.");

    // Guarda el correo para usarlo después (ej: login)
    sessionStorage.setItem("lastEmail", email);

    // Redirige al login después de 1 segundo
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1000);
  } catch (_error) {
    // Error de conexión con el servidor
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    // Reactiva el botón
    btnRegister.disabled = false;
    btnRegister.textContent = "Registrarme";
  }
});