import OpenAI from 'openai';

import type { AppSettings, LogEntry } from '../types';

export interface ConversationResponse {
  id: string;
  created_at: number;
  metadata?: {
    title?: string;
    [key: string]: string | undefined;
  };
}

export interface ResponseCreateParams {
  model: string;
  conversation?: string;
  input: Array<{ role: string; content: string }>;
  stream?: boolean;
  store?: boolean;
  background?: boolean;
  tools?: Array<{ type: string }>;
  previous_response_id?: string;
  signal?: AbortSignal;
}

export interface ConversationItem {
  id: string;
  type: 'message' | 'tool_call' | 'tool_output';
  role?: string;
  content?: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  created_at: number;
  status?: string;
}

export class OpenAIClient {
  private client: OpenAI;
  private logger?: (entry: LogEntry) => void;

  constructor(settings: AppSettings, logger?: (entry: LogEntry) => void) {
    this.client = new OpenAI({
      apiKey: settings.api.apiKey,
      baseURL: settings.api.baseUrl,
      dangerouslyAllowBrowser: true,
    });
    this.logger = logger;
  }

  private logRequest(method: string, url: string, body?: unknown) {
    if (this.logger) {
      this.logger({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'request',
        method,
        url,
        body,
      });
    }
  }

  private logResponse(
    method: string,
    url: string,
    status: number,
    body?: unknown,
    duration?: number,
  ) {
    if (this.logger) {
      this.logger({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'response',
        method,
        url,
        status,
        body,
        duration,
      });
    }
  }

  async createConversation(): Promise<ConversationResponse> {
    const url = '/conversations';
    this.logRequest('POST', url, {});
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      this.logResponse('POST', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create conversation');
      }

      return data;
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'POST',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async getConversation(id: string): Promise<ConversationResponse> {
    const url = `/conversations/${id}`;
    this.logRequest('GET', url);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });

      const data = await response.json();
      this.logResponse('GET', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get conversation');
      }

      return data;
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'GET',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async deleteConversation(id: string): Promise<void> {
    const url = `/conversations/${id}`;
    this.logRequest('DELETE', url);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });

      const data = response.status !== 204 ? await response.json() : null;
      this.logResponse('DELETE', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to delete conversation');
      }
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'DELETE',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async deleteConversationItem(
    conversationId: string,
    itemId: string,
  ): Promise<ConversationResponse> {
    const url = `/conversations/${conversationId}/items/${itemId}`;
    this.logRequest('DELETE', url);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });

      const data = await response.json();
      this.logResponse('DELETE', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to delete conversation item');
      }

      return data;
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'DELETE',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async updateConversation(
    id: string,
    metadata: Record<string, string>,
  ): Promise<ConversationResponse> {
    const url = `/conversations/${id}`;
    const body = { metadata };
    this.logRequest('POST', url, body);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      this.logResponse('POST', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to update conversation');
      }

      return data;
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'POST',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async getConversationItems(
    id: string,
    after?: string,
    limit: number = 100,
  ): Promise<{ items: ConversationItem[]; hasMore: boolean; lastId?: string }> {
    const params = new URLSearchParams({ order: 'asc', limit: String(limit) });
    if (after) {
      params.set('after', after);
    }
    const url = `/conversations/${id}/items?${params}`;
    this.logRequest('GET', url);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}/conversations/${id}/items?${params}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });

      const data = await response.json();
      this.logResponse('GET', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get conversation items');
      }

      // Handle pagination - fetch all pages if has_more is true
      let allItems = data.data || [];
      let currentLastId = data.last_id;
      let hasMore = data.has_more;

      while (hasMore) {
        const nextParams = new URLSearchParams({
          order: 'asc',
          limit: String(limit),
          after: currentLastId,
        });

        const nextResponse = await fetch(
          `${this.client.baseURL}/conversations/${id}/items?${nextParams}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.client.apiKey}`,
            },
          },
        );

        const nextData = await nextResponse.json();

        if (!nextResponse.ok) {
          throw new Error(nextData.error?.message || 'Failed to get conversation items');
        }

        allItems = [...allItems, ...(nextData.data || [])];
        currentLastId = nextData.last_id;
        hasMore = nextData.has_more;
      }

      return {
        items: allItems,
        hasMore: false, // We fetched all pages
        lastId: currentLastId,
      };
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'GET',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async createResponse(params: ResponseCreateParams): Promise<Response | unknown> {
    const url = '/responses';
    const { signal, ...bodyParams } = params;
    this.logRequest('POST', url, bodyParams);
    const startTime = Date.now();

    try {
      if (params.stream) {
        const response = await fetch(`${this.client.baseURL}${url}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.client.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyParams),
          signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to create response');
        }

        return response;
      } else {
        const response = await fetch(`${this.client.baseURL}${url}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.client.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyParams),
          signal,
        });

        const data = await response.json();
        this.logResponse('POST', url, response.status, data, Date.now() - startTime);

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to create response');
        }

        return data;
      }
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'POST',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async getResponse(id: string): Promise<unknown> {
    const url = `/responses/${id}`;
    this.logRequest('GET', url);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });

      const data = await response.json();
      this.logResponse('GET', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get response');
      }

      return data;
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'GET',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }

  async cancelResponse(id: string): Promise<void> {
    const url = `/responses/${id}/cancel`;
    this.logRequest('POST', url);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.client.baseURL}${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.client.apiKey}`,
        },
      });

      const data = response.status !== 204 ? await response.json() : null;
      this.logResponse('POST', url, response.status, data, Date.now() - startTime);

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to cancel response');
      }
    } catch (error) {
      if (this.logger) {
        this.logger({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'error',
          method: 'POST',
          url,
          body: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  }
}
