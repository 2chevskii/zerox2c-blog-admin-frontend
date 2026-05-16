# Agent Instructions

Follow this file when making changes in this frontend repository.

## Project Snapshot

This is the admin frontend for the `0x2c.dev` blog backend. It is a Vue 3 + TypeScript + Vite single-page app using Vue Router, Pinia, and Element Plus.

The backend lives at `../blog-backend`. Read the backend `README.md` and architecture docs before changing API behavior assumptions.

## Architecture Rules

- Keep page-level route components under `src/views/`.
- Keep reusable layout components under `src/layouts/`.
- Keep backend DTOs in `src/types/api.ts`.
- Keep endpoint wrappers in `src/api/`, grouped by backend module.
- Keep auth/session state in `src/stores/auth.ts`.
- Do not add a second UI component library unless the user explicitly asks for it.
- Prefer Element Plus components over custom control markup for forms, tables, dialogs, messages, and menus.
- Keep controllers/API concerns out of views where a small typed API wrapper can handle them.

## API Rules

- Backend JSON uses camelCase properties and string enum values.
- Current enum values:
  - `UserRole`: `User`, `Admin`, `SuperAdmin`.
  - `PostStatus`: `Draft`, `Published`.
- Tags do not have a separate slug field. Tag `name` is unique, lowercase kebab-case, and at most 20 characters.
- Post slugs are optional in admin forms; the backend generates unique slugs from the title when omitted.
- Post bodies are edited as Markdown with CodeMirror 6 and previewed in the admin UI with `markdown-it`; the backend still stores `body` as a plain string.
- Protected requests require `Authorization: Bearer <token>`.
- Known technical users cannot be modified through the admin UI except changing the known superadmin password.
- Local dev relies on the Vite `/api` proxy because the backend currently has no CORS setup.
- If backend DTOs change, update `src/types/api.ts`, API wrappers, affected views, and this documentation in the same change set.

## UX Rules

- This is an operational admin tool, not a marketing site.
- Keep pages dense, predictable, and scan-friendly.
- Use restrained styling and stable table/form layouts.
- Avoid visible in-app explanations of how the UI works; labels and actions should be self-evident.

## Verification

Before finishing implementation changes, run:

```powershell
npm run build
```

If you start a local dev server during verification, stop it before finishing unless the user asks to keep it running.
