if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

window.TicoAutos.bindNavigation();

const params = new URLSearchParams(window.location.search);
const vehicleId = params.get("id");

const form = document.getElementById("vehicleForm");
const msg = document.getElementById("vehicleMsg");
const submitButton = document.getElementById("vehicleSubmit");
const imageList = document.getElementById("currentImages");
const title = document.getElementById("editorTitle");

// Muestra mensajes del formulario.
const setMsg = (text, type = "") => {
  msg.textContent = text;
  msg.className = `msg ${type}`.trim();
};

// Renderiza las imagenes actuales y permite decidir cuales conservar.
const renderCurrentImages = (images = []) => {
  imageList.innerHTML = "";

  if (!images.length) {
    imageList.innerHTML = '<div class="empty-state">Este vehiculo no tiene imagenes cargadas.</div>';
    return;
  }

  images.forEach((imagePath, index) => {
    const item = document.createElement("label");
    item.className = "image-check";
    item.innerHTML = `
      <input type="checkbox" name="keepImages" value="${imagePath}" checked />
      <img src="${window.TicoAutos.buildImageUrl(imagePath)}" alt="Imagen actual ${index + 1}" />
      <span>Conservar</span>
    `;
    imageList.appendChild(item);
  });
};

// Rellena el formulario con los datos actuales del vehiculo.
const fillForm = (vehicle) => {
  title.textContent = `Editar ${vehicle.brand} ${vehicle.model}`;
  form.elements.namedItem("brand").value = vehicle.brand || "";
  form.elements.namedItem("model").value = vehicle.model || "";
  form.elements.namedItem("year").value = vehicle.year || "";
  form.elements.namedItem("price").value = vehicle.price || "";
  form.elements.namedItem("color").value = vehicle.color || "";
  form.elements.namedItem("mileage").value = vehicle.mileage || 0;
  form.elements.namedItem("transmission").value = vehicle.transmission || "manual";
  form.elements.namedItem("fuelType").value = vehicle.fuelType || "gasolina";
  form.elements.namedItem("location").value = vehicle.location || "";
  form.elements.namedItem("description").value = vehicle.description || "";
  renderCurrentImages(vehicle.images || []);
};

// GET /api/vehicles/:id
const fetchVehicleById = async () => {
  const response = await fetch(`${window.TicoAutos.API_BASE}/api/vehicles/${vehicleId}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el vehiculo");
  }

  return data;
};

// PUT /api/vehicles/:id
const updateVehicleRequest = async () => {
  const formData = new FormData(form);
  const response = await fetch(`${window.TicoAutos.API_BASE}/api/vehicles/${vehicleId}`, {
    method: "PUT",
    headers: window.TicoAutos.getAuthHeaders(),
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No se pudo actualizar el vehiculo");
  }

  return data;
};

// Carga el vehiculo y confirma que el usuario sea el propietario.
const loadVehicle = async () => {
  if (!vehicleId) {
    setMsg("No se encontro el vehiculo a editar", "err");
    form.hidden = true;
    return;
  }

  try {
    const vehicle = await fetchVehicleById();

    const owner = vehicle.owner || vehicle.userId;
    const currentUserId = await window.TicoAutos.syncSessionUser();
    if (currentUserId !== owner?._id) {
      throw new Error("Solo el propietario puede editar esta publicacion");
    }

    fillForm(vehicle);
  } catch (error) {
    console.error(error);
    setMsg(error.message || "No se pudo cargar el vehiculo", "err");
    form.hidden = true;
  }
};

// Envía los cambios del formulario al endpoint REST de actualizacion.
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMsg("");

  submitButton.disabled = true;
  submitButton.textContent = "Guardando...";

  try {
    await updateVehicleRequest();

    setMsg("Cambios guardados correctamente", "ok");
    window.setTimeout(() => {
      window.location.href = `./vehicle.html?id=${vehicleId}`;
    }, 700);
  } catch (error) {
    console.error(error);
    setMsg(error.message || "No se pudo actualizar el vehiculo", "err");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar cambios";
  }
});

loadVehicle();
