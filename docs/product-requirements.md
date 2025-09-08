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
10. [Technical Architecture](#technical-architecture)
11. [Error Handling & Edge Cases](#error-handling--edge-cases)
12. [Implementation Phases](#implementation-phases)
13. [Future Enhancements](#future-enhancements)

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

### ⚠️ CRITICAL BUGS & LIMITATIONS DISCOVERED

**See [OPENAI_BUG_REPORT.md](../OPENAI_BUG_REPORT.md) for detailed bug report with CURL reproduction steps.**

#### 1. Background Mode Bug (Confirmed by Community)
**Background mode with Conversations API has a severe bug**: When using `background: true` with the Conversations API, messages are NOT stored in the conversation items, even with `store: true`. 

This bug has been independently confirmed by multiple developers:
- [Community Report 1](https://community.openai.com/t/v1-responses-with-background-true-does-not-append-i-o-to-conversation-works-when-background-false/1355306)
- [Community Report 2](https://community.openai.com/t/response-object-with-background-true-not-saving-data-with-conversation-id/1356559)

Impact:
- Messages sent with background mode don't appear in conversation history
- Page refresh loses all context from background responses
- The conversation becomes broken/incomplete

#### 2. Streaming Termination on Refresh
**Streaming responses are KILLED when the page refreshes**: This is a fundamental limitation of SSE/streaming:
- When user refreshes during a long generation, the streaming connection is terminated
- The server STOPS generating the response entirely (not just disconnected)
- There's NO way to resume or reconnect to an in-progress stream
- The partial response is lost and generation must be restarted

#### Combined Impact
**It's currently IMPOSSIBLE to have responses continue generating while user is "away"**:
- `background: true` doesn't store messages properly (Bug #1)
- `stream: true` gets killed on page refresh (Bug #2)
- No workaround exists for "close tab and come back later" use case
- Long-running responses require the tab to stay open

### Current Implementation
We've **removed all background mode functionality** and rely solely on:
```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  conversation: conversation_id,
  input: [{ role: "user", content: "..." }],
  stream: true,
  store: true  // Works correctly WITHOUT background: true
});
```

### What We Implemented Instead

**Continuous Polling Solution**:
Since we can't resume interrupted streams or use background mode, we implemented:
1. **Polling every 5 seconds** for new conversation items
2. **Proper pagination** using the `after` parameter
3. **Smart deduplication** to handle local vs server IDs
4. **Works across devices/tabs** - if response completes in another tab, polling picks it up

**Benefits of our approach**:
- ✅ Picks up messages that complete while user is on the page
- ✅ Works across multiple tabs/devices
- ✅ Handles pagination properly with `has_more` flag
- ✅ Efficient polling using `after` parameter

**Limitations that remain**:
- ❌ Can't continue generation if user closes tab
- ❌ Refreshing page kills in-progress responses
- ❌ No way to have long-running responses complete in background
- ❌ User must keep tab open for generation to complete

### Potential Future Solutions

**OpenAI would need to fix**:
1. Make `background: true` work properly with Conversations API
2. OR provide a way to resume/reconnect to in-progress streams
3. OR have streams continue server-side even when client disconnects

**Workarounds we considered but can't implement**:
- Store response ID in URL and poll for status (but responses created with `stream: true` don't return a response ID we can poll)
- Use background mode (but it's broken with Conversations API)
- Keep generating server-side after disconnect (but OpenAI terminates the generation)

### Phase 3 Status: ✅ FULLY COMPLETE

**Implementation Date**: 2025-09-07

**What was completed**:
- ✅ Identified and documented critical OpenAI API bugs
- ✅ Created comprehensive bug report with CURL reproduction steps ([OPENAI_BUG_REPORT.md](../OPENAI_BUG_REPORT.md))
- ✅ Removed all background mode code (due to critical bug)
- ✅ Implemented robust polling solution as best available workaround:
  - ✅ Continuous polling every 5 seconds for new conversation items
  - ✅ Proper pagination handling with `after` parameter and `has_more` flag
  - ✅ Smart deduplication of local vs server messages
  - ✅ Replace local UUIDs with server IDs when messages sync
  - ✅ Cross-device/tab message synchronization
- ✅ Fixed conversation persistence:
  - ✅ Conversation ID persists in URL
  - ✅ Page refresh loads conversation history correctly
  - ✅ Fixed message ordering (oldest to newest)
  - ✅ Fixed timestamp handling for loaded messages

**What cannot be fixed (OpenAI API limitations)**:
- ❌ Background mode doesn't work with Conversations API (confirmed bug)
- ❌ Streaming responses terminate on page refresh (API design limitation)
- ❌ No way to resume in-progress generations
- ❌ Can't have responses continue while tab is closed

**Conclusion**: Phase 3 is **FULLY COMPLETE**. We've implemented the best possible solution given the API limitations and thoroughly documented the issues for OpenAI to address. Any further improvements require fixes on OpenAI's side.

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
}
```

### Settings UI Components
1. **API Configuration Panel**
   - Base URL input with validation
   - API key input (masked, with test button)
   - Model selector/input
   - Stream toggle

2. **Tools Panel**
   - Web search toggle

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
  ui: {
    sidebarOpen: boolean;
    settingsOpen: boolean;
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
- **✅ Phase 2**: Streaming - **COMPLETE**
- **✅ Phase 3**: Background Responses - **COMPLETE** (with documented API limitations)
- **✅ Phase 4**: Conversation Management - **COMPLETE**
- **✅ Phase 5**: Web Search - **COMPLETE**
- **❌ Phase 6**: Developer Tools - Removed (decided to simplify, no logging needed)
- **❌ Phase 7**: Polish & UX - Not Started

**What's Working Now**:
- Basic chat with OpenAI Responses/Conversations API
- **Streaming responses with SSE (token-by-token display)**
- **Cancel button during generation**
- **Full conversation management (create/switch/delete/clear)**
- **Automatic title generation from first message**
- **Delete individual messages from conversations**
- **Proper "New Conversation" behavior (no premature API calls)**
- **Web search integration with real-time status indicators**
- **Web search UI that works with streaming and loaded conversations**
- Settings configuration with API key
- Stateless operation (no client persistence)
- Lazy conversation creation (on first message only)
- **Continuous polling for new messages (every 5 seconds)**
- **Proper pagination with full `has_more` handling**
- **Smart message deduplication (local vs server IDs)**
- **Cross-device/tab synchronization**
- **Title persistence across page refreshes**

**Key Limitations (Due to OpenAI API)**:
- Page refresh kills in-progress streaming responses (OpenAI limitation)
- Background mode is broken with Conversations API (OpenAI bug)
- No way to have responses continue generating while tab is closed
- Web search source citations require additional API data not provided

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

### Phase 2: Streaming & Real-Time ✅ COMPLETE
**Priority: High** | **Status: Fully Implemented**
- [x] SSE streaming implementation
  - Custom SSE parser for Responses API format
  - Handles `response.output_text.delta` events
  - Proper completion detection with `response.completed`
- [x] Streaming message display (token-by-token)
  - Real-time content updates as tokens arrive
  - Immutable state updates for React re-rendering
  - Visual streaming indicator (animated dots)
- [x] Cancel/abort functionality
  - Cancel button appears during generation
  - Aborts both HTTP request and streaming
  - Proper cleanup of aborted requests
- [x] Stream error handling and recovery
  - Distinguishes between abort and actual errors
  - Updates conversation status appropriately
  - Graceful error handling without UI breaks
- [x] Smooth UI updates during streaming
  - Efficient state management
  - Auto-scroll to latest message
  - No flickering or performance issues

**Implementation Date**: 2025-09-07

### Phase 3: Background Responses ✅ COMPLETE
**Priority: Critical** | **Status: Fully Implemented (with API limitations)**
- [x] ~~Background response initiation~~ - Removed due to OpenAI bug
- [x] Implemented polling solution instead:
  - Continuous polling every 5 seconds
  - Proper pagination with `after` parameter
  - Smart message deduplication
- [x] ~~Response ID persistence~~ - Not possible with streaming
- [x] Page refresh recovery (for completed messages only)
- [x] Cross-device/tab synchronization
- [x] Documented OpenAI API bugs ([OPENAI_BUG_REPORT.md](../OPENAI_BUG_REPORT.md))

**Note**: Implemented best possible solution given OpenAI API limitations

### Phase 4: Conversation Management ✅ COMPLETE
**Priority: High** | **Status: Fully Implemented**

**Implementation Date**: 2025-09-07

- [x] Conversation switching UI
  - Click to switch between conversations
  - Active conversation highlighted
- [x] Conversation list in sidebar
  - Shows all conversations with generated titles
  - Status indicators (generating, active, error)
  - Titles persist across page refreshes
- [x] Delete conversation functionality
  - Hover to show delete button in sidebar
  - Removes entire conversation from API and UI
  - Properly handles active conversation deletion
- [x] Delete individual messages
  - Hover to show delete button on messages
  - Uses DELETE `/v1/conversations/{conversation_id}/items/{item_id}`
  - Properly updates polling with server IDs only
  - Handles last message deletion edge case
- [x] Conversation title generation from first message
  - Automatic generation after conversation creation
  - Uses Responses API without storing to conversation
  - Updates conversation metadata with POST `/v1/conversations/{conversation_id}`
  - Shows in sidebar immediately and persists across refreshes
- [x] Proper "New Conversation" behavior
  - Button no longer creates premature API calls
  - Just resets UI to fresh state
  - Conversation created only on first message send

### Phase 5: Web Search Integration ✅ COMPLETE
**Priority: Medium** | **Status: Fully Implemented**

**Implementation Date**: 2025-09-08

- [x] Web search tool configuration
  - Toggle in settings modal
  - Toggle button in input area
  - Passed to API in request
- [x] Search status indicators
  - Real-time "Searching web..." animations
  - Progress states (in_progress, searching, completed)
  - Visual indicators with appropriate icons
- [x] Web search event handling
  - Handles streaming events (response.web_search_call.*)
  - Processes web search items from conversation items endpoint
  - Proper attachment to assistant messages
- [x] Web search UI components
  - WebSearchIndicator component with animated states
  - Displays search queries and status
  - Integrated into message list above assistant responses
- [x] Consistent handling across data sources
  - Works with real-time streaming
  - Works with page refresh/load from items endpoint
  - Works with polling updates

**Note**: Full web search UI implemented. Source citations and expandable panels would require additional API data not currently provided in web search events

### Phase 6: Developer Tools ❌ REMOVED
**Priority: Low** | **Status: Removed from scope**
- Decision made to simplify the application and remove logging functionality
- No developer console or request/response logging implemented
- Settings focused only on essential configuration (API key, host, model)

### Phase 7: Polish & UX ❌ NOT STARTED
**Priority: Low** | **Status: Not Implemented**
- [ ] Refined visual design
- [ ] Loading states and transitions
- [ ] Error message improvements

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
- [ ] Can refresh page during generation and recover response (limited by API)
- [x] Streaming works smoothly with cancellation
- [x] Conversation titles generate and persist correctly
- [x] Individual messages can be deleted
- [x] Proper ID management (local vs server IDs)
- [x] Web search integration functions correctly (toggle implemented)
- [x] Settings are configurable and work as expected

### UX Success
- [x] Interface is intuitive and responsive
- [x] State indicators are clear and helpful (generating, message timestamps)
- [x] Error messages are actionable
- [x] Performance feels snappy despite stateless nature
- [x] Recovery from errors is graceful
- [x] "New Conversation" button works as expected (no premature API calls)
- [x] Titles show in sidebar and persist across refreshes

### Technical Success
- [x] Clean separation of concerns in architecture
- [x] No client-side persistence (truly stateless)
- [x] Proper TypeScript typing throughout
- [x] Efficient state management
- [x] Robust error handling

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
