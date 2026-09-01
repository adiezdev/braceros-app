# Desplegar en el NAS

Cómo hacer que un cambio en el código acabe solo en el NAS, sin tocar nada a
mano. Escrito para quien no ha usado Docker nunca.

## Qué va a pasar

```
haces un cambio y git push
   └─> GitHub construye la app y la empaqueta en una "imagen"
         └─> la deja en el registro privado de GitHub (ghcr.io)
               └─> el NAS pregunta cada 5 min, ve que hay una nueva,
                   se la baja y reinicia el contenedor
```

Tres ideas y ya sabes suficiente Docker para esto:

- **Imagen**: un paquete congelado con la app y el servidor web dentro. Como un
  `.iso`. No se ejecuta, se guarda.
- **Contenedor**: una imagen puesta en marcha. Es lo que está sirviendo la web.
- **Registro**: el sitio donde se guardan las imágenes. Aquí, `ghcr.io`, que es
  el de GitHub y viene incluido con tu cuenta.

El NAS **no** necesita ser accesible desde internet. Es él quien sale a
preguntar, igual que tu móvil consulta el correo. No hay que abrir ningún
puerto en el router.

## Lo que ya está en el repositorio

| Fichero | Para qué |
|---|---|
| `Dockerfile` | La receta de la imagen: construye la app con Node y la sirve con nginx |
| `nginx.conf` | Configuración del servidor web: compresión y caché |
| `.dockerignore` | Qué no meter en la imagen (`node_modules`, `.git`…) |
| `.github/workflows/deploy.yml` | Lo que GitHub ejecuta en cada push |
| `deploy/docker-compose.yml` | Lo que se ejecuta en el NAS |
| `deploy/.env.example` | Plantilla de la configuración del NAS |

---

## Paso 1 — Subir el repositorio a GitHub

Crea el repositorio **en privado** en github.com (botón New, sin README ni
`.gitignore`, que ya los tenemos). Luego, desde esta carpeta:

```bash
git remote add origin https://github.com/TU_USUARIO/braceros-app.git
git branch -M main
git push -u origin main
```

En cuanto termine el push, ve a la pestaña **Actions** del repositorio. Verás
"Publicar imagen" en marcha. Tarda unos 2 minutos la primera vez. Cuando acabe,
la imagen aparece en la pestaña **Packages** de tu perfil.

## Paso 2 — Crear el token para el NAS

El repositorio es privado, así que el NAS tiene que identificarse para poder
bajarse la imagen.

En GitHub: **Settings** (los de tu cuenta, no los del repo) → **Developer
settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new
token (classic)**.

- Nombre: `NAS braceros`
- Caducidad: `No expiration` (si pones caducidad, el día que expire el NAS deja
  de actualizarse en silencio y te vuelves loco buscando por qué)
- Permisos: marca **solo** `read:packages`. Ni uno más.

Copia el token que sale (`ghp_...`). **Solo se enseña una vez.**

## Paso 3 — Activar SSH en el NAS

En UGOS Pro: **Panel de control** → **Terminal** (o *Terminal y SNMP*, según
versión) → activa **SSH**. Anota el puerto, normalmente el 22.

Instala también la app **Docker** desde el App Center del NAS si no la tienes.

Desde tu PC:

```bash
ssh tu_usuario@IP_DEL_NAS
```

## Paso 4 — Poner los ficheros en el NAS

Crea una carpeta compartida, por ejemplo `docker`, y dentro `braceros`. Copia
ahí `deploy/docker-compose.yml`. Puedes hacerlo arrastrando desde la interfaz
web del NAS, o por SSH:

```bash
mkdir -p /volume1/docker/braceros
cd /volume1/docker/braceros
```

> La ruta exacta puede variar. Si `/volume1` no existe, mira dónde están tus
> carpetas compartidas con `ls /` o desde la interfaz web.

Crea ahí el fichero `.env` con tus datos (usa `deploy/.env.example` como
plantilla):

```bash
nano .env
```

```
GHCR_USER=tuusuario
GHCR_REPO=braceros-app
GHCR_TOKEN=ghp_el_token_del_paso_2
PUERTO=8087
INTERVALO=300
```

Se guarda con `Ctrl+O`, `Enter`, y se sale con `Ctrl+X`.

Protégelo, que lleva el token:

```bash
chmod 600 .env
```

## Paso 5 — Arrancar

Primero identifícate contra el registro de GitHub:

```bash
echo "ghp_el_token" | docker login ghcr.io -u tuusuario --password-stdin
```

Y arranca:

```bash
docker compose up -d
```

`-d` significa "en segundo plano". Comprueba que está vivo:

```bash
docker compose ps
```

Abre `http://IP_DEL_NAS:8087` y deberías ver la aplicación.

## Paso 6 — El nombre por DNS

Para llegar por nombre en vez de por IP, añade un registro **A** apuntando a la
IP del NAS en el DNS que resuelva a través de tu VPN (el del router, un Pi-hole,
o el DNS interno que uses):

```
braceros.tudominio.local   A   192.168.1.X
```

Con eso funciona `http://braceros.tudominio.local:8087`.

Quitar el `:8087` requiere un proxy inverso delante, porque el puerto 80 del NAS
lo ocupa UGOS con su propia interfaz. Es un paso aparte; dímelo y lo montamos.

---

## El día a día

A partir de aquí, desplegar es esto:

```bash
git add .
git commit -m "lo que has cambiado"
git push
```

Y en menos de 5 minutos está en el NAS. No hay que tocar el NAS nunca más.

## Cuando algo no va

**Ver qué está pasando dentro:**

```bash
docker compose logs -f braceros      # el servidor web
docker compose logs -f watchtower    # el que actualiza
```

Se sale con `Ctrl+C`.

**Forzar la actualización sin esperar los 5 minutos:**

```bash
docker compose pull && docker compose up -d
```

**Volver a una versión anterior.** Cada commit deja su imagen etiquetada con el
hash corto. Míralas en la pestaña Packages de GitHub y fija la que quieras
cambiando el `image:` del compose:

```yaml
image: ghcr.io/tuusuario/braceros-app:sha-a1b2c3d
```

Luego `docker compose up -d`. Mientras esté fijada a un hash, watchtower no la
tocará. Para volver a la última, devuelve `:latest`.

**"unauthorized" o "denied" al bajar la imagen**: el token está mal, ha
caducado, o le falta `read:packages`. Rehaz el paso 2.

**Sale la versión antigua tras desplegar**: `Ctrl+F5` en el navegador. Si
persiste, mira los logs de watchtower a ver si llegó a actualizar.

---

## Una cosa importante antes de repartir el enlace

La aplicación guarda el estado en el **navegador de cada uno**
(`localStorage`), no en el NAS. Eso significa que si la abrís dos personas:

- cada una ve sus propios cambios y **ninguna ve los de la otra**;
- desde el móvil y desde el ordenador son también dos copias distintas;
- borrar los datos de navegación se lleva por delante lo apuntado.

Ponerlo en el NAS lo hace *accesible* desde varios sitios, pero no *compartido*.
Mientras lo lleves tú solo y desde el mismo equipo, funciona igual que ahora, y
el Excel sigue siendo la copia buena.

Si en algún momento va a tocarlo más de una persona, hace falta el backend con
base de datos que menciona el README. Es bastante más trabajo, pero es la única
forma de que dos personas no se pisen.
