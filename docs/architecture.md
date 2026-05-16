# Frontend Architecture

Last updated: 2026-05-16

## Runtime

The app is a Vite-powered Vue 3 SPA. It uses:

- Vue Router for route-level navigation.
- Pinia for authentication state.
- Element Plus for the admin component system.
- CodeMirror 6 via `vue-codemirror` for editing post bodies.
- `markdown-it` for admin-side Markdown preview rendering with raw HTML disabled.
- Native `fetch` through a small typed wrapper in `src/api/http.ts`.

## Authentication Flow

1. `LoginView` posts `{ login, password }` to `/api/auth/login`.
2. `stores/auth.ts` saves the returned token, expiry, and user summary in `localStorage`.
3. `api/http.ts` reads that session and attaches `Authorization: Bearer <token>`.
4. Router guards redirect unauthenticated users to `/login`.
5. `AdminLayout` calls `/api/me` on mount and rejects users that are not `Admin` or `SuperAdmin`.

The app currently trusts the backend for write authorization. SuperAdmin-only role mutation controls are disabled in the UI for non-SuperAdmin users, known-user mutation controls are disabled from API metadata, and backend authorization remains the source of truth.

## API Layer

`src/types/api.ts` mirrors implemented backend contracts. Endpoint wrappers are intentionally thin:

- `src/api/auth.ts`
- `src/api/posts.ts`
- `src/api/tags.ts`
- `src/api/users.ts`

The backend returns arrays for list endpoints without total counts. List pages use offset/limit controls and infer "next page" from receiving exactly `limit` rows.

## Routes

- `/login`
- `/dashboard`
- `/posts`
- `/posts/new`
- `/posts/:id`
- `/tags`
- `/users`

All routes except `/login` are nested under `AdminLayout` and require an authenticated session.

## Styling

Global styling lives in `src/styles.css`. Element Plus handles the base control system; local CSS should only handle page layout, spacing, and app-specific polish.

## Post Editing

`PostEditorView` treats the `body` field as Markdown in the admin UI. The backend still stores the body as a plain string; Markdown parsing is only used to render the local preview.

The body editor uses three modes:

- `Edit`: CodeMirror editor only.
- `Edit + preview`: CodeMirror and rendered Markdown side by side on desktop, stacked on narrow screens.
- `Preview`: rendered Markdown only.

## Known Backend Gaps Reflected In UI

- No media/image endpoints exist yet. Post editor exposes `coverImageId` and `bannerImageId` as raw optional IDs only.
- No total counts exist for paged admin endpoints.
- Tag names are the tag identifiers. There is no separate tag slug field.
