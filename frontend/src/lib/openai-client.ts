import OpenAI from 'openai';

import type { AppSettings } from '../types';

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
  type: 'message' | 'tool_call' | 'tool_output' | 'web_search_call';
  role?: string;
  content?: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  created_at: number;
  status?: string;
  action?: {
    type?: string;
    query?: string;
    url?: string;
  };
}

export class OpenAIClient {
  private client: OpenAI;

  constructor(settings: AppSettings) {
    this.client = new OpenAI({
      apiKey: settings.api.apiKey,
      baseURL: settings.api.baseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  async createConversation(): Promise<ConversationResponse> {
    const url = '/conversations';

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create conversation');
    }

    return data;
  }

  async getConversation(id: string): Promise<ConversationResponse> {
    const url = `/conversations/${id}`;

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get conversation');
    }

    return data;
  }

  async deleteConversation(id: string): Promise<void> {
    const url = `/conversations/${id}`;

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    const data = response.status !== 204 ? await response.json() : null;

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Failed to delete conversation');
    }
  }

  async deleteConversationItem(
    conversationId: string,
    itemId: string,
  ): Promise<ConversationResponse> {
    const url = `/conversations/${conversationId}/items/${itemId}`;

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Failed to delete conversation item');
    }

    return data;
  }

  async updateConversation(
    id: string,
    metadata: Record<string, string>,
  ): Promise<ConversationResponse> {
    const url = `/conversations/${id}`;
    const body = { metadata };

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Failed to update conversation');
    }

    return data;
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

    const response = await fetch(`${this.client.baseURL}/conversations/${id}/items?${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    const data = await response.json();

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
  }

  async createResponse(params: ResponseCreateParams): Promise<Response | unknown> {
    const url = '/responses';
    const { signal, ...bodyParams } = params;

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

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create response');
      }

      return data;
    }
  }

  async getResponse(id: string): Promise<unknown> {
    const url = `/responses/${id}`;

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get response');
    }

    return data;
  }

  async cancelResponse(id: string): Promise<void> {
    const url = `/responses/${id}/cancel`;

    const response = await fetch(`${this.client.baseURL}${url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.apiKey}`,
      },
    });

    const data = response.status !== 204 ? await response.json() : null;

    if (!response.ok) {
      throw new Error(data?.error?.message || 'Failed to cancel response');
    }
  }
}
