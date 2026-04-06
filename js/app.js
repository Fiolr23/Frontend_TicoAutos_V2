const API_BASE = "http://localhost:3000";
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 520'%3E%3Crect width='800' height='520' fill='%230e2433'/%3E%3Cpath d='M145 330h40l38-92h257l56 92h84' fill='none' stroke='%23f4c95d' stroke-width='18' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='250' cy='350' r='34' fill='%23f4c95d'/%3E%3Ccircle cx='542' cy='350' r='34' fill='%23f4c95d'/%3E%3Ctext x='50%25' y='120' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Verdana' font-size='42'%3ETicoAutos%3C/text%3E%3C/svg%3E";

// Formatea montos en colones para mantener una salida consistente.
const formatCurrency = (value) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

// Escapa texto antes de insertarlo dentro de HTML.
const escapeHtml = (value = "") =>
  `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Helpers basicos de sesion.
const getToken = () => sessionStorage.getItem("token");
const getUserId = () => sessionStorage.getItem("userId");
const isAuthenticated = () => Boolean(getToken());

// Guarda el id del usuario para no pedirlo en cada vista.
const setSessionUser = (user) => {
  const userId = user?.id || user?._id;
  if (userId) {
    sessionStorage.setItem("userId", userId);
  }
};

// Agrega el token a la peticion cuando existe.
const getAuthHeaders = (headers = {}) => {
  const token = getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

// Sincroniza el usuario autenticado usando GET /api/auth/me.
const syncSessionUser = async () => {
  if (!getToken()) {
    return null;
  }

  if (getUserId()) {
    return getUserId();
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return null;
    }

    setSessionUser(data.user);
    return getUserId();
  } catch (_error) {
    return null;
  }
};

// Normaliza la url de una imagen para que siempre pueda mostrarse.
const buildImageUrl = (imagePath) => {
  if (!imagePath) {
    return PLACEHOLDER_IMAGE;
  }

  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
    return imagePath;
  }

  return `${API_BASE}${imagePath}`;
};

const getVehicleImage = (vehicle) => buildImageUrl(vehicle.images?.[0]);

// Recorta textos largos para que las tarjetas no se deformen.
const truncateText = (value = "", maxLength = 80) => {
  const text = `${value}`.trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trim()}...`;
};

// Construye el enlace publico al detalle de un vehiculo.
const getVehicleDetailUrl = (vehicleId) => {
  const detailPath = window.location.pathname.replace(/index\.html$/, "vehicle.html");
  return `${window.location.origin}${detailPath}?id=${vehicleId}`;
};

// Permite compartir la url del vehiculo desde el catalogo o detalle.
const shareVehicleLink = async (vehicle) => {
  const shareUrl = getVehicleDetailUrl(vehicle._id);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      window.alert("Se copio el link del vehiculo.");
      return;
    }

    window.prompt("Copia este link del vehiculo:", shareUrl);
  } catch (error) {
    console.error("No se pudo copiar el link del vehiculo:", error);
    window.prompt("Copia este link del vehiculo:", shareUrl);
  }
};

// Cierra sesion en backend y limpia la sesion local.
const logout = async () => {
  const token = getToken();

  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error en logout:", error);
    }
  }

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("lastEmail");
  window.location.href = "./login.html";
};

// Muestra u oculta elementos segun el estado de autenticacion.
const bindNavigation = () => {
  const authOnly = document.querySelectorAll("[data-auth='private']");
  const guestOnly = document.querySelectorAll("[data-auth='guest']");
  const userLabel = document.querySelector("[data-user-label]");
  const logoutButtons = document.querySelectorAll("[data-logout]");

  authOnly.forEach((element) => {
    element.hidden = !isAuthenticated();
  });

  guestOnly.forEach((element) => {
    element.hidden = isAuthenticated();
  });

  if (userLabel) {
    userLabel.textContent = isAuthenticated() ? "Mi cuenta" : "Invitado";
  }

  logoutButtons.forEach((button) => {
    button.addEventListener("click", logout);
  });
};

// Crea la tarjeta usada en "Mis vehiculos".
const createVehicleCard = (vehicle, options = {}) => {
  const {
    showOwner = true,
    showActions = false,
    onShare,
    onEdit,
    onDelete,
    onSold,
  } = options;
  const card = document.createElement("article");
  card.className = "vehicle-card";
  const statusLabel = vehicle.status === "vendido" ? "Vendido" : "Disponible";
  const statusClass = vehicle.status === "vendido" ? "sold" : "available";
  const description = truncateText(vehicle.description || "Vehiculo disponible para consulta.");

  const ownerName = vehicle.owner
    ? `${vehicle.owner.name} ${vehicle.owner.lastname}`
    : vehicle.userId
      ? `${vehicle.userId.name} ${vehicle.userId.lastname}`
      : "Sin propietario";

  card.innerHTML = `
    <a class="vehicle-card-media" href="./vehicle.html?id=${vehicle._id}">
      <img src="${getVehicleImage(vehicle)}" alt="${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}" />
      <span class="vehicle-badge ${vehicle.status === "vendido" ? "sold" : ""}">
        ${statusLabel}
      </span>
    </a>
    <div class="vehicle-card-body">
      <div class="vehicle-card-top">
        <div>
          <p class="vehicle-kicker">${escapeHtml(vehicle.brand)}</p>
          <h3>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</h3>
        </div>
        <strong>${formatCurrency(vehicle.price)}</strong>
      </div>
      <div class="vehicle-meta-pills">
        <span class="vehicle-pill">${vehicle.year}</span>
        <span class="vehicle-pill">${escapeHtml(vehicle.color)}</span>
        <span class="vehicle-pill">${escapeHtml(vehicle.location || "Costa Rica")}</span>
      </div>
      ${
        showOwner
          ? `<p class="vehicle-owner">Publicado por ${escapeHtml(ownerName)}</p>`
          : ""
      }
      <p class="vehicle-description">${escapeHtml(description)}</p>
      <div class="vehicle-card-actions">
        <a class="btn btn-outline" href="./vehicle.html?id=${vehicle._id}">Ver detalle</a>
      </div>
    </div>
  `;

  // Boton opcional para compartir el anuncio.
  if (onShare) {
    const shareButton = document.createElement("button");
    shareButton.className = "btn btn-muted";
    shareButton.type = "button";
    shareButton.textContent = "Compartir";
    shareButton.addEventListener("click", () => onShare(vehicle));
    card.querySelector(".vehicle-card-actions").append(shareButton);
  }

  // Acciones del propietario: editar, cambiar estado y eliminar.
  if (showActions) {
    const actions = document.createElement("div");
    actions.className = "vehicle-admin-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn btn-primary";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => onEdit?.(vehicle));

    const soldButton = document.createElement("button");
    soldButton.className = "btn btn-muted";
    soldButton.textContent = vehicle.status === "vendido" ? "Marcar disponible" : "Marcar vendido";
    soldButton.addEventListener("click", () => onSold?.(vehicle));

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => onDelete?.(vehicle));

    actions.append(editButton, soldButton, deleteButton);
    card.querySelector(".vehicle-card-actions").append(actions);
  }

  return card;
};

// Crea la tarjeta del catalogo principal.
const createCatalogVehicleCard = (vehicle, options = {}) => {
  const {
    isOwner = false,
    onEdit,
    onDelete,
    onShare,
    onToggleStatus,
  } = options;

  const card = document.createElement("article");
  card.className = "catalog-card";
  const statusLabel = vehicle.status === "vendido" ? "Vendido" : "Disponible";
  const statusClass = vehicle.status === "vendido" ? "sold" : "available";
  const description = truncateText(vehicle.description || "Vehiculo disponible para consulta.", 68);
  const ownerActions = isOwner
    ? `
      <div class="catalog-owner-actions">
        <button class="btn btn-primary" type="button" data-catalog-edit>Editar</button>
        <button class="btn btn-muted" type="button" data-catalog-status>
          ${vehicle.status === "vendido" ? "Marcar disponible" : "Marcar vendido"}
        </button>
      </div>
      <div class="catalog-danger-row">
        <button class="btn btn-danger" type="button" data-catalog-delete>Eliminar</button>
      </div>
    `
    : `
      <div class="catalog-buyer-actions">
        <button class="btn btn-muted" type="button" data-catalog-share>Compartir</button>
      </div>
    `;

  card.innerHTML = `
    <a class="catalog-card-media" href="./vehicle.html?id=${vehicle._id}">
      <img src="${getVehicleImage(vehicle)}" alt="${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}" />
      <span class="catalog-status ${statusClass}">${statusLabel}</span>
    </a>
    <div class="catalog-card-body">
      <div class="catalog-card-head">
        <div>
          <p class="catalog-brand">${escapeHtml(vehicle.brand)}</p>
          <h3>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</h3>
        </div>
        <strong>${formatCurrency(vehicle.price)}</strong>
      </div>
      <div class="catalog-specs">
        <span class="catalog-chip">${vehicle.year}</span>
        <span class="catalog-chip">${escapeHtml(vehicle.color)}</span>
        <span class="catalog-chip">${escapeHtml(vehicle.location || "Costa Rica")}</span>
      </div>
      <p class="catalog-description">${escapeHtml(description)}</p>
      <div class="catalog-detail-action">
        <a class="btn btn-outline" href="./vehicle.html?id=${vehicle._id}">Ver detalle</a>
      </div>
      ${ownerActions}
    </div>
  `;

  // Si el usuario es el propietario se habilitan acciones administrativas.
  if (isOwner) {
    card.querySelector("[data-catalog-edit]")?.addEventListener("click", () => onEdit?.(vehicle));
    card.querySelector("[data-catalog-status]")?.addEventListener("click", () => onToggleStatus?.(vehicle));
    card.querySelector("[data-catalog-delete]")?.addEventListener("click", () => onDelete?.(vehicle));
  } else {
    // Los visitantes solo pueden compartir el anuncio.
    card.querySelector("[data-catalog-share]")?.addEventListener("click", () => onShare?.(vehicle));
  }

  return card;
};

// API publica de utilidades compartidas por el frontend.
window.TicoAutos = {
  API_BASE,
  bindNavigation,
  buildImageUrl,
  createCatalogVehicleCard,
  createVehicleCard,
  escapeHtml,
  formatCurrency,
  getAuthHeaders,
  getToken,
  getUserId,
  isAuthenticated,
  logout,
  setSessionUser,
  shareVehicleLink,
  syncSessionUser,
  truncateText,
};
