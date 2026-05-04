// URL base del backend
const API_BASE = "http://localhost:3000";

// Client ID de Google para usar Google Identity Services
const GOOGLE_CLIENT_ID = "270207719324-1bpt318s19001riv71k658umgigqkji2.apps.googleusercontent.com";

// Referencias a elementos del DOM
const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");
const btnRegister = document.getElementById("btnRegister");
const btnValidateCedula = document.getElementById("btnValidateCedula");
const googleRegisterBtn = document.getElementById("googleRegisterBtn");
const googleModeHint = document.getElementById("googleModeHint");

// Inputs del formulario
const cedulaInput = document.getElementById("cedula");
const nameInput = document.getElementById("name");
const apellidoPaternoInput = document.getElementById("apellidoPaterno");
const apellidoMaternoInput = document.getElementById("apellidoMaterno");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Telefono requerido para enviar codigo 2FA.
const phoneInput = document.getElementById("phone");

// Grupos para ocultar/mostrar email y password
const emailGroup = emailInput.closest("label");
const passwordGroup = passwordInput.closest("label");

// Grupo del telefono para ocultarlo en modo Google.
const phoneGroup = phoneInput.closest("label");

// Clave para guardar temporalmente credencial de Google
const PENDING_GOOGLE_CREDENTIAL_KEY = "pendingGoogleCredential";

// Variable para guardar la cédula ya validada
let validatedCedula = "";

// Se obtiene si hay un login con Google pendiente
let pendingGoogleCredential = sessionStorage.getItem(PENDING_GOOGLE_CREDENTIAL_KEY) || "";

// Función para mostrar mensajes al usuario
function setMsg(text, type) {
  msg.textContent = text;
  msg.className = `msg ${type || ""}`;
}

// Limpia los datos obtenidos del padrón si la cédula cambia
function clearPadronFields() {
  nameInput.value = "";
  apellidoPaternoInput.value = "";
  apellidoMaternoInput.value = "";
  validatedCedula = "";
}

// Valida que la cédula tenga exactamente 9 dígitos
function isValidCedula(cedula) {
  return /^\d{9}$/.test(cedula);
}

// Valida telefono de Costa Rica: solo 8 digitos.
function isValidPhone(phone) {
  return /^\d{8}$/.test(phone);
}

// Guarda la sesión del usuario (token + id)
function saveAuthSession(data) {
  sessionStorage.setItem("token", data.token);

  if (data.user?.id) {
    sessionStorage.setItem("userId", data.user.id);
  }
}

// Guarda la credencial de Google temporalmente (antes de validar cédula)
function savePendingGoogle(credential) {
  pendingGoogleCredential = credential;

  sessionStorage.setItem(PENDING_GOOGLE_CREDENTIAL_KEY, pendingGoogleCredential);
}

// Limpia el estado de Google pendiente
function clearPendingGoogle() {
  pendingGoogleCredential = "";

  sessionStorage.removeItem(PENDING_GOOGLE_CREDENTIAL_KEY);
}

// Determina si estamos en modo Google (ya autenticado con Google)
function isGoogleMode() {
  return Boolean(pendingGoogleCredential);
}

// Cambia el texto del botón dependiendo del modo
function getRegisterButtonText() {
  return isGoogleMode() ? "Completar registro con Google" : "Registrarme";
}

// Activa el modo Google:
// aquí se ocultan email y contraseña porque Google ya los proporciona
function enableGoogleMode() {
  // Con Google no se pide correo ni contraseña nuevamente
  emailInput.value = "";
  emailInput.required = false;
  emailInput.readOnly = true;
  emailGroup.hidden = true;
  emailGroup.style.display = "none";

  passwordInput.value = "";
  passwordInput.required = false;
  passwordGroup.hidden = true;
  passwordGroup.style.display = "none";

  // Google no usa 2FA por SMS, por eso no pide telefono.
  phoneInput.value = "";
  phoneInput.required = false;
  phoneGroup.hidden = true;
  phoneGroup.style.display = "none";

  // Cambia texto del botón
  btnRegister.textContent = getRegisterButtonText();

  // Muestra mensaje explicativo al usuario
  googleModeHint.hidden = false;
  googleModeHint.textContent =
    "Tu cuenta de Google ya fue verificada. Ahora valida la cedula para completar el registro.";
}

// Desactiva modo Google (registro normal)
function disableGoogleMode() {
  emailInput.readOnly = false;
  emailInput.required = true;
  emailGroup.hidden = false;
  emailGroup.style.display = "";

  passwordInput.required = true;
  passwordGroup.hidden = false;
  passwordGroup.style.display = "";

  // En registro normal el telefono si es obligatorio.
  phoneInput.required = true;
  phoneGroup.hidden = false;
  phoneGroup.style.display = "";

  googleModeHint.hidden = true;
  btnRegister.textContent = getRegisterButtonText();
}

// Si ya venimos de Google, activa ese modo automáticamente
if (isGoogleMode()) {
  enableGoogleMode();
} else {
  disableGoogleMode();
}

// Evento cuando se escribe en la cédula
cedulaInput.addEventListener("input", () => {
  // Solo permite números y máximo 9 dígitos
  const onlyDigits = cedulaInput.value.replace(/\D/g, "").slice(0, 9);

  if (cedulaInput.value !== onlyDigits) {
    cedulaInput.value = onlyDigits;
  }

  // Si la cédula cambia, se limpian los datos validados
  if (validatedCedula && validatedCedula !== onlyDigits) {
    clearPadronFields();
  }
});

// Evento cuando se escribe en el telefono
phoneInput.addEventListener("input", () => {
  // Solo permite números y máximo 8 dígitos.
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 8);
});

// Botón para validar cédula contra el API (padrón)
btnValidateCedula.addEventListener("click", async () => {
  const cedula = cedulaInput.value.trim();

  // Validación básica
  if (!isValidCedula(cedula)) {
    clearPadronFields();
    return setMsg("La cedula debe tener exactamente 9 digitos", "err");
  }

  btnValidateCedula.disabled = true;
  btnValidateCedula.textContent = "Validando...";

  try {
    // Llama al backend que consulta el padrón
    const resp = await fetch(
      `${API_BASE}/api/users/validate-cedula?cedula=${encodeURIComponent(cedula)}`
    );

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      clearPadronFields();
      return setMsg(data.message || "No se pudo validar la cedula", "err");
    }

    // Autocompleta datos desde el padrón
    nameInput.value = data.nombre || "";
    apellidoPaternoInput.value = data.apellidoPaterno || "";
    apellidoMaternoInput.value = data.apellidoMaterno || "";

    validatedCedula = `${data.cedula || cedula}`.trim();

    setMsg("Cedula validada correctamente.", "ok");
  } catch (_error) {
    clearPadronFields();
    setMsg("No se pudo conectar con el servidor para validar la cedula", "err");
  } finally {
    btnValidateCedula.disabled = false;
    btnValidateCedula.textContent = "Validar cedula";
  }
});

// Maneja respuesta de Google
async function handleGoogleResponse(response) {
  setMsg("");

  try {
    // Se envía el credential al backend
    const resp = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return setMsg(data.message || "No se pudo continuar con Google", "err");
    }

    // Caso: ya existe → login directo
    if (data.token) {
      clearPendingGoogle();
      saveAuthSession(data);

      setMsg("Login con Google exitoso", "ok");

      setTimeout(() => {
        window.location.href = "./index.html";
      }, 800);

      return;
    }

    // Caso: necesita validar cédula
    if (data.needsCedula) {
      savePendingGoogle(response.credential);

      // Activa modo Google (oculta email/password/telefono)
      enableGoogleMode();

      setMsg("Cuenta de Google verificada. Ahora valida la cedula para registrarte.", "ok");
    }
  } catch (error) {
    console.error("Error en Google register:", error);
    setMsg("No se pudo conectar con el servidor", "err");
  }
}

// Inicializa el botón de Google
function initGoogleRegister() {
  if (GOOGLE_CLIENT_ID === "TU_CLIENT_ID_DE_GOOGLE") {
    setMsg("Falta configurar el Client ID de Google en register.js", "err");
    return;
  }

  if (!window.google?.accounts?.id) {
    setMsg("No se pudo cargar Google Identity Services", "err");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
  });

  google.accounts.id.renderButton(googleRegisterBtn, {
    theme: "outline",
    size: "large",
    text: "signup_with",
    shape: "rectangular",
    locale: "es",
  });
}

// Evento de submit del formulario
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Obtiene datos
  const cedula = cedulaInput.value.trim();
  const name = nameInput.value.trim();
  const apellidoPaterno = apellidoPaternoInput.value.trim();
  const apellidoMaterno = apellidoMaternoInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Telefono nacional de 8 digitos. El backend le agrega +506.
  const phone = phoneInput.value.trim();

  // Validaciones
  if (!isValidCedula(cedula)) {
    return setMsg("La cedula debe tener exactamente 9 digitos", "err");
  }

  if (validatedCedula !== cedula) {
    return setMsg("Debes validar la cedula antes de registrarte", "err");
  }

  if (name.length < 2) return setMsg("Nombre muy corto", "err");
  if (apellidoPaterno.length < 2) return setMsg("Apellido paterno muy corto", "err");
  if (apellidoMaterno.length < 2) return setMsg("Apellido materno muy corto", "err");

  // En modo normal sí se valida email
  if (!isGoogleMode() && !email.includes("@")) return setMsg("Correo invalido", "err");

  // En modo normal sí se valida contraseña
  if (!isGoogleMode() && password.length < 6) {
    return setMsg("Contrasena minima 6 caracteres", "err");
  }

  // En modo normal el telefono es obligatorio para 2FA.
  if (!isGoogleMode() && !isValidPhone(phone)) {
    return setMsg("El telefono debe tener exactamente 8 digitos. Ejemplo: 86488491", "err");
  }

  btnRegister.disabled = true;
  btnRegister.textContent = "Procesando...";

  try {
    let resp;

    // Registro normal
    if (!isGoogleMode()) {
      resp = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula, email, password, phone }),
      });
    } 
    // Registro con Google (solo cedula + credential)
    else {
      resp = await fetch(`${API_BASE}/api/users/register-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula,
          credential: pendingGoogleCredential,
        }),
      });
    }

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return setMsg(data.message || "Error en registro", "err");
    }

    // Si el registro es normal, no hace login directo.
    // Solo muestra mensaje y manda al login para que luego revise el correo.
    if (!isGoogleMode()) {
      // Muestra el mensaje del backend o uno por defecto.
      setMsg(data.message || "Registro exitoso. Revisa tu correo para activar la cuenta.", "ok");

      // Guarda el correo para mejorar la experiencia en login.
      sessionStorage.setItem("lastEmail", email);

      // Redirige al login después de un pequeño tiempo.
      setTimeout(() => {
        // Envía al usuario a la pantalla de login.
        window.location.href = "./login.html";
      }, 1500);
    }
    // Registro con Google → login directo
    else {
      clearPendingGoogle();
      saveAuthSession(data);

      setMsg("Registro con Google exitoso", "ok");

      setTimeout(() => {
        window.location.href = "./index.html";
      }, 800);
    }
  } catch (_error) {
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    btnRegister.disabled = false;
    btnRegister.textContent = getRegisterButtonText();
  }
});

// Inicializa Google
initGoogleRegister();