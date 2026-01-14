"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Template } from "@/db/schema";
import { Check } from "lucide-react";
import type { KeyboardEvent } from "react";

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: (template: Template) => void;
}

export function TemplateCard({
  template,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(template);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${template.title}を選択${isSelected ? "（選択中）" : ""}`}
      data-testid="template-card"
      className={cn(
        "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(template)}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-0 relative">
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          {template.thumbnailUrl ? (
            <Image
              src={template.thumbnailUrl}
              alt={`${template.title}のテンプレートプレビュー`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No Preview</span>
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{template.title}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
