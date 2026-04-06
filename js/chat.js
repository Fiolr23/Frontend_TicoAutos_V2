// Redirige al login si el usuario no está autenticado.
if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

// Activa la navegación general del sistema.
window.TicoAutos.bindNavigation();

// Obtiene parámetros desde la URL.
const params = new URLSearchParams(window.location.search);
let conversationId = params.get("conversationId");
let vehicleId = params.get("vehicleId") || params.get("id");

const chatHeader = document.getElementById("chatHeader");
const chatThread = document.getElementById("chatThread");

// Formatea fechas al formato local de Costa Rica.
const formatDate = (value) => {
  if (!value) return "Sin registro";

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

// Muestra mensajes de estado en el DOM.
const setMessage = (element, text, type = "") => {
  if (!element) return;
  element.textContent = text;
  element.className = `msg ${type}`.trim();
};

// Actualiza la URL del navegador con el conversationId.
const updateUrl = () => {
  if (!conversationId) return;

  const url = new URL(window.location.href);
  url.searchParams.delete("id");
  url.searchParams.delete("vehicleId");
  url.searchParams.set("conversationId", conversationId);
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
};

// Genera una burbuja de mensaje (pregunta o respuesta).
const bubble = (text, date, direction, status = "") => `
  <div class="chat-message ${direction}">
    <div class="chat-bubble">
      <p class="chat-text">${window.TicoAutos.escapeHtml(text)}</p>
      <div class="chat-meta">
        <span>${formatDate(date)}</span>
        ${status ? `<span>${window.TicoAutos.escapeHtml(status)}</span>` : ""}
      </div>
    </div>
  </div>
`;

// Renderiza todos los mensajes del chat.
const renderMessages = (questions, isOwner) => {
  if (!questions.length) {
    return '<div class="empty-state">Todavia no existen mensajes en este chat.</div>';
  }

  return questions
    .map((question) => {
      // Burbuja de la pregunta.
      const questionHtml = bubble(
        question.questionText,
        question.askedAt,
        isOwner ? "incoming" : "outgoing",
        question.status === "pending" ? "Pendiente" : "Respondida"
      );

      // Burbuja de la respuesta (si existe).
      const answerHtml =
        question.status === "answered"
          ? bubble(
              question.answerText,
              question.answeredAt,
              isOwner ? "outgoing" : "incoming"
            )
          : "";

      return `<article class="chat-pair">${questionHtml}${answerHtml}</article>`;
    })
    .join("");
};

// Determina el endpoint según el tipo de chat.
const getEndpoint = () => {
  if (conversationId) {
    return `${window.TicoAutos.API_BASE}/api/questions/conversations/${conversationId}/messages`;
  }

  if (vehicleId) {
    return `${window.TicoAutos.API_BASE}/api/questions/vehicle/${vehicleId}/conversation`;
  }

  return null;
};

// Carga la información completa del chat.
const loadChat = async () => {
  const endpoint = getEndpoint();

  // Si no hay endpoint válido, muestra error.
  if (!endpoint) {
    chatHeader.innerHTML = '<div class="empty-state">No fue posible identificar el chat solicitado.</div>';
    chatThread.innerHTML = "";
    return;
  }

  chatHeader.innerHTML = '<div class="empty-state">Cargando chat...</div>';
  chatThread.innerHTML = "";

  try {
    const response = await fetch(endpoint, {
      headers: window.TicoAutos.getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "No fue posible cargar el chat.");
    }

    const conversation = data.conversation || null;
    const vehicle = data.vehicle || {};
    const otherUser = data.otherUser || {};
    const isOwner = Boolean(data.isOwner);
    const questions = data.results || [];

    // Actualiza el conversationId si viene del backend.
    if (conversation?._id) {
      conversationId = conversation._id;
      updateUrl();
    }

    // Actualiza el vehicleId si viene del backend.
    if (vehicle?._id) {
      vehicleId = vehicle._id;
    }

    const userName = `${otherUser.name || ""} ${otherUser.lastname || ""}`.trim() || "Usuario";
    const vehicleName = `${vehicle.brand || "Vehiculo"} ${vehicle.model || ""}`.trim();

    // Busca la última pregunta pendiente.
    const pendingQuestion = [...questions].reverse().find((question) => question.status === "pending");

    // Renderiza el encabezado del chat.
    chatHeader.innerHTML = `
      <div class="chat-topbar">
        <div class="chat-topbar-avatar">${userName.charAt(0).toUpperCase()}</div>
        <div class="chat-topbar-info">
          <h1>${window.TicoAutos.escapeHtml(userName)}</h1>
          <p>${window.TicoAutos.escapeHtml(vehicleName)}</p>
        </div>
        <div class="inline-actions">
          ${
            conversationId
              ? `<a class="btn btn-outline" href="./history.html?conversationId=${conversationId}">Historial</a>`
              : ""
          }
          <a class="btn btn-outline" href="./chats.html">Volver</a>
        </div>
      </div>
    `;

    // Renderiza mensajes y formulario según el rol del usuario.
    chatThread.innerHTML = `
      <div class="chat-shell">
        <div class="chat-messages">
          ${renderMessages(questions, isOwner)}
        </div>
        <div class="chat-composer-wrap">
          ${
            isOwner
              ? pendingQuestion
                ? `
                  <form id="chatForm" class="chat-composer" data-mode="answer" data-question-id="${pendingQuestion._id}">
                    <textarea name="text" rows="2" placeholder="Escribe tu respuesta..." required></textarea>
                    <button class="btn btn-primary" type="submit">Enviar</button>
                    <p class="msg" id="chatMsg" aria-live="polite"></p>
                  </form>
                `
                : `<div class="chat-composer-disabled">No hay preguntas pendientes por responder.</div>`
              : `
                <form id="chatForm" class="chat-composer" data-mode="question">
                  <textarea
                    name="text"
                    rows="2"
                    placeholder="Escribe tu mensaje..."
                    ${data.canAsk ? "" : "disabled"}
                    required
                  ></textarea>
                  <button class="btn btn-primary" type="submit" ${data.canAsk ? "" : "disabled"}>
                    Enviar
                  </button>
                  <p class="msg" id="chatMsg" aria-live="polite"></p>
                </form>
                ${
                  data.canAsk
                    ? ""
                    : '<div class="chat-composer-disabled">Debes esperar la respuesta del propietario antes de volver a preguntar.</div>'
                }
              `
          }
        </div>
      </div>
    `;

    const form = document.getElementById("chatForm");
    const msg = document.getElementById("chatMsg");

    if (!form) return;

    // Maneja el envío de mensajes (pregunta o respuesta).
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const text = `${formData.get("text") || ""}`.trim();

      if (!text) {
        setMessage(msg, "Debes escribir un mensaje.", "err");
        return;
      }

      try {
        const isAnswer = form.dataset.mode === "answer";

        // Define endpoint y cuerpo según el tipo de mensaje.
        const url = isAnswer
          ? `${window.TicoAutos.API_BASE}/api/questions/${form.dataset.questionId}/answer`
          : `${window.TicoAutos.API_BASE}/api/questions/vehicle/${vehicleId}`;

        const body = isAnswer ? { answerText: text } : { questionText: text };

        const sendResponse = await fetch(url, {
          method: "POST",
          headers: {
            ...window.TicoAutos.getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const sendData = await sendResponse.json().catch(() => ({}));

        if (!sendResponse.ok) {
          throw new Error(sendData.message || "No fue posible enviar el mensaje.");
        }

        // Actualiza el conversationId si se crea una nueva conversación.
        if (sendData.conversationId) {
          conversationId = sendData.conversationId;
          updateUrl();
        }

        // Recarga el chat para reflejar cambios.
        await loadChat();
      } catch (error) {
        setMessage(msg, error.message || "No fue posible enviar el mensaje.", "err");
      }
    });
  } catch (error) {
    console.error(error);
    chatHeader.innerHTML = '<div class="empty-state">No fue posible cargar el chat solicitado.</div>';
    chatThread.innerHTML = "";
  }
};

loadChat();