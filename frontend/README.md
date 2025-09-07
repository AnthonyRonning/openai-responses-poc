# AI Chat Frontend

A modern React-based AI chat application built with Vite, Bun, Tailwind CSS, and TanStack.

## Tech Stack

- **Runtime**: Bun (instead of Node.js)
- **Build Tool**: Vite
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Icons**: Lucide React

## Getting Started

### Prerequisites

Make sure you have Nix installed, then enter the development shell:

```bash
nix develop
```

### Installation

Install dependencies:

```bash
bun install
```

### Development

Run the development server:

```bash
bun run dev
```

The application will be available at http://localhost:5173

## Client-Side Only

This is a client-side only application with no backend server required. The chat interface currently includes a mock response system for demonstration purposes.

To connect to a real AI service, you can:
1. Use a client-side SDK (with appropriate API key handling)
2. Connect to an external API endpoint
3. Integrate with a serverless function provider

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ChatInterface.tsx    # Main chat UI component
│   ├── App.tsx                  # App root with providers
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind imports
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
└── package.json                # Dependencies and scripts
```

## Available Scripts

- `bun run dev` - Start the development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run lint` - Run ESLint