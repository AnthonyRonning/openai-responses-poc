# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend Development
Navigate to the `frontend/` directory for all frontend commands:

```bash
cd frontend
bun install        # Install dependencies
bun run dev        # Start development server on http://localhost:5173
bun run build      # Build for production (runs TypeScript check + Vite build)
bun run lint       # Run ESLint
bun run preview    # Preview production build
bun run format     # Format code with Prettier
bun run format:check # Check code formatting without making changes
bun run typecheck  # Run TypeScript type checking without building
```

### Nix Development Shell
The project uses Nix for consistent development environments:
```bash
nix develop        # Enter development shell with Bun, Node.js, and TypeScript tools
```

## Code Quality Tools

### Formatting & Linting
- **Prettier**: Automatically formats code with consistent style
- **ESLint**: Catches code quality issues and potential bugs
- **TypeScript**: Provides type checking for type safety

### Git Hooks
Pre-commit hooks are configured using Husky and lint-staged to:
- Run Prettier formatting on all staged files
- Run ESLint fixes on JavaScript/TypeScript files
- Ensure code quality before each commit

To bypass hooks in emergency (not recommended):
```bash
git commit --no-verify -m "your message"
```

## Architecture Overview

This is a **client-side only** React application for an AI chat interface with no backend server currently implemented.

### Tech Stack
- **Runtime**: Bun (preferred over Node.js)
- **Build Tool**: Vite
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: TanStack Query
- **UI Icons**: Lucide React

### Key Components

**ChatInterface** (`frontend/src/components/ChatInterface.tsx`): Main chat UI component that:
- Manages message state locally
- Currently provides mock AI responses (no actual AI service connected)
- Handles user input and displays conversation history
- Uses typing indicators during simulated response time

**App Structure**: Simple provider-based architecture with QueryClient wrapping the ChatInterface component.

### Important Notes

1. **No Backend**: The application currently has no backend API. The ChatInterface component includes a mock response system for demonstration purposes only.

2. **AI Integration Points**: To connect to a real AI service, modify the `handleSubmit` function in `ChatInterface.tsx` to replace the setTimeout mock with actual API calls.

3. **Build Process**: Always run `bun run build` (not just `vite build`) to ensure TypeScript checking happens before the build.