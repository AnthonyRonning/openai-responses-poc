export interface StreamChunk {
  // Responses API format
  type?: string;
  delta?: string;
  text?: string;
  sequence_number?: number;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  response?: {
    id?: string;
    status?: string;
    [key: string]: unknown;
  };
}

export class SSEParser {
  private buffer: string = '';

  feed(chunk: string): StreamChunk[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    const chunks: StreamChunk[] = [];

    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          chunks.push(parsed);
        } catch (e) {
          console.error('Failed to parse SSE chunk:', e);
        }
      }
    }

    return chunks;
  }

  reset() {
    this.buffer = '';
  }
}

export async function* streamResponse(
  response: Response,
  onChunk?: (chunk: StreamChunk) => void,
): AsyncGenerator<StreamChunk, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  const parser = new SSEParser();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const chunks = parser.feed(text);

      for (const chunk of chunks) {
        if (onChunk) {
          onChunk(chunk);
        }
        yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function extractContentFromChunk(chunk: StreamChunk): string {
  // Handle Responses API format
  if (chunk.type === 'response.output_text.delta' && chunk.delta) {
    return chunk.delta;
  }
  return '';
}

export class StreamManager {
  private abortController: AbortController | null = null;

  async startStream(
    response: Response,
    onContent: (content: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void,
    onChunk?: (chunk: StreamChunk) => void,
  ): Promise<void> {
    this.abortController = new AbortController();

    try {
      for await (const chunk of streamResponse(response)) {
        if (this.abortController.signal.aborted) {
          break;
        }

        // Call chunk handler if provided (for extracting metadata)
        if (onChunk) {
          onChunk(chunk);
        }

        const content = extractContentFromChunk(chunk);
        if (content) {
          onContent(content);
        }

        // Check for Responses API completion
        if (chunk.type === 'response.completed' || chunk.type === 'response.output_item.done') {
          onComplete?.();
          break;
        }
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isStreaming(): boolean {
    return this.abortController !== null;
  }
}
