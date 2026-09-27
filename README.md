# HEROES AION 2 — gestión privada de miembros

Esta versión cambia la web para que **solo el administrador pueda añadir y borrar jugadores**. Los visitantes únicamente pueden consultar la lista.

Los datos se almacenan en **Cloudflare D1** mediante un **Cloudflare Worker**. `data.json` deja de ser la fuente de datos; se conserva como copia de seguridad de los datos iniciales.

## Archivos

- `aion2.html` — web modificada.
- `worker.js` — API y autenticación del administrador.
- `migrations/0001_init.sql` — crea las tablas e importa Ares y Luna.
- `wrangler.toml` — configuración del Worker.
- `data.json.backup` — copia del JSON original.

## 1. Crear la base de datos D1

En una terminal con Wrangler instalado:

```bash
npx wrangler d1 create heroes-aion2 --jurisdiction eu
```

Cloudflare devolverá un `database_id`. Copia ese ID en `wrangler.toml`, sustituyendo:

```toml
database_id = "REEMPLAZAR_CON_DATABASE_ID"
```

La jurisdicción `eu` hace que D1 quede restringido a la Unión Europea. Si prefieres no imponer esa restricción, omite `--jurisdiction eu`.

## 2. Crear las tablas y cargar los miembros actuales

```bash
npx wrangler d1 migrations apply heroes-aion2 --remote
```

Esto crea:

- `settings` para servidor y facción.
- `players` para los miembros.
- `admin_sessions` para las sesiones de administrador.

También carga inicialmente:

- Ares — Gladiador / Templario — Veterano AION.
- Luna — Clérigo / Canto — Experiencia en MMOs.

## 3. Crear la contraseña privada del administrador

No pongas la contraseña en `aion2.html` ni en `wrangler.toml`.

Ejecuta:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

Cuando lo solicite, escribe una contraseña nueva.

**Importante:** la contraseña que estaba en el HTML original ya se considera expuesta y no debe reutilizarse.

## 4. Publicar el Worker

Desde esta carpeta:

```bash
npx wrangler deploy
```

El Worker queda configurado para recibir solamente las rutas `/api/*` de `retroart.link` y `www.retroart.link`. El resto de la web continúa siendo servido por tu alojamiento actual.

## 5. Subir el nuevo `aion2.html`

Sustituye tu actual:

```text
/aion2.html
```

por el `aion2.html` de esta carpeta.

No necesitas subir `worker.js`, `wrangler.toml` ni la carpeta `migrations` a la carpeta pública de la web.

## Cómo funciona después

### Visitante

Puede:

- Ver servidor, facción y jugadores.
- No puede añadir jugadores.
- No puede borrar jugadores.
- No puede modificar servidor/facción.

### Administrador

En el campo de `Código Admin` del pie de página introduce la contraseña.

Al entrar aparece el panel de administración y el formulario de miembros.

Los cambios se guardan en D1:

```text
Administrador
     ↓
 aion2.html
     ↓
 /api/admin/...
     ↓
 Cloudflare Worker
     ↓
 Cloudflare D1
     ↑
 /api/data
     ↑
 todos los visitantes
```

La sesión utiliza una cookie `HttpOnly`, `Secure` y `SameSite=Strict`. La contraseña real nunca se envía al HTML ni queda almacenada en JavaScript.

## Comprobación final

Después de desplegar:

1. Abre `https://www.retroart.link/aion2.html`.
2. Comprueba que los jugadores Ares y Luna aparecen.
3. Sin entrar como administrador, comprueba que no aparece el formulario para añadir jugadores.
4. Entra con tu contraseña.
5. Añade un jugador de prueba.
6. Abre la web en una ventana privada/incógnito.
7. Comprueba que el jugador aparece también allí.
8. Vuelve al panel de administrador y bórralo.
9. Comprueba en la ventana privada que desaparece.

Si el paso 6 funciona, significa que el dato ya no está solo en tu navegador: está guardado en D1 y lo están viendo los demás usuarios.
