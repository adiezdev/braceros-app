# Desplegar en el NAS

Cómo hacer que un cambio en el código acabe solo en el NAS, sin tocar nada a
mano. Escrito para quien no ha usado Docker nunca.

## Qué va a pasar

```
haces un cambio y git push
   └─> GitHub construye DOS imágenes: la app y la api
         └─> las deja en el registro privado de GitHub (ghcr.io)
               └─> el NAS pregunta cada 5 min, ve que hay novedad,
                   se las baja y reinicia los contenedores
```

Y dentro del NAS, una vez levantado:

```
navegador ──> nginx ──┬── ficheros de la app (HTML, CSS, JS)
                      └── /api ──> Node ──> Postgres ──> volumen del NAS
```

Tres ideas y ya sabes suficiente Docker para esto:

- **Imagen**: un paquete congelado con un programa dentro. Como un `.iso`. No
  se ejecuta, se guarda.
- **Contenedor**: una imagen puesta en marcha.
- **Volumen**: una carpeta que sobrevive a que borres el contenedor. **Aquí
  viven los datos.** Es lo único irremplazable de todo esto.

El NAS **no** necesita ser accesible desde internet. Es él quien sale a
preguntar, igual que tu móvil consulta el correo. No hay que abrir ningún
puerto en el router.

## Los cuatro contenedores

| Contenedor | Qué hace | ¿Se actualiza solo? |
|---|---|---|
| `braceros` | nginx: sirve la app y pasa `/api` a la api | Sí |
| `braceros-api` | Node: lee y escribe en la base | Sí |
| `braceros-db` | Postgres: los datos | **No, a propósito** |
| `braceros-watchtower` | vigila si hay versión nueva | No |

Postgres no lleva la etiqueta de watchtower a posta: una base de datos no se
actualiza sola de madrugada sin que nadie mire. Eso se hace a mano, leyendo
antes las notas de la versión.

## Lo que ya está en el repositorio

| Fichero | Para qué |
|---|---|
| `Dockerfile` | Receta de la app: Node construye, nginx sirve |
| `nginx.conf` | Servidor web: compresión, caché y el puente a `/api` |
| `api/` | La API: código, esquema de la base y su Dockerfile |
| `api/migraciones/` | El esquema en SQL. Se aplica solo al arrancar |
| `.github/workflows/deploy.yml` | Lo que GitHub ejecuta en cada push |
| `deploy/docker-compose.yml` | Lo que se ejecuta en el NAS |
| `deploy/.env.example` | Plantilla de la configuración del NAS |
| `deploy/docker-compose.ugos.yml` | Alternativa sin `.env`, para pegar en el gestor web del NAS |
| `docker-compose.yml` | Para probarlo en tu máquina, no en el NAS |

---

## Paso 1 — Subir el repositorio a GitHub

Crea el repositorio **en privado** en github.com (botón New, sin README ni
`.gitignore`, que ya los tenemos). Luego, desde esta carpeta:

```bash
git remote add origin https://github.com/TU_USUARIO/braceros-app.git
git branch -M main
git push -u origin main
```

En cuanto termine el push, ve a la pestaña **Actions**. Verás "Publicar
imágenes" con dos trabajos, `app` y `api`. Tardan un par de minutos la primera
vez. Cuando acaben, las imágenes salen en la pestaña **Packages** de tu perfil.

## Paso 2 — Crear el token para el NAS

El repositorio es privado, así que el NAS tiene que identificarse para bajarse
las imágenes.

En GitHub: **Settings** (los de tu cuenta, no los del repo) → **Developer
settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new
token (classic)**.

- Nombre: `NAS braceros`
- Caducidad: `No expiration` (si pones caducidad, el día que expire el NAS deja
  de actualizarse en silencio y te vuelves loco buscando por qué)
- Permisos: marca **solo** `read:packages`. Ni uno más.

Copia el token (`ghp_...`). **Solo se enseña una vez.**

## Paso 3 — Activar SSH en el NAS

En UGOS Pro: **Panel de control** → **Terminal** (o *Terminal y SNMP*, según
versión) → activa **SSH**. Anota el puerto, normalmente el 22.

Instala también la app **Docker** desde el App Center si no la tienes.

Desde tu PC:

```bash
ssh tu_usuario@IP_DEL_NAS
```

## Paso 4 — Poner los ficheros en el NAS

Crea una carpeta compartida `docker` y dentro `braceros`, y copia ahí
`deploy/docker-compose.yml`. Arrastrando desde la interfaz web, o por SSH:

```bash
mkdir -p /volume1/docker/braceros
cd /volume1/docker/braceros
```

> La ruta puede variar. Si `/volume1` no existe, mira dónde están tus carpetas
> compartidas con `ls /` o desde la interfaz web del NAS.

Genera una contraseña para la base:

```bash
openssl rand -base64 32
```

Y crea el `.env` con ella (plantilla completa en `deploy/.env.example`):

```bash
nano .env
```

```
GHCR_USER=tuusuario
GHCR_REPO=braceros-app
GHCR_TOKEN=ghp_el_token_del_paso_2
DB_PASSWORD=la_que_acabas_de_generar
PUERTO=8087
INTERVALO=300
```

Se guarda con `Ctrl+O`, `Enter`, y se sale con `Ctrl+X`. Protégelo:

```bash
chmod 600 .env
```

> **La contraseña de la base solo se usa la primera vez**, cuando se crea el
> volumen. Cambiarla después en el `.env` no la cambia dentro de Postgres, y
> la API se quedará fuera. Si algún día hay que cambiarla, se hace con
> `ALTER USER` dentro de la base y luego en el `.env`.

### Si el gestor de Docker del NAS no te deja crear el `.env`

Es lo normal: el explorador de archivos web no muestra ni deja crear ficheros
que empiezan por punto. Dos salidas:

- **Créalo por SSH** con `nano .env`, como arriba. El gestor web lo usará
  igual aunque no lo veas en la lista: la limitación es del explorador, no de
  Docker.
- **O usa `deploy/docker-compose.ugos.yml`**, que es el mismo montaje pero con
  los valores escritos dentro en vez de en un `.env`. Tiene tres huecos
  marcados con `<<< >>>`. Ese fichero acaba llevando la contraseña de la base,
  así que no lo subas a GitHub ni lo dejes en una carpeta compartida con medio
  mundo.

Con el segundo, el token de GitHub **no** hace falta escribirlo en ningún
sitio: watchtower lee las credenciales del `docker login` del paso 5, montando
el `config.json` que ese comando deja escrito.

## Paso 5 — Arrancar

Identifícate contra el registro de GitHub:

```bash
echo "ghp_el_token" | docker login ghcr.io -u tuusuario --password-stdin
```

Y levanta:

```bash
docker compose up -d
```

Comprueba que los cuatro están vivos:

```bash
docker compose ps
```

## Paso 6 — Cargar la lista la primera vez

Abre `http://IP_DEL_NAS:8087`. **La primera vez la lista sale vacía**, porque la
base está recién creada. Pulsa **Restaurar lista**: eso sube al servidor los
130 hermanos transcritos de las hojas. A partir de ahí, los datos viven en la
base y ese botón ya no hay que volver a tocarlo.

> Ojo con ese botón de aquí en adelante: ahora borra los datos **de todo el
> mundo** y vuelve a la transcripción original. La app avisa antes.

## Paso 7 — El nombre por DNS

Para llegar por nombre en vez de por IP, añade un registro **A** apuntando a la
IP del NAS en el DNS que resuelva a través de tu VPN (el del router, un
Pi-hole, o el DNS interno que uses):

```
braceros.tudominio.local   A   192.168.1.X
```

Con eso funciona `http://braceros.tudominio.local:8087`.

Quitar el `:8087` requiere un proxy inverso delante, porque el puerto 80 del
NAS lo ocupa UGOS. Es un paso aparte; dímelo y lo montamos.

---

## El día a día

Desplegar un cambio de código es esto:

```bash
git add .
git commit -m "lo que has cambiado"
git push
```

Y en menos de 5 minutos está en el NAS. **Los datos no se tocan**: los
despliegues cambian los contenedores de la app y la api, no el volumen de la
base.

## Copias de seguridad

Esto es lo único que no se puede reconstruir desde GitHub. Un volcado completo:

```bash
cd /volume1/docker/braceros
docker compose exec -T postgres pg_dump -U braceros braceros | gzip > copia-$(date +%F).sql.gz
```

Para que se haga solo cada noche, en el NAS: **Panel de control** → **Tareas
programadas** → nueva tarea de script con esa misma línea. Deja la carpeta
dentro de una compartida que ya entre en tu copia de seguridad del NAS.

Restaurar una copia:

```bash
gunzip -c copia-2025-09-01.sql.gz | docker compose exec -T postgres psql -U braceros braceros
```

Y aparte, la app sigue teniendo **Guardar Excel**, que es la copia que se lee
sin ordenador.

## Cuando algo no va

**Ver qué pasa dentro:**

```bash
docker compose logs -f api        # el que habla con la base
docker compose logs -f braceros   # el servidor web
docker compose logs -f postgres   # la base
docker compose logs -f watchtower # el que actualiza
```

Se sale con `Ctrl+C`.

**Forzar la actualización sin esperar los 5 minutos:**

```bash
docker compose pull && docker compose up -d
```

**Sale "No llego al servidor" en la app**: es la api. Mira sus logs. Lo más
típico es que no pueda entrar en Postgres porque el `DB_PASSWORD` del `.env` no
es el que tiene la base (ver el aviso del paso 4).

**"unauthorized" o "denied" al bajar imágenes**: el token está mal, ha
caducado, o le falta `read:packages`. Rehaz el paso 2.

**Volver a una versión anterior.** Cada commit deja sus imágenes etiquetadas
con el hash corto. Míralas en Packages y fija la que quieras en el compose:

```yaml
image: ghcr.io/tuusuario/braceros-app:sha-a1b2c3d
```

Luego `docker compose up -d`. Mientras esté fijada a un hash, watchtower no la
toca. Para volver a la última, devuelve `:latest`.

> Cuidado al retroceder si por medio hubo una migración de la base: el esquema
> ya migrado puede no encajar con una api vieja. Por eso conviene la copia.

**Empezar de cero, borrando los datos** (esto no tiene vuelta atrás):

```bash
docker compose down -v
```

---

## Probarlo en tu máquina antes de subirlo

En la raíz del repositorio hay otro `docker-compose.yml` que construye las
imágenes del código local en vez de bajarlas de GitHub:

```bash
docker compose up --build      # todo en http://localhost:8087
docker compose down            # parar
docker compose down -v         # parar y borrar los datos de prueba
```

Para trabajar en la interfaz con recarga en caliente, levanta solo la base y la
api y lanza vite aparte:

```bash
docker compose up postgres api
pnpm dev                       # http://localhost:5173
```

Vite ya está configurado para mandar `/api` al puerto 3000.
