import { CheckCircle, Globe, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { WebSearchCall } from '../types';

interface WebSearchIndicatorProps {
  searches: WebSearchCall[];
}

export function WebSearchIndicator({ searches }: WebSearchIndicatorProps) {
  if (!searches || searches.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {searches.map((search) => (
        <Card
          key={search.id}
          className={cn(
            'p-3 border transition-all',
            search.status === 'searching' && 'border-primary/50 bg-primary/5',
            search.status === 'completed' && 'border-green-500/30 bg-green-50/50',
            search.status === 'in_progress' && 'border-muted-foreground/30 bg-muted/30',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {search.status === 'searching' ? (
                <div className="relative">
                  <Search className="h-4 w-4 text-primary animate-pulse" />
                  <div className="absolute inset-0 h-4 w-4 rounded-full bg-primary/20 animate-ping" />
                </div>
              ) : search.status === 'completed' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {search.status === 'searching' && 'Searching the web'}
                  {search.status === 'in_progress' && 'Preparing search'}
                  {search.status === 'completed' && 'Search completed'}
                </span>
                <Badge variant="secondary" className="text-xs h-5">
                  {search.status === 'searching' && 'Active'}
                  {search.status === 'in_progress' && 'Pending'}
                  {search.status === 'completed' && 'Done'}
                </Badge>
              </div>
              {search.action?.query && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  "{search.action.query}"
                </p>
              )}
              {search.action?.url && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{search.action.url}</p>
              )}
            </div>

            {search.status === 'searching' && (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150" />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
