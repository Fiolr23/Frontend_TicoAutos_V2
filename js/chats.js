// Redirige al login si el usuario no está autenticado.
if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

// Activa la navegación general del sistema.
window.TicoAutos.bindNavigation();

const buyerChatsList = document.getElementById("buyerChatsList");
const ownerChatsList = document.getElementById("ownerChatsList");

// Genera el HTML de un item de la lista de chats.
const renderChatCard = (chat) => {
  const vehicle = chat.vehicle || {};
  const otherUser = chat.otherUser || {};

  // Construye nombre completo y nombre del vehículo.
  const fullName = `${otherUser.name || ""} ${otherUser.lastname || ""}`.trim();
  const vehicleName = `${vehicle.brand || "Vehiculo"} ${vehicle.model || ""}`.trim();

  return `
    <a class="chat-list-item" href="./chat.html?conversationId=${chat._id}">
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

// Renderiza una sección de chats dentro de un contenedor.
const renderChatSection = (chats, container, emptyMessage) => {
  if (!chats.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = `<div class="chat-list">${chats.map(renderChatCard).join("")}</div>`;
};

// Carga la bandeja de chats desde el backend.
const loadChats = async () => {
  // Muestra estado de carga inicial.
  buyerChatsList.innerHTML = '<div class="empty-state">Cargando tus chats...</div>';
  ownerChatsList.innerHTML = '<div class="empty-state">Cargando chats de tus vehiculos...</div>';

  try {
    const response = await fetch(`${window.TicoAutos.API_BASE}/api/questions/chats`, {
      headers: window.TicoAutos.getAuthHeaders(),
    });

    const data = await response.json().catch(() => ({}));

    // Manejo de error si la respuesta no es correcta.
    if (!response.ok) {
      throw new Error(data.message || "No fue posible cargar la bandeja de chats.");
    }

    const results = data.results || [];

    // Separa los chats donde el usuario es comprador o propietario.
    const buyerChats = results.filter((chat) => !chat.isOwner);
    const ownerChats = results.filter((chat) => chat.isOwner);

    // Renderiza ambas secciones.
    renderChatSection(buyerChats, buyerChatsList, "Todavia no has iniciado conversaciones.");
    renderChatSection(ownerChats, ownerChatsList, "Todavia no has recibido consultas.");
  } catch (error) {
    console.error(error);

    // Muestra mensajes de error en caso de fallo.
    buyerChatsList.innerHTML = '<div class="empty-state">No fue posible cargar tus chats.</div>';
    ownerChatsList.innerHTML = '<div class="empty-state">No fue posible cargar los chats de tus vehiculos.</div>';
  }
};

loadChats();