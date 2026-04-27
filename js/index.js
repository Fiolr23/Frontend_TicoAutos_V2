window.TicoAutos.bindNavigation();

const form = document.getElementById("catalogFilters");
const summary = document.getElementById("catalogSummary");
const list = document.getElementById("catalogList");
const VEHICLES_QUERY = `
  query GetVehicles(
    $brand: String
    $model: String
    $status: String
    $minYear: Int
    $maxYear: Int
    $minPrice: Float
    $maxPrice: Float
    $page: Int
    $limit: Int
  ) {
    vehicles(
      brand: $brand
      model: $model
      status: $status
      minYear: $minYear
      maxYear: $maxYear
      minPrice: $minPrice
      maxPrice: $maxPrice
      page: $page
      limit: $limit
    ) {
      vehicles {
        id
        userId
        brand
        model
        year
        price
        color
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
      total
      page
      limit
      totalPages
    }
  }
`;

// Lee los filtros del formulario y los convierte en query params.
const readFilters = () => {
  const formData = new FormData(form);
  const params = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    const trimmed = `${value}`.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  }

  params.set("limit", "12");
  return params;
};

// Restaura los filtros desde la url para compartir busquedas.
const fillFiltersFromUrl = () => {
  const params = new URLSearchParams(window.location.search);

  ["brand", "model", "minYear", "maxYear", "minPrice", "maxPrice", "status"].forEach((key) => {
    const field = form.elements.namedItem(key);
    if (field && params.has(key)) {
      field.value = params.get(key);
    }
  });
};

// DELETE /api/vehicles/:id
const deleteVehicleRequest = async (vehicleId) => {
  const response = await fetch(`${window.TicoAutos.API_BASE}/api/vehicles/${vehicleId}`, {
    method: "DELETE",
    headers: window.TicoAutos.getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "No se pudo eliminar");
  }
};

// PATCH /api/vehicles/:id/status
const updateVehicleStatusRequest = async (vehicleId, status) => {
  const response = await fetch(`${window.TicoAutos.API_BASE}/api/vehicles/${vehicleId}/status`, {
    method: "PATCH",
    headers: {
      ...window.TicoAutos.getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "No se pudo actualizar el estado");
  }
};

// Renderiza el catalogo y decide si el usuario puede administrar cada tarjeta.
const renderVehicles = (vehicles, currentUserId) => {
  list.innerHTML = "";

  if (!vehicles.length) {
    list.innerHTML = '<div class="empty-state">No encontramos vehiculos con esos filtros.</div>';
    return;
  }

  vehicles.forEach((vehicle) => {
    const ownerId = vehicle.owner?.id || vehicle.owner?._id || vehicle.userId;
    const isOwner = Boolean(currentUserId && ownerId === currentUserId);

    const card = window.TicoAutos.createCatalogVehicleCard(vehicle, {
      isOwner,
      onEdit: (item) => {
        window.location.href = `./editVehicle.html?id=${window.TicoAutos.getEntityId(item)}`;
      },
      onDelete: async (item) => {
        const confirmed = window.confirm("Seguro que deseas eliminar este vehiculo?");
        if (!confirmed) {
          return;
        }

        try {
          await deleteVehicleRequest(window.TicoAutos.getEntityId(item));
          loadVehicles(readFilters());
        } catch (error) {
          window.alert(error.message || "No se pudo eliminar");
        }
      },
      onShare: (item) => {
        window.TicoAutos.shareVehicleLink(item);
      },
      onToggleStatus: async (item) => {
        const nextStatus = item.status === "vendido" ? "disponible" : "vendido";

        try {
          await updateVehicleStatusRequest(window.TicoAutos.getEntityId(item), nextStatus);
          loadVehicles(readFilters());
        } catch (error) {
          window.alert(error.message || "No se pudo actualizar el estado");
        }
      },
    });

    list.appendChild(card);
  });
};

// GET /api/vehicles
const loadVehicles = async (params = readFilters()) => {
  list.innerHTML = '<div class="empty-state">Cargando vehiculos...</div>';
  summary.textContent = "Consultando catalogo";

  try {
    const currentUserId = await window.TicoAutos.syncSessionUser();
    const query = params.toString();
    const data = await window.TicoAutos.graphqlRequest(VEHICLES_QUERY, {
      brand: params.get("brand") || null,
      model: params.get("model") || null,
      status: params.get("status") || null,
      minYear: params.get("minYear") ? Number(params.get("minYear")) : null,
      maxYear: params.get("maxYear") ? Number(params.get("maxYear")) : null,
      minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : null,
      maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : null,
      page: params.get("page") ? Number(params.get("page")) : 1,
      limit: params.get("limit") ? Number(params.get("limit")) : 12,
    });

    const results = data.vehicles?.vehicles || [];
    summary.textContent = `${data.vehicles?.total || results.length} vehiculos encontrados`;
    renderVehicles(results, currentUserId);

    const nextUrl = query ? `./index.html?${query}#catalogo` : "./index.html#catalogo";
    window.history.replaceState(null, "", nextUrl);
  } catch (error) {
    console.error(error);
    summary.textContent = "No fue posible cargar el catalogo";
    list.innerHTML = '<div class="empty-state">Revisa que el backend este encendido y con acceso a MongoDB.</div>';
  }
};

// Aplica los filtros elegidos por el usuario.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadVehicles(readFilters());
});

// Limpia filtros y vuelve a consultar el catalogo completo.
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    loadVehicles(new URLSearchParams({ limit: "12" }));
  }, 0);
});

fillFiltersFromUrl();

const initialParams = new URLSearchParams(window.location.search);
if (!initialParams.has("limit")) {
  initialParams.set("limit", "12");
}

loadVehicles(initialParams);
