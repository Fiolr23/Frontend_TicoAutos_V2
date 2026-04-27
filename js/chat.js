if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

window.TicoAutos.bindNavigation();

const params = new URLSearchParams(window.location.search);
let conversationId = params.get("conversationId");
let vehicleId = params.get("vehicleId") || params.get("id");

const chatHeader = document.getElementById("chatHeader");
const chatThread = document.getElementById("chatThread");
const CONVERSATION_QUERY = `
  query GetConversation($id: ID!) {
    conversation(id: $id) {
      id
      isOwner
      canAsk
      vehicle {
        id
        brand
        model
      }
      otherUser {
        id
        name
        lastname
      }
      results {
        id
        questionText
        answerText
        status
        askedAt
        answeredAt
      }
    }
  }
`;
const VEHICLE_CONVERSATION_QUERY = `
  query GetVehicleConversation($vehicleId: ID!) {
    vehicleConversation(vehicleId: $vehicleId) {
      id
      isOwner
      canAsk
      vehicle {
        id
        brand
        model
      }
      otherUser {
        id
        name
        lastname
      }
      results {
        id
        questionText
        answerText
        status
        askedAt
        answeredAt
      }
    }
  }
`;

const formatDate = (value) => {
  if (!value) return "Sin registro";

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const setMessage = (element, text, type = "") => {
  if (!element) return;
  element.textContent = text;
  element.className = `msg ${type}`.trim();
};

// Actualiza la URL cuando ya existe una conversacion real.
const updateUrl = () => {
  if (!conversationId) return;

  const url = new URL(window.location.href);
  url.searchParams.delete("id");
  url.searchParams.delete("vehicleId");
  url.searchParams.set("conversationId", conversationId);
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
};

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

const renderMessages = (questions, isOwner) => {
  if (!questions.length) {
    return '<div class="empty-state">Todavia no existen mensajes en este chat.</div>';
  }

  return questions
    .map((question) => {
      const questionHtml = bubble(
        question.questionText,
        question.askedAt,
        isOwner ? "incoming" : "outgoing",
        question.status === "pending" ? "Pendiente" : "Respondida"
      );

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

// Carga la informacion del chat usando GraphQL.
const loadChat = async () => {
  if (!conversationId && !vehicleId) {
    chatHeader.innerHTML = '<div class="empty-state">No fue posible identificar el chat solicitado.</div>';
    chatThread.innerHTML = "";
    return;
  }

  chatHeader.innerHTML = '<div class="empty-state">Cargando chat...</div>';
  chatThread.innerHTML = "";

  try {
    const data = conversationId
      ? await window.TicoAutos.graphqlRequest(
          CONVERSATION_QUERY,
          { id: conversationId },
          { auth: true }
        )
      : await window.TicoAutos.graphqlRequest(
          VEHICLE_CONVERSATION_QUERY,
          { vehicleId },
          { auth: true }
        );

    const conversation = conversationId ? data.conversation : data.vehicleConversation;
    if (!conversation) {
      throw new Error("No fue posible cargar el chat.");
    }

    const vehicle = conversation.vehicle || {};
    const otherUser = conversation.otherUser || {};
    const isOwner = Boolean(conversation.isOwner);
    const questions = conversation.results || [];

    if (conversation.id) {
      conversationId = conversation.id;
      updateUrl();
    }

    if (vehicle.id) {
      vehicleId = vehicle.id;
    }

    const userName = `${otherUser.name || ""} ${otherUser.lastname || ""}`.trim() || "Usuario";
    const vehicleName = `${vehicle.brand || "Vehiculo"} ${vehicle.model || ""}`.trim();
    const pendingQuestion = [...questions].reverse().find((question) => question.status === "pending");

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
                  <form id="chatForm" class="chat-composer" data-mode="answer" data-question-id="${pendingQuestion.id}">
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
                    ${conversation.canAsk ? "" : "disabled"}
                    required
                  ></textarea>
                  <button class="btn btn-primary" type="submit" ${conversation.canAsk ? "" : "disabled"}>
                    Enviar
                  </button>
                  <p class="msg" id="chatMsg" aria-live="polite"></p>
                </form>
                ${
                  conversation.canAsk
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

    // Los envios siguen usando REST.
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

        if (sendData.conversationId) {
          conversationId = sendData.conversationId;
          updateUrl();
        }

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
