// URL base del backend donde están los endpoints de autenticación
const API_BASE = "http://localhost:3000";

// Client ID de Google necesario para usar Google Identity Services
const GOOGLE_CLIENT_ID = "270207719324-1bpt318s19001riv71k658umgigqkji2.apps.googleusercontent.com";

// Referencias a elementos del DOM (formulario, mensajes, botones)
const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const btn = document.getElementById("btnLogin");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// Clave para guardar temporalmente el token de Google cuando falta validar cédula
const PENDING_GOOGLE_CREDENTIAL_KEY = "pendingGoogleCredential";

// Función para mostrar mensajes en pantalla (errores o éxito)
function setMsg(text, type) {
  msg.textContent = text;
  msg.className = `msg ${type || ""}`.trim();
}

// Guarda la sesión del usuario en el navegador (token + userId)
function saveAuthSession(data) {
  sessionStorage.setItem("token", data.token);

  // Guardamos el ID del usuario si viene en la respuesta
  if (data.user?.id) {
    sessionStorage.setItem("userId", data.user.id);
  }
}

// Limpia cualquier intento previo de login con Google pendiente
function clearPendingGoogle() {
  sessionStorage.removeItem(PENDING_GOOGLE_CREDENTIAL_KEY);
}

// Guarda temporalmente el credential de Google cuando falta completar la cédula
function savePendingGoogle(credential) {
  sessionStorage.setItem(PENDING_GOOGLE_CREDENTIAL_KEY, credential);
}

// Recupera el último correo usado (mejora de experiencia de usuario)
const lastEmail = sessionStorage.getItem("lastEmail");
if (lastEmail) {
  document.getElementById("email").value = lastEmail;
}

// Maneja la respuesta que devuelve Google después de autenticarse
async function handleGoogleResponse(response) {
  setMsg("");

  try {
    // Se envía el credential de Google al backend para validarlo
    const resp = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    const data = await resp.json().catch(() => ({}));

    // Si el backend responde con error
    if (!resp.ok) {
      return setMsg(data.message || "No se pudo iniciar con Google", "err");
    }

    // Caso 1: Login completo con Google (usuario ya existía y tenía cédula)
    if (data.token) {
      clearPendingGoogle(); // limpiamos cualquier estado pendiente
      saveAuthSession(data); // guardamos sesión

      setMsg("Login con Google exitoso", "ok");

      // Redirige al home
      setTimeout(() => {
        window.location.href = "./index.html";
      }, 800);

      return;
    }

    // Caso 2: Usuario nuevo con Google → necesita validar cédula
    if (data.needsCedula) {
      // Guardamos el credential de Google temporalmente
      savePendingGoogle(response.credential);

      setMsg("Tu cuenta de Google fue verificada. Ahora debes validar la cedula.", "ok");

      // Redirige al registro para completar solo la cédula
      setTimeout(() => {
        window.location.href = "./register.html";
      }, 800);
    }
  } catch (error) {
    console.error("Error en login con Google:", error);
    setMsg("No se pudo conectar con el servidor", "err");
  }
}

// Inicializa el botón de Google Login usando Google Identity Services
function initGoogleLogin() {
  // Validación: asegurarse de que el Client ID esté configurado
  if (GOOGLE_CLIENT_ID === "TU_CLIENT_ID_DE_GOOGLE") {
    setMsg("Falta configurar el Client ID de Google en login.js", "err");
    return;
  }

  // Verifica que la librería de Google se haya cargado correctamente
  if (!window.google?.accounts?.id) {
    setMsg("No se pudo cargar Google Identity Services", "err");
    return;
  }

  // Inicializa Google con el Client ID y el callback
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse, // función que se ejecuta al autenticarse
  });

  // Renderiza el botón de Google en el frontend
  google.accounts.id.renderButton(googleLoginBtn, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    locale: "es",
  });
}

// Evento del formulario de login tradicional (correo + contraseña)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("");

  // Obtiene los datos del formulario
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Validaciones básicas
  if (!email.includes("@")) return setMsg("Correo invalido", "err");
  if (password.length < 6) return setMsg("Contrasena minima 6 caracteres", "err");

  // Desactiva botón mientras se procesa
  btn.disabled = true;
  btn.textContent = "Ingresando...";

  try {
    // Petición al backend para login normal
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await resp.json().catch(() => ({}));

    // Manejo de error
    if (!resp.ok) return setMsg(data.message || "Error en login", "err");

    // Limpia estado de Google por si acaso
    clearPendingGoogle();

    // Guarda sesión
    saveAuthSession(data);

    setMsg("Login exitoso", "ok");

    // Redirección al home
    setTimeout(() => {
      window.location.href = "./index.html";
    }, 800);
  } catch (error) {
    console.error(error);
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    // Reactiva botón
    btn.disabled = false;
    btn.textContent = "Iniciar sesion";
  }
});

// Inicializa Google Login al cargar la página
initGoogleLogin();