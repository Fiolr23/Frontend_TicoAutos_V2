if (!window.TicoAutos.isAuthenticated()) {
  window.location.href = "./login.html";
}

window.TicoAutos.bindNavigation();

const form = document.getElementById("vehicleForm");
const msg = document.getElementById("vehicleMsg");
const submitButton = document.getElementById("vehicleSubmit");

/**
 * Muestra mensajes de estado reutilizando el sistema visual del formulario.
 */
const setMsg = (text, type = "") => {
  msg.textContent = text;
  msg.className = `msg ${type}`.trim();
};

/**
 * Valida los datos mínimos requeridos antes de enviar el formulario.
 */
const validateVehicleForm = (formElement) => {
  const brand = formElement.elements.namedItem("brand")?.value.trim();
  const model = formElement.elements.namedItem("model")?.value.trim();
  const year = Number(formElement.elements.namedItem("year")?.value);
  const price = Number(formElement.elements.namedItem("price")?.value);
  const color = formElement.elements.namedItem("color")?.value.trim();
  const mileageValue = formElement.elements.namedItem("mileage")?.value;
  const files = formElement.elements.namedItem("images")?.files || [];

  if (!brand || !model || !color) {
    return "Marca, modelo y color son obligatorios";
  }

  if (!Number.isFinite(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    return "El año del vehiculo es invalido";
  }

  if (!Number.isFinite(price) || price <= 0) {
    return "El precio debe ser mayor a 0";
  }

  // El kilometraje es opcional, pero si viene informado debe ser un numero valido.
  if (mileageValue !== "" && (!Number.isFinite(Number(mileageValue)) || Number(mileageValue) < 0)) {
    return "El kilometraje es invalido";
  }

  if (!files.length) {
    return "Debes subir al menos una imagen";
  }

  if (files.length > 6) {
    return "Solo puedes subir hasta 6 imagenes";
  }

  return "";
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMsg("");

  const validationError = validateVehicleForm(form);
  if (validationError) {
    setMsg(validationError, "err");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Publicando...";

  try {
    // envia texto e imagenes en una sola solicitud multipart/form-data.
    const formData = new FormData(form);

    const response = await fetch(`${window.TicoAutos.API_BASE}/api/vehicles`, {
      method: "POST",
      headers: window.TicoAutos.getAuthHeaders(),
      body: formData,
    });
    
    // Si la respuesta no es JSON valido, evitamos que falle el flujo del catch secundario.
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "No se pudo publicar el vehiculo");
    }

    setMsg("Se creo satisfactoriamente el vehiculo.", "ok");
    window.setTimeout(() => {
      window.location.href = `./vehicle.html?id=${data._id}`;
    }, 2200);
  } catch (error) {
    console.error(error);
    setMsg(error.message || "No se pudo publicar el vehiculo", "err");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Publicar vehiculo";
  }
});
