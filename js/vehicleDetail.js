// Activa la navegación general del sistema.
window.TicoAutos.bindNavigation();

// Obtiene el id del vehículo desde la URL.
const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id");
const container = document.getElementById("vehicleDetail");
const VEHICLE_QUERY = `
  query GetVehicle($id: ID!) {
    vehicle(id: $id) {
      id
      userId
      brand
      model
      year
      price
      color
      mileage
      transmission
      fuelType
      location
      description
      status
      images
      owner {
        id
        name
        lastname
        email
      }
    }
  }
`;

// Si no existe id de vehículo, muestra un mensaje de error.
if (!vehicleId) {
  container.innerHTML = '<div class="empty-state">No fue posible identificar el vehiculo solicitado.</div>';
}

// Genera el HTML de la galería de imágenes.
const renderGallery = (images) => {
  // Si no hay imágenes, se usa un valor por defecto.
  const validImages = images?.length ? images : [null];

  return `
    <div class="gallery">
      <div class="gallery-main">
        <img
          id="mainVehicleImage"
          src="${window.TicoAutos.buildImageUrl(validImages[0])}"
          alt="Imagen principal del vehiculo"
        />
      </div>
      <div class="gallery-thumbs">
        ${validImages
          .map(
            (image, index) => `
              <button class="gallery-thumb" type="button" data-gallery-image="${index}">
                <img
                  src="${window.TicoAutos.buildImageUrl(image)}"
                  alt="Miniatura ${index + 1}"
                />
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
};

// Vincula los eventos de la galería para cambiar la imagen principal.
const bindGallery = (images) => {
  const validImages = images?.length ? images : [null];
  const mainImage = document.getElementById("mainVehicleImage");

  document.querySelectorAll("[data-gallery-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.galleryImage);
      mainImage.src = window.TicoAutos.buildImageUrl(validImages[index]);
    });
  });
};

// Carga el detalle del vehículo desde el backend.
const loadVehicleDetail = async () => {
  try {
    const data = await window.TicoAutos.graphqlRequest(VEHICLE_QUERY, { id: vehicleId });
    const vehicle = data.vehicle;

    if (!vehicle) {
      throw new Error("No fue posible cargar la informacion del vehiculo.");
    }

    const owner = vehicle.owner || null;
    const realVehicleId = window.TicoAutos.getEntityId(vehicle);

    // Obtiene el usuario actual para determinar si es el propietario.
    const currentUserId = await window.TicoAutos.syncSessionUser();
    const isOwner = currentUserId === (owner?.id || vehicle.userId);

    // Define clase visual según estado del vehículo.
    const statusClass = vehicle.status === "vendido" ? "sold" : "available";

    // Renderiza el detalle completo del vehículo.
    container.innerHTML = `
      <div class="detail-layout">
        <section class="detail-panel">
          ${renderGallery(vehicle.images)}
        </section>

        <aside class="detail-panel">
          <span class="eyebrow">${window.TicoAutos.escapeHtml(vehicle.brand)}</span>
          <h1>${window.TicoAutos.escapeHtml(vehicle.brand)} ${window.TicoAutos.escapeHtml(vehicle.model)}</h1>

          <div class="status-pill ${statusClass}">
            ${vehicle.status === "vendido" ? "Vendido" : "Disponible"}
          </div>

          <p class="detail-price">${window.TicoAutos.formatCurrency(vehicle.price)}</p>
          <p class="page-subtitle">
            ${window.TicoAutos.escapeHtml(vehicle.description || "Publicacion sin descripcion detallada.")}
          </p>

          <div class="spec-grid">
            <div class="spec-item"><span>Ano</span><strong>${vehicle.year}</strong></div>
            <div class="spec-item"><span>Color</span><strong>${window.TicoAutos.escapeHtml(vehicle.color)}</strong></div>
            <div class="spec-item"><span>Kilometraje</span><strong>${vehicle.mileage || 0} km</strong></div>
            <div class="spec-item"><span>Transmision</span><strong>${window.TicoAutos.escapeHtml(vehicle.transmission || "manual")}</strong></div>
            <div class="spec-item"><span>Combustible</span><strong>${window.TicoAutos.escapeHtml(vehicle.fuelType || "gasolina")}</strong></div>
            <div class="spec-item"><span>Ubicacion</span><strong>${window.TicoAutos.escapeHtml(vehicle.location || "Costa Rica")}</strong></div>
          </div>

          <div class="detail-owner">
            <h2>Propietario</h2>
            <p class="muted">
              ${window.TicoAutos.escapeHtml(owner?.name || "")}
              ${window.TicoAutos.escapeHtml(owner?.lastname || "")}
            </p>
            <p class="muted">${window.TicoAutos.escapeHtml(owner?.email || "Correo no disponible")}</p>
          </div>

          <div class="inline-actions">
            <a class="btn btn-primary" href="./index.html">Volver al catalogo</a>
            ${
              isOwner
                ? `<a class="btn btn-outline" href="./editVehicle.html?id=${realVehicleId}">Editar publicacion</a>`
                : `<a class="btn btn-outline" href="./chat.html?vehicleId=${realVehicleId}">Enviar mensaje</a>`
            }
          </div>
        </aside>
      </div>
    `;

    // Activa la galería después de renderizarla.
    bindGallery(vehicle.images);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="empty-state">No fue posible cargar el detalle del vehiculo.</div>';
  }
};

// Si existe id del vehículo, carga su información.
if (vehicleId) {
  loadVehicleDetail();
}
