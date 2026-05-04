# Frontend TicoAutos

Frontend de TicoAutos. Este proyecto contiene las paginas que usa el usuario para ver vehiculos, registrarse, iniciar sesion, publicar vehículos y comunicarse con otros usuarios.

## Que hace este frontend

- Muestra el catalogo de vehiculos.
- Permite filtrar vehiculos por marca, modelo, ano, precio y estado.
- Muestra el detalle de cada vehiculo.
- Permite registrar usuarios normales y usuarios con Google.
- Permite iniciar sesion y guardar la sesion del usuario.
- Permite publicar, editar, eliminar y marcar vehiculos como vendidos.
- Permite ver el perfil del usuario.
- Permite ver los vehiculos publicados por el usuario.
- Permite usar chats entre compradores y propietarios.
- Permite ver el historial de conversaciones.

## Tecnologias usadas

- HTML
- CSS
- JavaScript
- Fetch API
- Session Storage
- Google Identity Services

## Requisitos

- Navegador web.
- Backend REST encendido.
- Backend GraphQL encendido.
- Servicio del padron encendido para validar cedulas.

## Instalacion

Este frontend no necesita instalar dependencias.

Solo se abre la carpeta `Frontend-TicoAutos_V2` y se ejecuta el archivo `index.html`.

Tambien se puede usar Live Server en Visual Studio Code.

Para que funcione completo, se deben levantar estos servicios:

```bash
cd Backend-TicoAutos_V2
npm install
npm start
```

```bash
cd TicoAutos_GraphQL
npm install
npm start
```

```bash
cd padron
php -S localhost:8000
```

El backend REST queda disponible en `http://localhost:3000`.

El backend GraphQL queda disponible en `http://localhost:4000/graphql`.

## Servicios que consume

Backend REST:

- Login y registro.
- Validacion de cedula.
- Crear, editar, eliminar y actualizar vehiculos.
- Enviar preguntas y respuestas.

Backend GraphQL:

- Catalogo de vehiculos.
- Detalle de vehiculos.
- Perfil y vehiculos del usuario.
- Chats e historial.

Padron:

- Se usa para validar la cedula durante el registro.

## Sesion

La sesion se guarda en `sessionStorage`.

Datos principales:

- `token`
- `userId`

El token se envia al backend cuando una accion necesita usuario autenticado.