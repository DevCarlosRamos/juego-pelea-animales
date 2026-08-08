# 🦙🥊 PELEA CON ANIMALES — Juego móvil (Cloudflare Pages + Pages Functions + D1)

Juego de combate arcade **para celular** (HTML5 + CSS + JavaScript puro, sin frameworks) con el **mismo personaje** del juego base *¡PELEA!*, pero ahora peleando contra **animales uno a la vez**.

> 🌐 **URL de producción:** https://pelea-animales.devcarlosramos.uk
> ⚡ **URL de Pages (backup):** https://juego-pelea-animales.pages.dev
> 📦 **Repositorio:** https://github.com/DevCarlosRamos/juego-pelea-animales

---

## 🎮 ¿Cómo funciona el juego?

- Peleas contra **1 animal a la vez**.
- El **primer animal es SIEMPRE una llama 🦙** (obligatorio).
- Cuando el animal actual está **por morir** (su vida baja del **35%**), el **siguiente animal ya empieza a aparecer** en pantalla mientras terminas al actual.
- El nuevo animal **aparece desde un lado aleatorio** (izquierda o derecha) y en un **punto aleatorio de ese lado**:
  - Animales **terrestres**: entran caminando por el suelo.
  - Animales **voladores** (águila): entran por una **altura aleatoria** y hacen *picados* al atacar.
- Son **12 animales por partida**: la llama siempre primero, los demás en orden aleatorio y el **león 🦁 como jefe final**.
- Al vencer a cada animal recuperas algo de vida y sumas puntos. Si te derrotan, partida terminada.

### Los 12 animales

| # | Animal | Emoji | Notas |
|---|--------|-------|-------|
| 1 | **Llama** | 🦙 | Siempre es el primer rival |
| 2-11 | Lobo, Jabalí, Mono, Canguro, Tigre, Oso, Cocodrilo, Serpiente, Águila, Rinoceronte | 🐺🐗🐒🦘🐯🐻🐊🐍🦅🦏 | Aparecen en **orden aleatorio** |
| 12 | **León** | 🦁 | **Jefe final** |

### Controles

| Acción | Táctil | PC |
|--------|--------|-----|
| Moverse | ◀ ▶ | A / D |
| Saltar | ⬆ | W |
| Bloquear | 🛡 | S |
| Puño | 👊 | J |
| Patada | 🦵 | K |

El podio de puntuaciones se guarda en **D1 (SQLite serverless de Cloudflare)**.

### 🎨 Personaje v2 (rediseño del jugador)

La rama **`rediseno-personaje-v2`** rediseña por completo al personaje principal:

- **Figura femenina estilizada** de política con traje formal (inspiración **Keiko Fujimori**, pero genérica y NO realista, estilo cartoon minimalista).
- **Pelo negro liso a los hombros**, sin rasgos faciales (estilo *faceless*).
- **Traje blanco**: blazer (con solapas y botones) + pantalón.
- **Banda presidencial roja con franja blanca** cruzando del hombro a la cintura.
- **Zapatos negros**.
- **Mismas proporciones** que el personaje original (58×128 px), pivot centrado y orientación hacia la derecha.
- **Brazos y piernas separados** para las animaciones: *idle, walk, jump, punch, kick, block, hit, ko*.
- Todo es **dibujo procedural en Canvas** (`web/js/fighter.js` → `buildPose()`), sin imágenes externas y con fondo transparente.


---

## 🏗️ Arquitectura (100% Cloudflare, sin servidor propio)

```
                    ┌────────────────────────────────────────────────┐
                    │               Cloudflare (edge)                 │
  Teléfono/PC  ───► │                                                │
  https://          │  Cloudflare Pages                              │
  pelea-animales.   │   ├── /          → index.html + assets (web/)  │
  devcarlosramos.uk │   ├── /api/*     → Pages Functions (Workers)    │
                    │   ├── /healthz   → healthcheck                  │
                    │   └── D1 (SQLite serverless)  ←── binding `DB` │
                    └────────────────────────────────────────────────┘
```

- **Frontend:** `web/` → HTML5 Canvas + JS vanilla, sin CDN externos.
- **API:** `functions/api/*` → Pages Functions (sintaxis `onRequestGet/Post`).
- **Base de datos:** **D1** de Cloudflare (SQLite serverless, **pago por uso**).
- **Dominio:** `pelea-animales.devcarlosramos.uk` → CNAME → `juego-pelea-animales.pages.dev`, TLS automático.

### 💰 Costos (importante)

| Recurso | Free tier | Este proyecto |
|---------|-----------|---------------|
| Cloudflare Pages | 500 builds/mes · tráfico ilimitado | ✅ Gratis |
| Pages Functions | 100.000 solicitudes/día | ✅ Gratis |
| **D1** | 5 GB almacenamiento · 5M lecturas/día · 100K escrituras/día | ✅ **Gratis / pago por uso** |

**D1 es serverless: se paga solo por uso real (lecturas y escrituras).** Con el tráfico bajo de este juego el coste es **$0 al mes**. No hay máquina encendida, no hay contenedores y la base escala a 0.

---

## 📁 Estructura del proyecto

```
juego-pelea-con-animales/
├── web/                        # 🎮 Frontend del juego (estático, deploy directo)
│   ├── index.html              #   Pantallas, HUD y controles táctiles
│   ├── css/style.css           #   Estilos móvil-first
│   └── js/
│       ├── config.js           #   Config + estadísticas de los 12 animales
│       ├── audio.js            #   Sonido procedural con WebAudio
│       ├── api.js              #   Cliente del podio (/api/scores)
│       ├── input.js            #   Teclado + botones táctiles
│       ├── fighter.js          #   Personaje + motor de combate (compartido)
│       ├── animals.js          #   Dibujo procedural de cada animal en Canvas
│       ├── ai.js               #   IA de los animales
│       ├── game.js             #   Oleadas, aparición por lado aleatorio, combate
│       └── main.js             #   Flujo de pantallas y HUD
├── functions/                  # ☁️ Pages Functions (API)
│   ├── _middleware.js          #   Cabeceras de seguridad
│   ├── healthz.js              #   GET /healthz
│   └── api/
│       ├── health.js           #   GET /api/health
│       └── scores.js           #   GET/POST /api/scores (D1)
├── d1/
│   └── schema.sql              #   Esquema de la base D1 (tabla scores)
├── scripts/
│   └── deploy-cloudflare.ps1   #   🚀 Deploy automatizado a producción
├── test/
│   └── smoke.js                #   Prueba headless de la lógica (node test/smoke.js)
├── wrangler.toml               #   Config de Cloudflare (Pages + binding D1)
├── package.json                #   Scripts npm (dev/db/deploy)
├── .env.example                #   Ejemplo de variables (sin secretos)
├── .gitignore                  #   Nunca subir .env, .wrangler, claves…
└── README.md                   #   Esta documentación
```

---

## ⚙️ Instalación y desarrollo local

Requisitos: **Node.js 18+** y una cuenta de Cloudflare.

```bash
# 1. Instalar dependencias (wrangler)
npm install

# 2. Probar la lógica del juego sin navegador
node test/smoke.js

# 3. Crear la D1 local y aplicar el esquema
npx wrangler d1 execute pelea-animales-db --local --file=d1/schema.sql

# 4. Servir localmente (frontend + Pages Functions + D1)
npm run dev          # → http://localhost:8788
```

---

## 🚀 Despliegue a producción (automatizado)

El script `scripts/deploy-cloudflare.ps1` hace **todo** el despliegue:

1. Verifica Node + wrangler.
2. Autenticación con Cloudflare (usa tu sesión de `wrangler login` o `CLOUDFLARE_API_TOKEN`).
3. Crea la **base de datos D1** `pelea-animales-db` y actualiza `wrangler.toml`.
4. Aplica `d1/schema.sql` en remoto.
5. Crea el **proyecto Pages** `juego-pelea-animales`.
6. Despliega `web/` + `functions/`.
7. Configura el **dominio** `pelea-animales.devcarlosramos.uk` (CNAME → pages.dev, sin tocar otros subdominios).
8. Verifica `/`, `/healthz`, `/api/health`, `/api/scores`.

```powershell
.\scripts\deploy-cloudflare.ps1
# Opciones útiles:
.\scripts\deploy-cloudflare.ps1 -NoDomain   # solo pages.dev, sin tocar DNS
```

### Comandos manuales equivalentes

```bash
npx wrangler d1 create pelea-animales-db --binding DB --location weur
npx wrangler d1 execute pelea-animales-db --remote --file=d1/schema.sql
npx wrangler pages project create juego-pelea-animales --production-branch main
npx wrangler pages deploy web --project-name juego-pelea-animales --branch main
```

### 🌐 DNS / dominio (sin afectar a otras apps)

La zona `devcarlosramos.uk` ya tiene otros subdominios en uso (`juego` y `notas`, más la raíz con un túnel). Este proyecto **solo añade** el subdominio nuevo `pelea-animales`:

```
pelea-animales.devcarlosramos.uk  →  CNAME  →  juego-pelea-animales.pages.dev  (proxied)
```

No se eliminan ni modifican los registros de `juego`, `notas` ni de la raíz.


---

## 🗄️ Base de datos D1

Esquema (`d1/schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC, created_at ASC);
```

Consultas útiles:

```bash
# Ver el podio
npx wrangler d1 execute pelea-animales-db --remote --command "SELECT * FROM scores ORDER BY score DESC LIMIT 10"
# Backup
npx wrangler d1 export pelea-animales-db --remote --output=backup.sql
# Borrar el registro de prueba del deploy (opcional)
npx wrangler d1 execute pelea-animales-db --remote --command "DELETE FROM scores WHERE player_name='DeployTest'"
```

---

## 🔌 API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/scores?limit=N` | Top N puntuaciones (máx. 100) |
| POST | `/api/scores` | Guarda `{ playerName, score }` |
| GET | `/api/health` | Estado del servicio |
| GET | `/healthz` | Healthcheck plano |

Todas las respuestas son JSON (menos `/healthz`). La API solo hace falta para el podio; el juego funciona igual aunque la API esté caída.

---

## 🧠 Reglas clave de aparición (código)

En `game.js`:

- `buildOrder()` → **llama primero**, resto aleatorio, **león último**.
- `spawnAnimal(asQueued)` → elige un **lado aleatorio** (`-1` o `1`) y un **punto aleatorio** de ese lado (altura aleatoria si `fly`).
- `combat()` → cuando `animal.hp <= maxHp * 0.35` (≈ "por morir") y no hay ninguno en cola, llama a `spawnAnimal(true)` para que el **siguiente empiece a aparecer** mientras el actual aún pelea.
- `promoteNext()` → al morir el animal actual, el que ya estaba entrando se convierte en el activo.

Configurable en `config.js`:

```js
NEXT_SPAWN_HP_FRAC: 0.35,  // % de vida del animal para que aparezca el siguiente
KO_HEAL: 30,               // vida que recupera el jugador por animal vencido
```

---

## 🧪 Pruebas

```bash
node test/smoke.js
```

El smoke test carga el juego con un DOM/canvas simulado, comprueba que la **llama sale primero**, que el **león es el último**, que aparece el siguiente animal cuando el actual está por morir, y **juega la partida completa** (12 animales) sin errores.

---

## 🔒 Seguridad

- **No hay secretos en el repositorio.** `.env`, `.dev.vars`, certificados y claves están en `.gitignore`.
- Los tokens de API/Cloudflare viven en tu máquina (sesión de wrangler) o en el dashboard de Cloudflare.
- Las Pages Functions añaden cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- Los nombres se escapan en el HTML del podio para evitar XSS.
- La puntuación se valida en la API (`score >= 0`, nombre ≤ 20 caracteres).

---

## 🛠️ Solución de problemas

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| `500 no such table: scores` | Esquema no aplicado en D1 | `npx wrangler d1 execute pelea-animales-db --remote --file=d1/schema.sql` |
| `404` en `/api/*` | Functions no desplegadas | Verifica `functions/` en la raíz y vuelve a `wrangler pages deploy web` |
| El subdominio no carga (SSL) | Dominio aún activándose | Espera hasta ~5 min; revisa *Custom domains* en el dashboard |
| El dominio apunta a otra app | CNAME erróneo | Borra el CNAME de `pelea-animales` y vuelve a ejecutar el script (paso 7) |
| D1 no encontrada | `database_id` placeholder en `wrangler.toml` | Ejecuta el script (paso 3) o `wrangler d1 create` con `--update-config` |

---

## 📜 Changelog

| Versión | Descripción |
|---------|-------------|
| **v1.0** | Creación de *PELEA CON ANIMALES* sobre la base del juego *¡PELEA!*: 12 animales, llama obligatoria primero, aparición anticipada del siguiente rival desde un lado aleatorio, D1 serverless, subdominio propio y deploy automatizado. |
| **v2** (`rediseno-personaje-v2`) | Rediseño completo del personaje principal: política con traje blanco, banda presidencial roja/blanca, pelo negro a los hombros, zapatos negros y estilo cartoon minimalista (dibujo procedural en Canvas, mismas proporciones y animaciones). |

---

## 🧑‍💻 Autor

Creado por **DevCarlosRamos** · [github.com/DevCarlosRamos](https://github.com/DevCarlosRamos)

Proyecto de producción bajo el dominio `devcarlosramos.uk`.

