// URL base del backend donde están los endpoints de autenticación
const API_BASE = "http://localhost:3000";

// Client ID de Google necesario para usar Google Identity Services
const GOOGLE_CLIENT_ID = "768296011477-csncaoc4p90t2ra4b3kjtmts59n1o68r.apps.googleusercontent.com";

// Referencias a elementos del DOM
const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const btn = document.getElementById("btnLogin");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// Elementos del formulario 2FA.
const twoFactorForm = document.getElementById("twoFactorForm");
const twoFactorCodeInput = document.getElementById("twoFactorCode");
const btnVerify2FA = document.getElementById("btnVerify2FA");
const btnBackLogin = document.getElementById("btnBackLogin");

// Guarda temporalmente el usuario que esta esperando 2FA.
let pendingTwoFactorUserId = "";

// Clave para guardar temporalmente el token de Google cuando falta validar cédula
const PENDING_GOOGLE_CREDENTIAL_KEY = "pendingGoogleCredential";

// Asegura que al inicio solo se vea el login normal.
form.style.display = "grid";
twoFactorForm.style.display = "none";

// Función para mostrar mensajes en pantalla
function setMsg(text, type) {
  msg.textContent = text;
  msg.className = `msg ${type || ""}`.trim();
}

function showTwoFactorForm(userId) {
  // Guarda el usuario pendiente y muestra solo el formulario 2FA.
  pendingTwoFactorUserId = userId;
  form.style.display = "none";
  twoFactorForm.style.display = "grid";
  twoFactorCodeInput.value = "";
  twoFactorCodeInput.focus();
}

function showLoginForm() {
  // Cancela el intento 2FA y vuelve al login normal.
  pendingTwoFactorUserId = "";
  twoFactorForm.style.display = "none";
  form.style.display = "grid";
}

// Muestra mensajes cuando el usuario vuelve desde el link de verificacion
function showVerificationMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const verified = params.get("verified");
  const reason = params.get("reason");

  if (verified === "1") {
    setMsg("Correo verificado correctamente. Ya puedes iniciar sesion.", "ok");
  }

  if (verified === "0") {
    let message = "No se pudo verificar el correo.";

    if (reason === "missing") {
      message = "El enlace de verificacion es invalido.";
    } else if (reason === "invalid") {
      message = "El token de verificacion no existe, ya fue usado o no es valido.";
    } else if (reason === "expired") {
      message = "El enlace de verificacion vencio.";
    }

    setMsg(message, "err");
  }

  if (verified) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Guarda la sesión del usuario en el navegador
function saveAuthSession(data) {
  sessionStorage.setItem("token", data.token);

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

// Recupera el último correo usado
const lastEmail = sessionStorage.getItem("lastEmail");
if (lastEmail) {
  document.getElementById("email").value = lastEmail;
}

// Maneja la respuesta que devuelve Google después de autenticarse
async function handleGoogleResponse(response) {
  setMsg("");

  try {
    const resp = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return setMsg(data.message || "No se pudo iniciar con Google", "err");
    }

    // Google sigue entrando directo si el backend devuelve token.
    if (data.token) {
      clearPendingGoogle();
      saveAuthSession(data);

      setMsg("Login con Google exitoso", "ok");

      setTimeout(() => {
        window.location.href = "./index.html";
      }, 800);

      return;
    }

    // Si Google necesita cédula, se manda al registro.
    if (data.needsCedula) {
      savePendingGoogle(response.credential);

      setMsg("Tu cuenta de Google fue verificada. Ahora debes validar la cedula.", "ok");

      setTimeout(() => {
        window.location.href = "./register.html";
      }, 800);
    }
  } catch (error) {
    console.error("Error en login con Google:", error);
    setMsg("No se pudo conectar con el servidor", "err");
  }
}

// Inicializa el botón de Google Login
function initGoogleLogin() {
  if (GOOGLE_CLIENT_ID === "TU_CLIENT_ID_DE_GOOGLE") {
    setMsg("Falta configurar el Client ID de Google en login.js", "err");
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

  google.accounts.id.renderButton(googleLoginBtn, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    locale: "es",
  });
}

// Login tradicional con correo y contraseña
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email.includes("@")) return setMsg("Correo invalido", "err");
  if (password.length < 6) return setMsg("Contrasena minima 6 caracteres", "err");

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

    // Si el backend pide 2FA, se muestra la seccion del codigo.
    if (data.requiresTwoFactor) {
      showTwoFactorForm(data.userId);
      setMsg(data.message || "Codigo enviado por SMS", "ok");
      return;
    }

    clearPendingGoogle();
    saveAuthSession(data);

    setMsg("Login exitoso", "ok");

    setTimeout(() => {
      window.location.href = "./index.html";
    }, 800);
  } catch (error) {
    console.error(error);
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Iniciar sesion";
  }
});

twoFactorCodeInput.addEventListener("input", () => {
  // Permite solo numeros y maximo 6 digitos.
  twoFactorCodeInput.value = twoFactorCodeInput.value.replace(/\D/g, "").slice(0, 6);
});

btnBackLogin.addEventListener("click", () => {
  // Vuelve al login normal sin guardar token.
  showLoginForm();
  setMsg("");
});

twoFactorForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const code = twoFactorCodeInput.value.trim();

  if (!pendingTwoFactorUserId) {
    return setMsg("No hay login pendiente de 2FA", "err");
  }

  if (!/^\d{6}$/.test(code)) {
    return setMsg("El codigo debe tener 6 digitos", "err");
  }

  btnVerify2FA.disabled = true;
  btnVerify2FA.textContent = "Verificando...";

  try {
    const resp = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: pendingTwoFactorUserId,
        code
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return setMsg(data.message || "Codigo incorrecto o vencido", "err");
    }

    clearPendingGoogle();
    saveAuthSession(data);

    setMsg("Login exitoso", "ok");

    setTimeout(() => {
      window.location.href = "./index.html";
    }, 800);
  } catch (error) {
    console.error(error);
    setMsg("No se pudo conectar con el servidor", "err");
  } finally {
    btnVerify2FA.disabled = false;
    btnVerify2FA.textContent = "Verificar codigo";
  }
});

// Revisa si venimos del link de verificacion
showVerificationMessageFromUrl();

// Inicializa Google Login al cargar la página
initGoogleLogin();