# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Type-check + build for production
npm run preview    # Preview production build
npm run test       # Run tests in watch mode
npm run coverage   # Run tests with coverage report
```

To run a single test file:
```bash
npx vitest run src/contexts/AuthContext.test.tsx
```

## Environment Variables

Copy `.env.example` to `.env`. Required variables:
- `VITE_API_BASE_URL` — Backend base URL (default: `http://localhost:8080`)
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID (currently unused in code; backend drives the OAuth flow)

## Architecture

**Stack:** React 18, TypeScript, Vite, React Router v6, Vitest + Testing Library, CSS Modules.

### Auth Flow

Authentication is backend-driven (no frontend OAuth library):
1. `AuthContext.login()` redirects to `${VITE_API_BASE_URL}/oauth2/authorization/google`
2. Backend completes OAuth handshake with Google, issues a JWT
3. Backend redirects to `/oauth2/redirect?token=<JWT>`
4. `OAuthRedirectPage` extracts the token, calls `handleToken()` which decodes the JWT payload (base64), stores it in `localStorage` under `session_token`, and sets `user` in context
5. `ProtectedRoute` checks `AuthContext.user`; redirects unauthenticated users to `/login`

On app load, `AuthContext` rehydrates `user` from `localStorage` if a token exists.

### Routing

Two layout trees in `src/router/index.tsx`:
- **Public** (`PublicLayout`): `/`, `/login`, `/oauth2/redirect`
- **Protected** (`ProtectedRoute` → `AppLayout`): `/app/todos`, `/app/todos/:id`, `/app/profile`

### State Management

Auth state lives entirely in `AuthContext` (`src/contexts/AuthContext.tsx`). Todo state is managed locally within each page component — no global store.

### API Layer

`src/services/api.ts` — thin `fetch` wrapper that attaches the JWT from `localStorage` as a Bearer token. Throws on non-2xx; returns `undefined` on 204.

`src/services/todoService.ts` — typed wrappers around `/api/todos` endpoints (`list`, `getById`, `create`, `update`).

`Todo` type (`src/types/todo.ts`) has `status: 'TODO' | 'IN_PROGRESS' | 'DONE'`, optional `projectId`, `parentTodoId`, and `order`.

### Kanban Board

`TodoListPage` uses `@dnd-kit/core` for drag-and-drop. Dropping a card onto a column calls `todoService.update` with the new status and applies an optimistic update (reverted on failure). Clicking a non-dragged card navigates to `/app/todos/:id`.

### Conventions

- Pages live under `src/pages/{public,protected}/PageName/`
- Components use barrel `index.ts` exports
- CSS Modules (`.module.css`) for component-scoped styles
- Path alias `@` maps to `src/`
