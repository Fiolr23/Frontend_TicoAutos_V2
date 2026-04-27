if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

window.TicoAutos.bindNavigation();

const params = new URLSearchParams(window.location.search);
const conversationId = params.get("conversationId");

const historyHeader = document.getElementById("historyHeader");
const historyContent = document.getElementById("historyContent");
const CONVERSATION_QUERY = `
  query GetConversation($id: ID!) {
    conversation(id: $id) {
      id
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
        askedByUser {
          id
          name
          lastname
        }
        answeredByUser {
          id
          name
          lastname
        }
      }
    }
  }
`;

const formatDate = (value) => {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const renderHistoryItem = (question) => `
  <article class="form-card">
    <p><strong>Pregunta:</strong> ${window.TicoAutos.escapeHtml(question.questionText)}</p>
    <p class="muted">
      Interesado:
      ${window.TicoAutos.escapeHtml(question.askedByUser?.name || "")}
      ${window.TicoAutos.escapeHtml(question.askedByUser?.lastname || "")}
    </p>
    <p class="muted">Fecha de pregunta: ${formatDate(question.askedAt)}</p>

    ${
      question.status === "answered"
        ? `
          <p><strong>Respuesta:</strong> ${window.TicoAutos.escapeHtml(question.answerText)}</p>
          <p class="muted">
            Propietario:
            ${window.TicoAutos.escapeHtml(question.answeredByUser?.name || "")}
            ${window.TicoAutos.escapeHtml(question.answeredByUser?.lastname || "")}
          </p>
          <p class="muted">Fecha de respuesta: ${formatDate(question.answeredAt)}</p>
        `
        : '<p class="muted">Estado actual: Pendiente de respuesta.</p>'
    }
  </article>
`;

// Carga el historial desde /graphql.
const loadHistory = async () => {
  if (!conversationId) {
    historyHeader.innerHTML = '<div class="empty-state">No fue posible identificar el historial solicitado.</div>';
    historyContent.innerHTML = "";
    return;
  }

  historyHeader.innerHTML = '<div class="empty-state">Cargando historial...</div>';
  historyContent.innerHTML = "";

  try {
    const data = await window.TicoAutos.graphqlRequest(
      CONVERSATION_QUERY,
      { id: conversationId },
      { auth: true }
    );
    const conversation = data.conversation;

    if (!conversation) {
      throw new Error("No fue posible cargar el historial de la conversacion.");
    }

    const vehicle = conversation.vehicle || {};
    const otherUser = conversation.otherUser || {};
    const questions = conversation.results || [];

    historyHeader.innerHTML = `
      <div class="section-head">
        <div>
          <h1>Historial de ${window.TicoAutos.escapeHtml(vehicle.brand || "Vehiculo")} ${window.TicoAutos.escapeHtml(vehicle.model || "")}</h1>
          <p class="page-subtitle">
            Conversacion con
            ${window.TicoAutos.escapeHtml(otherUser.name || "")}
            ${window.TicoAutos.escapeHtml(otherUser.lastname || "")}
          </p>
        </div>
        <div class="inline-actions">
          <a class="btn btn-outline" href="./chat.html?conversationId=${conversationId}">Volver al chat</a>
          <a class="btn btn-outline" href="./vehicle.html?id=${vehicle.id}">Ver vehiculo</a>
        </div>
      </div>
    `;

    historyContent.innerHTML = questions.length
      ? questions.map(renderHistoryItem).join("")
      : '<div class="empty-state">Todavia no existen registros para esta conversacion.</div>';
  } catch (error) {
    console.error(error);
    historyHeader.innerHTML = '<div class="empty-state">No fue posible cargar el historial solicitado.</div>';
    historyContent.innerHTML = "";
  }
};

loadHistory();
