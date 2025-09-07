# OpenAI API Bug Report: Critical Issues with Conversations API

## Summary
Two critical bugs prevent the Conversations API from being used for long-running or background responses:

1. **Background mode with Conversations API doesn't store messages** - Messages are lost when using `background: true` with `conversation` parameter
2. **Streaming responses terminate on client disconnect** - No way to have responses continue generating when user closes tab/refreshes

## Bug 1: Background Mode Fails to Store Messages with Conversations API

### Description
When creating a response with both `background: true` and a `conversation` ID, the messages are NOT stored in the conversation items, even with `store: true`. This makes background mode completely unusable with the Conversations API.

### Reproduction Steps

```bash
# Step 1: Create a conversation
curl https://api.openai.com/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{}'

# Response: {"id":"conv_abc123","created_at":1234567890}

# Step 2: Create a background response with the conversation
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "conversation": "conv_abc123",
    "input": [{"role": "user", "content": "Write a long story about space otters"}],
    "background": true,
    "store": true
  }'

# Response: {"id":"resp_xyz789","status":"queued"}

# Step 3: Poll for completion
curl https://api.openai.com/v1/responses/resp_xyz789 \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Wait until status is "completed"

# Step 4: Check conversation items (BUG: Messages are missing!)
curl https://api.openai.com/v1/conversations/conv_abc123/items \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Response: {"data":[],"has_more":false}
# EXPECTED: Should contain the user message and assistant response
# ACTUAL: Empty array - messages were not stored!
```

### Expected Behavior
- Messages should be stored in the conversation when using `background: true` with `store: true`
- The conversation items should be retrievable after the background response completes

### Actual Behavior
- Messages are NOT stored in the conversation
- The conversation remains empty despite `store: true`
- This makes background mode unusable with Conversations API

## Bug 2: Streaming Responses Terminate on Client Disconnect

### Description
When a streaming response is in progress and the client disconnects (page refresh, tab close, network interruption), the server STOPS generating the response entirely. There's no way to resume or reconnect to the in-progress generation.

### Reproduction Steps

```bash
# Step 1: Create a conversation
curl https://api.openai.com/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{}'

# Response: {"id":"conv_def456","created_at":1234567890}

# Step 2: Start a streaming response (long prompt to ensure it takes time)
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Accept: text/event-stream" \
  -d '{
    "model": "gpt-4o",
    "conversation": "conv_def456",
    "input": [{"role": "user", "content": "Write a detailed 5000 word essay about the history of computer science, covering all major developments from the 1940s to present day"}],
    "stream": true,
    "store": true
  }'

# Step 3: After ~2 seconds of streaming, press Ctrl+C to disconnect

# Step 4: Try to get conversation items
curl https://api.openai.com/v1/conversations/conv_def456/items \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Response shows only the user message, no assistant response or partial response
# The generation was terminated, not just disconnected!

# Step 5: Wait 30 seconds and check again
sleep 30
curl https://api.openai.com/v1/conversations/conv_def456/items \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Still no assistant response - generation was permanently terminated
```

### Expected Behavior (One of these):
1. **Option A**: Generation continues server-side and completes even after client disconnect
2. **Option B**: Ability to resume/reconnect to the in-progress stream
3. **Option C**: Partial response is stored and marked as incomplete

### Actual Behavior
- Generation is immediately terminated when client disconnects
- No partial response is stored
- No way to resume or recover the generation
- User must restart the entire request

## Impact

These bugs make it impossible to:
- Have long-running responses complete in the background
- Allow users to close their browser and return later
- Handle network interruptions gracefully
- Build reliable applications for long-form content generation

## Attempted Workarounds (Failed)

### Workaround 1: Use background mode
- **Result**: Fails due to Bug #1 - messages aren't stored

### Workaround 2: Poll conversation items while streaming
- **Result**: Doesn't help - when streaming connection is lost, generation stops entirely

### Workaround 3: Try to resume using response ID
- **Result**: Streaming responses don't return a response ID that can be polled

## Related Community Reports

This bug has been reported by multiple developers in the OpenAI Community:
- https://community.openai.com/t/v1-responses-with-background-true-does-not-append-i-o-to-conversation-works-when-background-false/1355306
- https://community.openai.com/t/response-object-with-background-true-not-saving-data-with-conversation-id/1356559

Multiple independent developers have confirmed this issue, indicating it's a systemic problem with the API, not an implementation error.

## Environment
- API Version: v1
- Endpoints affected: `/v1/responses`, `/v1/conversations/*/items`
- Models tested: gpt-4o, gpt-4o-mini
- Date: 2025-09-07

## Suggested Fixes

1. **Fix background mode** to properly store messages in conversations
2. **Allow streaming to continue** server-side after client disconnect
3. **Provide resume capability** for interrupted streams
4. **Store partial responses** when streams are interrupted

## Business Case

Many use cases require long-running generations that may outlive a browser session:
- Research papers and long-form content
- Code generation for large projects
- Data analysis and reporting
- Multi-step reasoning tasks

Currently, users must keep their browser tab open for the entire duration, which is poor UX and unreliable.

## Contact
[Your contact information]

---

**Note**: This bug report includes minimal reproducible examples using CURL commands that can be run directly to demonstrate both issues.