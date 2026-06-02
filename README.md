# 🥪 Pedido Sangucheto

App interna para coordinar el almuerzo en la ofi. El coordinador elige cuándo iniciar el flujo, cada compañero recibe un link personal por Slack DM, elige su pedido, y el resumen queda listo para mandar por WhatsApp al local.

---

## Cómo funciona

```
Coordinador abre /admin
    ↓
📣 Anuncia en el canal de Slack  (opcional)
📨 Envía links personalizados por DM
    ↓
Cada persona abre su link → elige menú + pan + aderezo → confirma
    ↓
Coordinador ve quién falta → 📲 Manda recordatorio por DM
    ↓
📋 Abre /summary → copia el texto → pega en WhatsApp al local
```

---

## Stack

| Pieza | Tecnología |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Bot | Slack Bolt 4 |
| Base de datos | Upstash Redis |
| Hosting | Vercel |

---

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd lunch-orders
npm install
```

### 2. Variables de entorno

Crear `.env.local` en la raíz con los valores de la sección de abajo.

### 3. Levantar

```bash
npm run dev
```

La app corre en `http://localhost:3000`.

Para probar el bot de Slack localmente, exponer el puerto con [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Usar la URL de ngrok como `NEXT_PUBLIC_APP_URL` y como Request URL en la Slack App.

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | URL de la base de datos Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token de autenticación de Upstash |
| `SLACK_BOT_TOKEN` | Token del bot (`xoxb-...`), desde OAuth & Permissions |
| `SLACK_SIGNING_SECRET` | Signing secret de la Slack App, desde Basic Information |
| `SLACK_CHANNEL_ID` | ID del canal donde se publican los anuncios (ej: `C0XXXXXXX`) |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej: `https://url-de-tu-web.app`) |
| `ADMIN_PASSWORD` | Contraseña para acceder al panel `/admin` |
| `ADMIN_SECRET` | Clave secreta para firmar la cookie de sesión (string aleatorio largo) |

---

## Configurar el bot de Slack

### 1. Crear la app

1. Ir a [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Nombre: `Sangucheto`, elegir el workspace

### 2. Scopes del bot

En **OAuth & Permissions** → **Bot Token Scopes**, agregar:

| Scope | Para qué |
|-------|---------|
| `chat:write` | Publicar mensajes en canales y DMs |
| `im:write` | Abrir conversaciones DM con usuarios |

### 3. Instalar en el workspace

En **OAuth & Permissions** → **Install to Workspace** → autorizar.

Copiar el **Bot User OAuth Token** (`xoxb-...`) → `SLACK_BOT_TOKEN`.

### 4. Signing Secret

En **Basic Information** → **App Credentials** → copiar **Signing Secret** → `SLACK_SIGNING_SECRET`.

### 5. Event Subscriptions (opcional)

Si querés recibir eventos de Slack:

- En **Event Subscriptions** → activar → Request URL: `https://tu-web.app/api/slack/events`
- Slack verificará el endpoint automáticamente (challenge handler ya implementado)

---

## Cargar el equipo en Redis

Una vez que tenés la app funcionando y los `slack_user_id` de cada compañero (se obtienen en Slack: perfil → tres puntos → **Copiar ID de miembro**), cargar el equipo una sola vez desde la consola de Upstash:

```
SET team:members '[{"name":"Juan","slack_user_id":"U0XXXXXXX"},{"name":"María","slack_user_id":"U0YYYYYYY"}]'
```

---

## Estructura del proyecto

```
app/
├── page.tsx                    # Página de pedidos (nombre → menú → confirmación → listo)
├── admin/
│   ├── page.tsx                # Panel del coordinador
│   └── login/page.tsx          # Login con contraseña
├── summary/page.tsx            # Resumen para copiar y pegar en WhatsApp
├── components/
│   └── MenuCard.tsx            # Card de ítem del menú
└── api/
    ├── orders/route.ts         # GET / POST / DELETE pedidos
    ├── auth/token/route.ts     # Validar magic link
    ├── team/route.ts           # Listar equipo (admin)
    ├── admin/
    │   ├── login/route.ts      # Iniciar sesión
    │   └── logout/route.ts     # Cerrar sesión
    └── slack/
        ├── announce/route.ts   # Publicar anuncio en canal
        ├── send-links/route.ts # Enviar links personalizados por DM
        ├── remind/route.ts     # Recordatorio a quienes faltan
        └── events/route.ts     # Webhook de eventos Slack

lib/
├── auth.ts     # HMAC de sesión admin
├── db.ts       # Abstracción Upstash Redis
├── menu.ts     # Ítems del menú — editar acá para actualizar el menú
├── order.ts    # Frases de confirmación al pedir
├── slack.ts    # Funciones del bot
└── types.ts    # Tipos compartidos

middleware.ts   # Protege /admin con cookie de sesión
```

---

## Menú

Los ítems se definen en `lib/menu.ts`. Cada ítem tiene:

```typescript
{
  id: "bulnes",
  name: "Bulnes",
  description: "Pan brioche, colita de cuadril...",
  price: 19500,
  photo_url: "/menu-items/bulnes.png",  // imagen en /public/menu-items/
  bread: ["Pan brioche"],               // opciones de pan (requerido al pedir)
  dressing: ["Mayonesa de ajo", ...],   // opciones de aderezo (opcional, hasta 2)
}
```

Las fotos van en `/public/menu-items/` con el nombre que corresponda.

---

## Redis — claves utilizadas

| Clave | Contenido | TTL |
|-------|-----------|-----|
| `team:members` | Array de `{ name, slack_user_id }` | Sin vencimiento |
| `orders:YYYY-WW` | Hash de pedidos de la semana (ISO 8601) | Sin vencimiento |
| `token:{uuid}` | Payload del magic link `{ slack_user_id, name }` | 24 horas |
| `login_attempts:{ip}` | Contador de intentos de login | 15 minutos |

---

## Deploy en Vercel

1. Conectar el repo en [vercel.com](https://vercel.com)
2. Agregar todas las variables de entorno en **Settings → Environment Variables**
3. Deploy — Vercel detecta Next.js automáticamente

> No hay crons configurados. El coordinador controla todo desde `/admin`.

---

## Panel de administración

Acceder en `/admin` con la contraseña definida en `ADMIN_PASSWORD`.

| Acción | Descripción |
|--------|-------------|
| 📣 Anunciar en canal | Publica un mensaje en el canal de Slack con el link al menú |
| 📨 Enviar links por DM | Genera links personalizados y los envía a los miembros seleccionados |
| 📲 Recordar a quienes faltan | DM a los que todavía no cargaron su pedido |
| 📋 Ver resumen | Texto `Nombre: Sánguche (pan, aderezo)` listo para copiar y pegar en WhatsApp |
| 🗑️ Resetear pedidos | Borra todos los pedidos de la semana actual |
