# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI (via Anthropic API) to generate React components in a virtual file system, which are then transformed and previewed in real-time using blob URLs and import maps.

## Development Commands

### Setup
```bash
npm run setup          # Install dependencies, generate Prisma client, and run migrations
```

### Development
```bash
npm run dev            # Start dev server with Turbopack
npm run dev:daemon     # Start dev server in background, logs to logs.txt
npm run build          # Build for production
npm run start          # Start production server
```

### Testing
```bash
npm test              # Run all tests with Vitest
npm test -- --watch   # Run tests in watch mode
npm test -- <file>    # Run specific test file
```

### Database
```bash
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma migrate dev   # Create and apply migrations
npm run db:reset         # Reset database (USE WITH CAUTION)
```

### Linting
```bash
npm run lint          # Run ESLint
```

## Architecture

### Core Components

**Virtual File System (`src/lib/file-system.ts`)**
- `VirtualFileSystem` class manages all file operations in memory (no disk writes)
- Supports create, read, update, delete, rename operations
- Serializes to/from JSON for database persistence
- All paths start with `/` and use `@/` as an alias for imports

**AI Integration (`src/app/api/chat/route.ts`)**
- Uses Vercel AI SDK with `streamText` for streaming responses
- Provides two tools to Claude:
  - `str_replace_editor`: View, create, edit files using string replacement
  - `file_manager`: Rename and delete files/directories
- Falls back to `MockLanguageModel` if `ANTHROPIC_API_KEY` is not set
- Uses prompt caching for the system prompt to reduce costs
- Saves chat history and file state to Prisma after each completion

**JSX Transformer (`src/lib/transform/jsx-transformer.ts`)**
- Transforms JSX/TSX to browser-compatible JavaScript using Babel standalone
- Creates import maps to resolve:
  - Local files (via blob URLs)
  - Third-party packages (via esm.sh CDN)
  - `@/` path alias (maps to root `/`)
- Collects and injects CSS imports into preview HTML
- Handles missing imports gracefully with placeholder modules
- Generates complete preview HTML with error boundaries

**Preview System (`src/components/preview/PreviewFrame.tsx`)**
- Renders components in sandboxed iframe using `srcdoc`
- Entry point: `/App.jsx` (or `/App.tsx`, `/index.jsx`, etc.)
- Automatically refreshes when files change
- Shows syntax errors inline with formatted display
- Uses Tailwind CDN for styling

### State Management

**FileSystemContext (`src/lib/contexts/file-system-context.tsx`)**
- Provides file system operations to all components
- Manages selected file state
- Handles tool calls from AI responses (creates/updates files in real-time)
- Uses `refreshTrigger` counter to force re-renders after mutations

**ChatContext (`src/lib/contexts/chat-context.tsx`)**
- Manages chat messages and AI interaction
- Handles streaming responses from the API
- Processes tool calls to update the file system

### Database Schema

Uses Prisma with SQLite (`prisma/schema.prisma`):
- `User`: Authentication (email/password with bcrypt)
- `Project`: Stores project metadata, messages (JSON), and file data (JSON)
- Generated client lives in `src/generated/prisma/`

### Authentication

JWT-based auth (`src/lib/auth.ts`):
- Uses `jose` library for JWT signing/verification
- Supports anonymous users (projects without userId)
- Session stored in HTTP-only cookies
- Middleware (`src/middleware.ts`) checks auth on protected routes

## Key Patterns

### Import Resolution
All component imports use `@/` alias:
```jsx
import Counter from '@/components/Counter'  // Maps to /components/Counter.jsx
```

### File Paths
- All paths are absolute, starting with `/`
- Example: `/App.jsx`, `/components/Button.jsx`
- The VirtualFileSystem normalizes paths automatically

### AI Tool Format
The AI uses two tools to modify files:

**str_replace_editor** - for viewing/editing:
```json
{
  "command": "create" | "view" | "str_replace" | "insert",
  "path": "/App.jsx",
  "file_text": "...",      // for create
  "old_str": "...",        // for str_replace
  "new_str": "...",        // for str_replace/insert
  "view_range": [1, 50]    // for view
}
```

**file_manager** - for file operations:
```json
{
  "command": "rename" | "delete",
  "path": "/old/path.jsx",
  "new_path": "/new/path.jsx"  // for rename only
}
```

### Component Entry Point
Every project MUST have `/App.jsx` (or `/App.tsx`) that exports a React component as default export. This is the entry point for the preview.

## Testing

- Tests use Vitest with jsdom environment
- Testing Library for React component tests
- Tests located in `__tests__` directories next to source files
- Example: `src/lib/__tests__/file-system.test.ts`

## Environment Variables

Required in `.env`:
```
ANTHROPIC_API_KEY=your-api-key-here  # Optional - uses mock provider if missing
JWT_SECRET=your-secret-here          # Required for auth
```

## Important Notes

- The app runs WITHOUT an API key using a mock provider that generates static components
- All file operations are in-memory - nothing is written to disk except database
- Component preview uses blob URLs, so it works entirely client-side
- Tailwind classes work via CDN in preview (cdn.tailwindcss.com)
- The JSX transformer handles TypeScript automatically based on file extension
- Mock provider is useful for testing without burning API credits
