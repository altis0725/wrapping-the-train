"use client";

import { TemplateCard } from "./template-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Template } from "@/db/schema";

interface TemplateGridProps {
  templates: Template[];
  selectedId: number | null;
  onSelect: (template: Template) => void;
  isLoading?: boolean;
}

export function TemplateGrid({
  templates,
  selectedId,
  onSelect,
  isLoading,
}: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        テンプレートがありません
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedId === template.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
