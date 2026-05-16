# 0x2c.dev Blog Admin Frontend

Vue 3 admin frontend for the `0x2c.dev` blog backend.

## Stack

- Vue 3 with `<script setup lang="ts">`.
- Vite for local development and builds.
- Vue Router for page routing and auth guards.
- Pinia for JWT session state.
- Element Plus for admin UI components.
- CodeMirror 6 through `vue-codemirror` for the post body editor.
- `markdown-it` for admin-side Markdown preview rendering.
- Cropper.js for pan-and-crop image uploads.

## Implemented Screens

- Login with `/api/auth/login`.
- Dashboard summary for posts, tags, and users.
- Post list, create, edit, publish, unpublish, and delete. The post editor supports edit, split edit/preview, preview-only body modes, cropped cover/banner uploads, and cropped embedded-image insertion.
- Tag list, create, edit, and delete with kebab-case tag names.
- User list, block, unblock, SuperAdmin-only role changes, and known superadmin password changes.

## Backend Assumptions

The frontend expects the backend from `../blog-backend` to run on `http://localhost:5000` by default.

The backend currently does not configure CORS, so local development uses Vite's `/api` proxy. Override the proxy target with:

```powershell
$env:VITE_API_PROXY_TARGET = "http://localhost:5000"
```

Auth uses a bearer token returned by `POST /api/auth/login`. The token is stored in `localStorage` under `zero-x2c-admin-session`.

## Development

Install dependencies:

```powershell
npm install
```

Run the dev server:

```powershell
npm run dev
```

Build:

```powershell
npm run build
```

Preview a production build:

```powershell
npm run preview
```

## Default Local Login

The backend technical superadmin username is `superadmin`.

If `SuperAdmin:UseDefaultPassword` is `true`, its initial default password is `superadmin`. If that backend setting is `false`, the backend generates and logs the initial startup password. After the known superadmin exists, its password is changed through the admin UI.

## Project Layout

```text
src/
  api/          Typed fetch wrappers for backend endpoints.
  components/   Reusable controls such as cropped image upload.
  layouts/      Admin shell and navigation.
  router/       Route definitions and auth guard.
  stores/       Pinia stores.
  types/        DTOs matching backend JSON contracts.
  utils/        Small formatting helpers.
  views/        Page-level Vue components.
```

Keep backend DTO changes mirrored in `src/types/api.ts` and the matching `src/api/*.ts` module.
