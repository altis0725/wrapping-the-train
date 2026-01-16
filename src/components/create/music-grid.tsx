"use client";

import { MusicCard } from "./music-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";

interface MusicGridProps {
  templates: TemplateWithResolvedThumbnail[];
  selectedId: number | null;
  onSelect: (template: TemplateWithResolvedThumbnail) => void;
  isLoading?: boolean;
}

export function MusicGrid({
  templates,
  selectedId,
  onSelect,
  isLoading,
}: MusicGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        音楽テンプレートがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <MusicCard
          key={template.id}
          template={template}
          isSelected={selectedId === template.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
