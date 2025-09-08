import { FileText, Globe, Search } from 'lucide-react';

import type { WebSearchCall } from '../types';

interface WebSearchIndicatorProps {
  searches: WebSearchCall[];
}

export function WebSearchIndicator({ searches }: WebSearchIndicatorProps) {
  if (!searches || searches.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {searches.map((search) => (
        <div
          key={search.id}
          className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex-shrink-0">
            {search.status === 'searching' ? (
              <div className="relative">
                <Search className="w-5 h-5 text-blue-600 animate-pulse" />
                <div className="absolute inset-0 w-5 h-5 rounded-full bg-blue-400 opacity-20 animate-ping" />
              </div>
            ) : search.status === 'completed' ? (
              <Globe className="w-5 h-5 text-green-600" />
            ) : (
              <FileText className="w-5 h-5 text-blue-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900">
              {search.status === 'searching' && 'Searching the web...'}
              {search.status === 'in_progress' && 'Preparing web search...'}
              {search.status === 'completed' && 'Web search completed'}
            </div>
            {search.action?.query && (
              <div className="text-xs text-gray-600 truncate">Query: "{search.action.query}"</div>
            )}
            {search.action?.url && (
              <div className="text-xs text-gray-600 truncate">URL: {search.action.url}</div>
            )}
          </div>

          {search.status === 'searching' && (
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
