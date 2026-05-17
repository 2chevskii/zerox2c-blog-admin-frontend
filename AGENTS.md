# Agent Instructions

Follow this file when making changes in this frontend repository.

## Project Snapshot

This is the admin frontend for the `0x2c.dev` blog backend. It is a Vue 3 + TypeScript + Vite single-page app using Vue Router, Pinia, Tailwind CSS v4, Lucide Vue icons, CodeMirror, and Cropper.js.

The backend lives at `../blog-backend`. Read the backend `README.md` and architecture docs before changing API behavior assumptions.

## Related Repositories

This repository is part of the local 0x2c.dev blog workspace:

- `../blog-backend` - ASP.NET Core backend API and persistence.
- `../blog-frontend` - public Vue frontend for readers.
- `../blog-admin-frontend` - Vue admin frontend for content management.

Agents may inspect and modify any of these three sibling repositories when a task requires coordinated backend, public frontend, or admin frontend changes. Keep commits focused per repository and do not mix unrelated work.

## Architecture Rules

- Keep page-level route components under `src/views/`.
- Keep reusable layout components under `src/layouts/`.
- Keep backend DTOs in `src/types/api.ts`.
- Keep endpoint wrappers in `src/api/`, grouped by backend module.
- Keep reusable non-layout controls in `src/components/`.
- Keep auth/session state in `src/stores/auth.ts`.
- Do not add a UI component library unless the user explicitly asks for it.
- Prefer local Tailwind-styled Vue controls for forms, tables, dialogs, messages, and menus.
- Keep controllers/API concerns out of views where a small typed API wrapper can handle them.

## API Rules

- Backend JSON uses camelCase properties and string enum values.
- Current enum values:
  - `UserRole`: `User`, `Admin`, `SuperAdmin`.
  - `PostStatus`: `Draft`, `Published`.
- Tags do not have a separate slug field. Tag `name` is unique, lowercase kebab-case, and at most 20 characters.
- Post slugs are optional in admin forms; the backend generates unique slugs from the title when omitted.
- Post bodies are edited as Markdown with CodeMirror 6. Preview HTML comes from the backend Markdown render endpoint; do not add frontend Markdown renderers.
- Post image uploads use `src/components/ImageUploadCropper.vue`, `src/api/images.ts`, and backend purposes `Cover`, `Banner`, and `Embedded`.
- Embedded Markdown images are uploaded through post-scoped Markdown image APIs and inserted with backend-returned local paths such as `images/{imageId}`; do not inline base64 images in post bodies.
- Protected requests require `Authorization: Bearer <token>`.
- Known technical users cannot be modified through the admin UI except changing the known superadmin password.
- Local dev relies on the Vite `/api` proxy because the backend currently has no CORS setup.
- If backend DTOs change, update `src/types/api.ts`, API wrappers, affected views, and this documentation in the same change set.

## UX Rules

- This is an operational admin tool, not a marketing site.
- Keep pages dense, predictable, and scan-friendly.
- Match the public reader frontend's dark 2CHEVSKII design language.
- Use Tailwind v4 theme tokens and local CSS component classes from `src/styles.css`; avoid reintroducing Element Plus styling assumptions.
- Use restrained styling and stable table/form layouts.
- Avoid visible in-app explanations of how the UI works; labels and actions should be self-evident.

## Verification

Before finishing implementation changes, run:

```powershell
npm run build
```

If you start a local dev server during verification, stop it before finishing unless the user explicitly asks to keep it running. Never leave Vite, preview, backend, watcher, or other long-running development processes running after the task is done.
