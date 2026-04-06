if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

window.TicoAutos.bindNavigation();

const container = document.getElementById("myVehicleList");

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

// GET /api/vehicles/mine
const loadMyVehicles = async () => {
  container.innerHTML = '<div class="empty-state">Cargando tus vehiculos...</div>';

  try {
    const response = await fetch(`${window.TicoAutos.API_BASE}/api/vehicles/mine`, {
      headers: window.TicoAutos.getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "No se pudieron cargar tus vehiculos");
    }

    const vehicles = data.results || [];
    container.innerHTML = "";

    if (!vehicles.length) {
      container.innerHTML =
        '<div class="empty-state">Todavia no has publicado vehiculos. Usa el boton "Publicar nuevo" para comenzar.</div>';
      return;
    }

    vehicles.forEach((vehicle) => {
      const card = window.TicoAutos.createVehicleCard(vehicle, {
        showOwner: false,
        showActions: true,
        onEdit: (item) => {
          window.location.href = `./editVehicle.html?id=${item._id}`;
        },
        onDelete: async (item) => {
          const confirmed = window.confirm("Seguro que deseas eliminar este vehiculo?");
          if (!confirmed) {
            return;
          }

          try {
            await deleteVehicleRequest(item._id);
            loadMyVehicles();
          } catch (error) {
            alert(error.message || "No se pudo eliminar");
          }
        },
        onSold: async (item) => {
          const nextStatus = item.status === "vendido" ? "disponible" : "vendido";

          try {
            await updateVehicleStatusRequest(item._id, nextStatus);
            loadMyVehicles();
          } catch (error) {
            alert(error.message || "No se pudo actualizar el estado");
          }
        },
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<div class="empty-state">No se pudieron cargar tus vehiculos. Revisa el backend y tu token.</div>';
  }
};

loadMyVehicles();
