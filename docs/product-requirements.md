# Product Requirements Document
## Stateless AI Chat Application with OpenAI Responses & Conversations API

### Document Version
- **Version**: 1.0.0
- **Date**: 2025-09-07
- **Status**: Draft

### Table of Contents
1. [Project Overview](#project-overview)
2. [Core Functional Requirements](#core-functional-requirements)
3. [API Integration Specifications](#api-integration-specifications)
4. [Conversation Management](#conversation-management)
5. [Streaming & Real-Time Features](#streaming--real-time-features)
6. [Background Response Handling](#background-response-handling)
7. [Web Search Tool Integration](#web-search-tool-integration)
8. [Settings & Configuration](#settings--configuration)
9. [UI/UX Requirements](#uiux-requirements)
10. [Request/Response Logging](#requestresponse-logging)
11. [Technical Architecture](#technical-architecture)
12. [Error Handling & Edge Cases](#error-handling--edge-cases)
13. [Implementation Phases](#implementation-phases)
14. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Inspiration & Purpose
This project aims to create an example, client-side only, (mostly) stateless web application that utilizes OpenAI's Responses and new Conversations API endpoints. Both of these APIs greatly improve the client-side experience and do not require storing user conversation history or even chat history. This does NOT need to be production ready and is meant to be run locally. The primary goals are to demonstrate two things: what a good UX it can be, and to test out response compatibility on other servers being developed to be responses/conversations API compatible.

### Key Objectives
- **Demonstrate Stateless Architecture**: Showcase true stateless operation with zero client-side persistence
- **Modern API Usage**: Fully leverage OpenAI's Conversations API for state management
- **Superior UX**: Provide excellent user experience despite stateless nature
- **Compatibility Testing**: Serve as a reference implementation for API compatibility testing

### Non-Goals
- Production deployment readiness
- Multi-user support
- Data persistence across sessions
- Encrypted reasoning token handling
- Multi-modal inputs (images, speech)
- API compatibility testing features built-in

---

## Core Functional Requirements

### Primary Features

#### 1. Stateless Chat Interface
- **Zero Persistence**: No localStorage, sessionStorage, or IndexedDB usage
- **Session-Only Memory**: All conversation data exists only in React component state
- **Page Refresh Behavior**: Conversations are retrievable via conversation_id after refresh
- **True Stateless Demonstration**: Proves viability of server-managed state

#### 2. Conversation Lifecycle
- **Create**: Initiate new conversations via Conversations API
- **Continue**: Resume existing conversations using conversation_id
- **Switch**: Navigate between multiple active conversations
- **Delete**: Remove conversations from server
- **Clear**: Reset current conversation while maintaining conversation_id

#### 3. Message Handling
- **User Input**: Text-based messages sent to Responses API
- **AI Responses**: Streamed responses from GPT-4o model
- **Message Display**: Chronological conversation view
- **Status Indicators**: Show message states (sending, streaming, complete, error)

#### 4. API Integration Priority
- **Primary**: Use Conversations API exclusively for state management
- **Fallback**: Use `previous_response_id` only if Conversations API cannot handle specific scenarios
- **Note**: Document any cases where `previous_response_id` is required

---

## API Integration Specifications

### Conversations API Usage

#### Create Conversation
```javascript
POST /v1/conversations
Headers: Authorization: Bearer <API_KEY>
Body: {} // Empty body for basic creation
Response: { id: "conv_xxx", created_at: timestamp }
```

#### Continue Conversation
- Store conversation_id in React state
- Pass conversation_id to Responses API calls
- No need for previous_response_id in most cases

### Responses API Usage

#### Create Response with Conversation
```javascript
POST /v1/responses
Headers: 
  Authorization: Bearer <API_KEY>
  Content-Type: application/json
Body: {
  model: "gpt-4o",
  conversation: "conv_xxx",
  input: [{ role: "user", content: "message" }],
  stream: true, // Configurable
  store: true, // Always true for server-side storage (enables stateless frontend)
  tools: [{ type: "web_search" }] // When web search enabled
}
```

#### Key Parameters
- **conversation**: Always use conversation_id from Conversations API
- **store**: Always `false` to maintain stateless operation
- **stream**: Configurable via settings (default true)
- **background**: Set to `true` for long-running requests
- **previous_response_id**: Only use if Conversations API insufficient (document cases)

### API Endpoints Configuration
- **Base URL**: Configurable (default: `https://api.openai.com`)
- **Version**: `/v1`
- **Timeout**: 30 seconds for standard requests, infinite for streaming

---

## Conversation Management

### Conversation State Model
```typescript
interface Conversation {
  id: string;
  title?: string; // Generated from first message
  created_at: number;
  last_active: number;
  message_count: number;
  status: 'active' | 'generating' | 'error';
}

interface ActiveSession {
  conversation_id: string;
  messages: Message[]; // Populated from API
  response_id?: string; // Current generating response
  background_id?: string; // For background responses
}
```

### Operations

#### 1. Create New Conversation
- Call `POST /v1/conversations`
- Set as active conversation
- Clear message display
- Update conversation list

#### 2. Load Existing Conversation
- Call `GET /v1/conversations/{id}/items` to retrieve messages
- Populate message display
- Set as active conversation
- Handle missing/deleted conversations gracefully

#### 3. Switch Conversations
- Save current conversation_id
- Load new conversation items
- Update UI state
- Maintain list of recent conversations (session only)

#### 4. Delete Conversation
- Call `DELETE /v1/conversations/{id}`
- Remove from active list
- Switch to new/different conversation
- Clear UI if was active

#### 5. Clear Conversation
- Option 1: Delete and recreate
- Option 2: Continue with same ID but UI cleared
- User preference via UI action

---

## Streaming & Real-Time Features

### SSE (Server-Sent Events) Implementation

#### Stream Handling
```typescript
interface StreamConfig {
  enabled: boolean; // From settings
  onToken: (token: string) => void;
  onComplete: (response: Response) => void;
  onError: (error: Error) => void;
  abortController: AbortController;
}
```

#### Features
1. **Token-by-Token Display**: Show AI response as it generates
2. **Smooth Rendering**: Batch updates for performance
3. **Cancel Capability**: AbortController for user cancellation
4. **Auto-Reconnect**: For interrupted streams (network issues)
5. **Progress Indicators**: Visual feedback during generation

### Stream States
- **Connecting**: Initial connection establishment
- **Streaming**: Receiving tokens
- **Buffering**: Handling network delays
- **Complete**: Full response received
- **Cancelled**: User-initiated stop
- **Error**: Stream failure

---

## Background Response Handling

### Critical Feature Requirements

#### Initiate Background Response
```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  conversation: conversation_id,
  input: [{ role: "user", content: "..." }],
  background: true,
  stream: true, // Required for re-attachment
  store: true
});
// Store response.id for later retrieval
```

#### Page Refresh Scenario
1. **Before Refresh**:
   - Store `response_id` in URL params or sessionStorage (minimal)
   - Store `conversation_id` similarly
   
2. **After Refresh**:
   - Retrieve stored IDs
   - Call `GET /v1/responses/{response_id}` to check status
   - If still generating, re-attach to stream
   - If complete, display final response

#### Re-attachment Logic
```typescript
async function reattachToResponse(response_id: string) {
  // Check response status
  const response = await fetch(`/v1/responses/${response_id}`);
  
  if (response.status === 'in_progress') {
    // Re-establish SSE connection
    const eventSource = new EventSource(
      `/v1/responses/${response_id}/events`
    );
    // Handle streaming events
  } else if (response.status === 'completed') {
    // Display completed response
  }
}
```

### Background Response States
- **Queued**: Request accepted, not started
- **In Progress**: Actively generating
- **Completed**: Full response available
- **Failed**: Error occurred
- **Cancelled**: User or system cancelled

---

## Web Search Tool Integration

### Configuration
```javascript
const tools = [
  {
    type: "web_search",
    config: {
      enabled: true, // User toggleable
      max_results: 5 // Optional
    }
  }
];
```

### UI Indicators
1. **Search Triggered**: Show "Searching web..." indicator
2. **Sources Found**: Display source count and domains
3. **Inline Citations**: Show [1], [2] in response text
4. **Source Panel**: Expandable list of sources with:
   - Title
   - URL
   - Snippet
   - Relevance indicator

### Response Handling
- Parse tool calls from response
- Extract search results
- Format citations in response
- Maintain source-to-citation mapping

---

## Settings & Configuration

### Settings Interface
```typescript
interface AppSettings {
  api: {
    base_url: string; // Default: https://api.openai.com
    api_key: string; // From env or user input
    model: string; // Default: gpt-4o
    timeout: number; // Default: 30000ms
  };
  streaming: {
    enabled: boolean; // Default: true
    buffer_size: number; // Token batching
  };
  tools: {
    web_search: boolean; // Default: true
  };
  developer: {
    show_logs: boolean; // Default: false
    log_level: 'none' | 'basic' | 'verbose';
  };
}
```

### Settings UI Components
1. **API Configuration Panel**
   - Base URL input with validation
   - API key input (masked, with test button)
   - Model selector/input
   - Stream toggle

2. **Developer Tools Panel**
   - Show/hide request logs toggle
   - Log verbosity selector
   - Clear logs button
   - Export logs option

### Settings Persistence
- Use React Context for settings state
- No localStorage (maintain stateless)
- Settings reset on page refresh
- Optional: URL params for settings override

---

## UI/UX Requirements

### Layout Structure
```
┌─────────────────────────────────────┐
│  Header (Logo, Settings, Info)      │
├────────────┬────────────────────────┤
│            │                        │
│ Sidebar    │   Chat Interface      │
│            │                        │
│ - New      │  ┌──────────────────┐ │
│ - Conv 1   │  │  Messages Area   │ │
│ - Conv 2   │  │                  │ │
│ - Conv 3   │  │                  │ │
│            │  └──────────────────┘ │
│            │  ┌──────────────────┐ │
│            │  │   Input Area     │ │
│            │  └──────────────────┘ │
└────────────┴────────────────────────┘
│   Developer Console (collapsible)   │
└─────────────────────────────────────┘
```

### Component Specifications

#### 1. Header
- Application title/logo
- Settings button (opens modal)
- Connection status indicator
- Current model display

#### 2. Sidebar (Collapsible)
- New conversation button
- List of active conversations
  - Title (first message truncated)
  - Time indicator
  - Status icon
- Delete/Clear buttons on hover
- Responsive: Hidden on mobile

#### 3. Chat Interface
- **Messages Area**:
  - User/AI message bubbles
  - Timestamp on hover
  - Copy button for messages
  - Streaming indicator for AI
  - Web search results panel
  
- **Input Area**:
  - Multi-line text input
  - Send button (disabled while generating)
  - Cancel button (during generation)
  - Character counter
  - Web search toggle

#### 4. Status Indicators
- **Connection Status**: Green/Yellow/Red dot
- **Generation Status**: 
  - Typing indicator (three dots)
  - "Searching web..." text
  - "Thinking..." for non-streamed
- **Error States**: Red banner with retry

#### 5. Developer Console
- Hidden by default
- Toggle via keyboard shortcut (Cmd/Ctrl+D)
- Tabbed interface:
  - Requests tab
  - Responses tab
  - Errors tab
- Copy/Export functionality

### Visual Design
- **Theme**: Clean, modern, minimal
- **Colors**: 
  - Primary: OpenAI green (#10a37f)
  - Background: White/Light gray
  - Text: Dark gray/Black
- **Typography**: System fonts
- **Spacing**: Consistent 8px grid
- **Animations**: Subtle, smooth transitions

---

## Request/Response Logging

### Logging System Architecture
```typescript
interface LogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'stream';
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  status?: number;
  duration?: number;
  size?: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  
  log(entry: LogEntry): void;
  clear(): void;
  export(): string; // JSON format
  filter(type: string): LogEntry[];
}
```

### Logging Features
1. **Request Logging**:
   - Full URL and method
   - Headers (hide Authorization)
   - Request body (formatted JSON)
   - Timestamp

2. **Response Logging**:
   - Status code
   - Response headers
   - Response body (truncated if large)
   - Duration calculation

3. **Stream Logging**:
   - Individual SSE events
   - Token accumulation
   - Stream completion stats

4. **Error Logging**:
   - Error type and message
   - Stack trace (development mode)
   - Request context

### UI Components
- **Log Viewer**: Collapsible panel at bottom
- **Log Filters**: By type, status, timeframe
- **Log Search**: Find specific entries
- **Log Export**: Download as JSON/CSV
- **Performance Metrics**: Request count, avg duration

---

## Technical Architecture

### Technology Stack
- **Runtime**: Bun
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React Context + useReducer
- **HTTP Client**: Native fetch with TypeScript
- **SSE Client**: EventSource API

### State Management Strategy
```typescript
// Global app state (Context)
interface AppState {
  settings: AppSettings;
  conversations: Conversation[];
  activeConversation?: string;
  currentSession?: ActiveSession;
  logs: LogEntry[];
  ui: {
    sidebarOpen: boolean;
    settingsOpen: boolean;
    devConsoleOpen: boolean;
  };
}

// Actions
type AppAction = 
  | { type: 'SET_SETTING'; payload: Partial<AppSettings> }
  | { type: 'CREATE_CONVERSATION'; payload: Conversation }
  | { type: 'LOAD_CONVERSATION'; payload: { id: string; items: any[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_STREAM'; payload: { content: string } }
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> };
```

### API Client Architecture
```typescript
class OpenAIClient {
  constructor(config: APIConfig);
  
  // Conversations API
  createConversation(): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getConversationItems(id: string): Promise<Item[]>;
  
  // Responses API
  createResponse(params: ResponseParams): Promise<Response>;
  streamResponse(params: ResponseParams): AsyncGenerator<StreamChunk>;
  getResponse(id: string): Promise<Response>;
  cancelResponse(id: string): Promise<void>;
  
  // Background handling
  attachToBackground(id: string): EventSource;
}
```

### Component Hierarchy
```
App
├── SettingsProvider
├── ConversationProvider
│   ├── Header
│   ├── Sidebar
│   │   └── ConversationList
│   ├── ChatInterface
│   │   ├── MessageList
│   │   │   ├── Message
│   │   │   └── StreamingMessage
│   │   ├── InputArea
│   │   └── StatusBar
│   └── DeveloperConsole
│       ├── LogViewer
│       └── LogFilters
└── SettingsModal
```

---

## Error Handling & Edge Cases

### Network Errors
1. **Connection Lost**:
   - Show reconnection UI
   - Retry with exponential backoff
   - Queue messages for retry
   
2. **Timeout**:
   - Show timeout message
   - Offer retry option
   - Switch to background mode for long requests

3. **Rate Limiting**:
   - Parse retry-after header
   - Show countdown timer
   - Queue request for auto-retry

### API Errors
1. **401 Unauthorized**:
   - Prompt for API key update
   - Clear sensitive data from logs
   
2. **404 Conversation Not Found**:
   - Remove from list
   - Create new conversation
   - Show informative message

3. **Stream Interruption**:
   - Attempt reconnection
   - Show partial response
   - Offer to continue or restart

### State Inconsistencies
1. **Orphaned Responses**:
   - Detect responses without conversation
   - Attempt to recover or clean up
   
2. **Duplicate Messages**:
   - Deduplicate by response_id
   - Handle race conditions

3. **Background Response Lost**:
   - Check server for status
   - Recreate request if needed
   - Show appropriate UI state

### User Experience Edge Cases
1. **Rapid Input**:
   - Debounce/throttle requests
   - Queue or reject based on state
   
2. **Large Responses**:
   - Implement virtual scrolling
   - Truncate with "show more"
   
3. **Browser Limitations**:
   - Handle EventSource limits
   - Manage memory usage
   - Clear old logs automatically

---

## Implementation Phases

### Current Status Summary
- **✅ Phase 1**: Core Foundation - **COMPLETE**
- **❌ Phase 2**: Streaming - Not Started
- **❌ Phase 3**: Background Responses - Not Started  
- **🟨 Phase 4**: Conversation Management - 60% Complete
- **🟨 Phase 5**: Web Search - 20% Complete (UI only)
- **🟨 Phase 6**: Developer Tools - 20% Complete (logging only)
- **❌ Phase 7**: Polish & UX - Not Started

**What's Working Now**:
- Basic chat with OpenAI Responses/Conversations API
- Non-streaming responses
- Conversation create/switch/delete
- Settings configuration with API key
- Stateless operation (no client persistence)
- Lazy conversation creation (on first message only)

**Key Limitations**:
- No streaming (responses appear all at once)
- Page refresh loses everything (by design, but no recovery yet)
- Web search toggle exists but doesn't work
- Logs only visible in browser console

### Phase 1: Core Foundation (MVP) ✅ COMPLETE
**Priority: Critical** | **Status: Fully Implemented**
- [x] Basic React app structure with TypeScript
  - React 19, TypeScript, Vite, Tailwind CSS v4
  - Removed StrictMode to prevent double network requests
- [x] Settings context and configuration UI
  - Full settings modal with API key, base URL, model configuration
  - Test connection functionality
  - Settings stored in React context (no persistence)
- [x] OpenAI client with Conversations API integration
  - Custom client wrapper in `/src/lib/openai-client.ts`
  - Full CRUD operations for conversations and responses
  - Request/response logging capability
- [x] Create and load conversations
  - Lazy creation on first message (not on app load)
  - Load conversation items from API
- [x] Basic message display (no streaming)
  - Clean message bubbles with user/assistant distinction
  - Timestamps and avatars
  - Welcome message when empty
- [x] Simple request/response without streaming
  - Working with actual OpenAI API
  - Non-streaming responses appear after generation

### Phase 2: Streaming & Real-Time ❌ NOT STARTED
**Priority: High** | **Status: Not Implemented**
- [ ] SSE streaming implementation
- [ ] Streaming message display (token-by-token)
- [ ] Cancel/abort functionality
- [ ] Stream error handling and recovery
- [ ] Smooth UI updates during streaming

**Note**: Streaming toggle exists in settings but functionality not implemented

### Phase 3: Background Responses ❌ NOT STARTED
**Priority: Critical** | **Status: Not Implemented**
- [ ] Background response initiation
- [ ] Response ID persistence (URL params)
- [ ] Page refresh recovery
- [ ] Re-attachment to active streams
- [ ] Background response status UI

**Note**: Critical for stateless operation but not yet implemented

### Phase 4: Conversation Management 🟨 MOSTLY COMPLETE
**Priority: High** | **Status: 60% Implemented**
- [x] Conversation switching UI
  - Click to switch between conversations
  - Active conversation highlighted
- [x] Conversation list in sidebar
  - Shows all conversations with message count
  - Status indicators (generating, active, error)
- [x] Delete conversation functionality
  - Hover to show delete button
  - Removes from API and UI
- [ ] Clear conversation option (keep ID, clear messages)
- [ ] Conversation title generation from first message

### Phase 5: Web Search Integration 🟨 PARTIAL
**Priority: Medium** | **Status: 20% Implemented**
- [x] Web search tool configuration
  - Toggle in settings modal
  - Toggle button in input area
  - Passed to API in request
- [ ] Search status indicators ("Searching web...")
- [ ] Source citation display
- [ ] Expandable sources panel
- [ ] Search result formatting

**Note**: UI controls exist but web search results not yet handled

### Phase 6: Developer Tools 🟨 PARTIAL
**Priority: Medium** | **Status: 20% Implemented**
- [x] Request/response logging system
  - Logs stored in memory (max 100 entries)
  - Captures method, URL, headers, body, status, duration
  - Toggle via settings
- [ ] Developer console UI (logs only in browser console)
- [ ] Log filtering and search
- [ ] Export functionality
- [ ] Performance metrics

### Phase 7: Polish & UX ❌ NOT STARTED
**Priority: Low** | **Status: Not Implemented**
- [ ] Refined visual design
- [ ] Loading states and transitions
- [ ] Error message improvements
- [ ] Keyboard shortcuts (except Enter to send)
- [ ] Mobile responsive design
- [ ] Accessibility improvements

**Current UX Features**:
- Basic generating indicator (three dots)
- Enter to send, Shift+Enter for newline
- Clean OpenAI green color scheme

---

## Future Enhancements

### Noted for Future (Out of Scope for MVP)
1. **Encrypted Reasoning Tokens**: Handle stateless reasoning model support
2. **Multi-modal Support**: Image upload and generation
3. **Speech Integration**: Voice input/output
4. **Export/Import**: Conversation backup and restore
5. **Advanced Prompt Management**: Templates and variables
6. **Conversation Search**: Find messages across conversations
7. **Analytics Dashboard**: Usage statistics and costs
8. **Collaborative Features**: Share conversations (would require backend)
9. **Custom System Prompts**: Per-conversation instructions
10. **Plugin System**: Extensible tool integration

### Technical Debt Considerations
1. **Testing**: Add comprehensive test suite
2. **Performance**: Optimize for large conversations
3. **Security**: API key encryption in memory
4. **Monitoring**: Error tracking integration
5. **Documentation**: API compatibility notes

---

## Success Criteria

### Functional Success
- [x] Can create and manage conversations without any persistence
- [ ] Can refresh page during generation and recover response
- [ ] Streaming works smoothly with cancellation
- [ ] Web search integration functions correctly (partial - toggle implemented)
- [x] Settings are configurable and work as expected
- [x] Developer logs capture all API interactions

### UX Success
- [x] Interface is intuitive and responsive
- [x] State indicators are clear and helpful (generating, message timestamps)
- [ ] Error messages are actionable
- [ ] Performance feels snappy despite stateless nature
- [ ] Recovery from errors is graceful

### Technical Success
- [ ] Clean separation of concerns in architecture
- [ ] No client-side persistence (truly stateless)
- [ ] Proper TypeScript typing throughout
- [ ] Efficient state management
- [ ] Robust error handling

### Compatibility Testing Success
- [ ] All API calls are properly formatted
- [ ] Request/response logging aids debugging
- [ ] Custom endpoint configuration works
- [ ] Edge cases are handled gracefully

---

## Appendix

### API Reference Links
- [Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [Conversations API Documentation](https://platform.openai.com/docs/api-reference/conversations)
- [Streaming Documentation](https://platform.openai.com/docs/guides/streaming)
- [Web Search Tool Documentation](https://platform.openai.com/docs/guides/tools)

### Example API Calls

#### TypeScript SDK Examples (Using OpenAI Node Library)

##### Create Conversation and First Response
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: settings.api.base_url // Configurable
});

// Step 1: Create conversation
const conversation = await client.conversations.create({
  metadata: { topic: "chat" }
});

// Step 2: Create response with conversation
const response = await client.responses.create({
  model: "gpt-4o",
  conversation: conversation.id,
  input: [{ role: "user", content: "Hello!" }],
  stream: true,
  store: true,
  tools: [{ type: "web_search" }]
});

// Handle streaming
for await (const chunk of response) {
  // Process streaming chunks
  console.log(chunk);
}
```

##### Load Conversation Items
```typescript
// Retrieve conversation items after page refresh
const items = await client.conversations.items.list({
  conversation_id: conversation.id
});

// Process and display items
for (const item of items.data) {
  if (item.type === 'message') {
    // Display message in UI
  }
}
```

##### Clear Conversation (Delete All Items)
```typescript
// Clear all items from a conversation
await client.conversations.items.delete(conversation.id);
// Conversation still exists but is now empty
```

##### Delete Entire Conversation
```typescript
// Permanently delete a conversation
const deleted = await client.conversations.delete(conversation.id);
console.log(`Deleted conversation: ${deleted.id}`);
```

#### Raw Fetch API Examples

##### Create Conversation and First Response
```javascript
// Step 1: Create conversation
const conversation = await fetch('https://api.openai.com/v1/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
});

const { id: conversation_id } = await conversation.json();

// Step 2: Create response with conversation
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    conversation: conversation_id,
    input: [{ role: 'user', content: 'Hello!' }],
    stream: true,
    store: true,
    tools: [{ type: 'web_search' }]
  })
});
```

##### Handle Background Response After Refresh
```javascript
// On page load, check URL params
const urlParams = new URLSearchParams(window.location.search);
const response_id = urlParams.get('response_id');
const conversation_id = urlParams.get('conversation_id');

if (response_id) {
  // Using SDK
  const response = await client.responses.retrieve(response_id);
  
  if (response.status === 'in_progress') {
    // Re-attach to stream (implementation depends on SDK version)
    // May need to use raw EventSource for streaming reconnection
    const eventSource = new EventSource(
      `${settings.api.base_url}/v1/responses/${response_id}/events`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    
    eventSource.onmessage = (event) => {
      // Handle streaming data
    };
  }
}
```

---

*End of Product Requirements Document v1.0.0*