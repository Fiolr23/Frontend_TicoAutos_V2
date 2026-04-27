if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

window.TicoAutos.bindNavigation();

const buyerChatsList = document.getElementById("buyerChatsList");
const ownerChatsList = document.getElementById("ownerChatsList");
const CONVERSATIONS_QUERY = `
  query GetConversations {
    conversations {
      id
      isOwner
      hasPendingQuestion
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
    }
  }
`;

// Genera el HTML de un item de la lista de chats.
const renderChatCard = (chat) => {
  const vehicle = chat.vehicle || {};
  const otherUser = chat.otherUser || {};
  const fullName = `${otherUser.name || ""} ${otherUser.lastname || ""}`.trim();
  const vehicleName = `${vehicle.brand || "Vehiculo"} ${vehicle.model || ""}`.trim();

  return `
    <a class="chat-list-item" href="./chat.html?conversationId=${chat.id}">
      <div class="chat-list-avatar">
        ${(fullName || "U").charAt(0).toUpperCase()}
      </div>

      <div class="chat-list-body">
        <div class="chat-list-top">
          <h3>${window.TicoAutos.escapeHtml(fullName || "Usuario")}</h3>
          <span class="chat-status ${chat.hasPendingQuestion ? "pending" : "answered"}">
            ${chat.hasPendingQuestion ? "Pendiente" : "Respondido"}
          </span>
        </div>

        <p class="chat-list-vehicle">
          ${window.TicoAutos.escapeHtml(vehicleName)}
        </p>
      </div>
    </a>
  `;
};

const renderChatSection = (chats, container, emptyMessage) => {
  if (!chats.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = `<div class="chat-list">${chats.map(renderChatCard).join("")}</div>`;
};

// Carga la bandeja desde /graphql.
const loadChats = async () => {
  buyerChatsList.innerHTML = '<div class="empty-state">Cargando tus chats...</div>';
  ownerChatsList.innerHTML = '<div class="empty-state">Cargando chats de tus vehiculos...</div>';

  try {
    const data = await window.TicoAutos.graphqlRequest(
      CONVERSATIONS_QUERY,
      {},
      { auth: true }
    );
    const results = data.conversations || [];
    const buyerChats = results.filter((chat) => !chat.isOwner);
    const ownerChats = results.filter((chat) => chat.isOwner);

    renderChatSection(buyerChats, buyerChatsList, "Todavia no has iniciado conversaciones.");
    renderChatSection(ownerChats, ownerChatsList, "Todavia no has recibido consultas.");
  } catch (error) {
    console.error(error);
    buyerChatsList.innerHTML = '<div class="empty-state">No fue posible cargar tus chats.</div>';
    ownerChatsList.innerHTML = '<div class="empty-state">No fue posible cargar los chats de tus vehiculos.</div>';
  }
};

loadChats();
