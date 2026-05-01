# Setup de Kleo — Supabase

Sigue estos pasos en orden. Cuando termines vuelve aquí y avísame.

## 1. Crear proyecto en Supabase

1. Ve a https://supabase.com → **Start your project**
2. Sign in con GitHub
3. **New project**:
   - Name: `kleo`
   - Database Password: usa una fuerte y guárdala
   - Region: `East US (North Virginia)`
   - Plan: **Free**
4. Espera ~2 minutos a que se cree

## 2. Correr el schema SQL

1. En tu proyecto Supabase, abre **SQL Editor** (sidebar izquierdo)
2. **New query**
3. Abre el archivo `supabase/schema.sql` de este proyecto
4. Copia todo el contenido y pégalo en el SQL Editor
5. Click **Run** (Ctrl+Enter)
6. Debe decir "Success. No rows returned"

## 3. Activar Google OAuth

1. En Supabase: **Authentication → Providers**
2. Click en **Google** → activa el toggle
3. Necesitas Client ID y Client Secret de Google Cloud:
   - Ve a https://console.cloud.google.com
   - Crea un proyecto (o usa uno existente)
   - **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Kleo`
   - **Authorized redirect URIs**: pega la URL que Supabase muestra debajo del toggle (algo como `https://xxx.supabase.co/auth/v1/callback`)
   - Crea y copia **Client ID** + **Client Secret**
4. Pégalos en Supabase y **Save**

## 4. Copiar credenciales a .env

1. En Supabase: **Settings → API**
2. Copia:
   - `Project URL`
   - `anon` `public` key
3. En la raíz del proyecto, copia `.env.example` a `.env`:
   ```
   cp .env.example .env
   ```
4. Pega las dos en `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

## 5. Reiniciar el dev server

```bash
# Para el server actual (Ctrl+C en su terminal)
npm run dev
```

## 6. Probar

1. Abre http://localhost:5173
2. Click "Continuar con Google"
3. Te redirige a Google → autorizas → vuelve a la app
4. Crea tu PIN
5. Verás el dashboard con datos de demo

## Sobre Apple Sign In

Lo dejamos pendiente — requiere $99/año Apple Developer Program. Mientras solo Google está OK. Cuando estés listo:
- Authentication → Providers → Apple en Supabase
- Necesitas Service ID + Key ID + Team ID + Private Key de Apple

## Sobre Plaid (siguiente etapa)

Plaid necesita un backend porque su `secret_key` no puede vivir en el frontend. Opciones:
- **Supabase Edge Functions** (Deno, mismo dashboard)
- **Vercel API Routes** (Node, integrado con el deploy)

Cuando termines Supabase y quieras seguir con bancos reales, avísame.

## Troubleshooting

- **"Faltan VITE_SUPABASE_URL"**: el `.env` no existe o no reiniciaste el server.
- **Google OAuth da 400**: el redirect URI no coincide. Tiene que ser exactamente el de Supabase.
- **No carga data**: revisa la consola del navegador. Casi siempre es RLS o el schema no se corrió.
