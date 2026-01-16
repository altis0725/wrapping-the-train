"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";
import { Check, Plus } from "lucide-react";
import type { KeyboardEvent } from "react";

const BACKGROUND_COUNT = 6;

interface BackgroundGridProps {
  templates: TemplateWithResolvedThumbnail[];
  selectedBackgrounds: (TemplateWithResolvedThumbnail | null)[];
  activeSlot: number | null;
  onSlotClick: (slotIndex: number) => void;
  onTemplateSelect: (template: TemplateWithResolvedThumbnail) => void;
}

/**
 * 背景6個を選択するためのグリッドUI
 *
 * 表示:
 * ┌───┬───┬───┐
 * │ 1 │ 2 │ 3 │  <- 選択済み背景のサムネイル
 * ├───┼───┼───┤
 * │ 4 │ 5 │ 6 │
 * └───┴───┴───┘
 *
 * スロットをタップすると下部にテンプレート一覧が表示される
 */
export function BackgroundGrid({
  templates,
  selectedBackgrounds,
  activeSlot,
  onSlotClick,
  onTemplateSelect,
}: BackgroundGridProps) {
  // 全スロットが選択されているかチェック
  const allSelected = selectedBackgrounds.every((bg) => bg !== null);

  return (
    <div className="space-y-6">
      {/* 6スロットグリッド */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">背景を6つ選択</h3>
          <span className="text-sm text-muted-foreground">
            {selectedBackgrounds.filter((bg) => bg !== null).length} / {BACKGROUND_COUNT}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: BACKGROUND_COUNT }).map((_, index) => {
            const selected = selectedBackgrounds[index];
            const isActive = activeSlot === index;

            return (
              <BackgroundSlot
                key={index}
                index={index}
                selected={selected}
                isActive={isActive}
                onClick={() => onSlotClick(index)}
              />
            );
          })}
        </div>
      </div>

      {/* テンプレート一覧（スロットがアクティブな場合のみ表示） */}
      {activeSlot !== null && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 text-sm">
            背景 {activeSlot + 1} を選択
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((template) => {
              const isSelectedInCurrentSlot = selectedBackgrounds[activeSlot]?.id === template.id;

              return (
                <TemplateOption
                  key={template.id}
                  template={template}
                  isSelected={isSelectedInCurrentSlot}
                  onSelect={onTemplateSelect}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 選択完了メッセージ */}
      {allSelected && activeSlot === null && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          6つの背景を選択しました。変更する場合はスロットをタップしてください。
        </div>
      )}
    </div>
  );
}

/**
 * 背景スロット（6枠のうちの1つ）
 */
interface BackgroundSlotProps {
  index: number;
  selected: TemplateWithResolvedThumbnail | null;
  isActive: boolean;
  onClick: () => void;
}

function BackgroundSlot({ index, selected, isActive, onClick }: BackgroundSlotProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`背景${index + 1}${selected ? `（${selected.title}を選択中）` : "（未選択）"}`}
      aria-pressed={isActive}
      className={cn(
        "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
        isActive && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-0 relative">
        <div className="relative aspect-video overflow-hidden rounded-lg">
          {selected ? (
            <>
              {selected.resolvedThumbnailUrl ? (
                <Image
                  src={selected.resolvedThumbnailUrl}
                  alt={`背景${index + 1}: ${selected.title}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">{selected.title}</span>
                </div>
              )}
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check className="h-3 w-3" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                <span className="text-white text-xs truncate block">{index + 1}</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * テンプレート選択肢（背景一覧）
 */
interface TemplateOptionProps {
  template: TemplateWithResolvedThumbnail;
  isSelected: boolean;
  onSelect: (template: TemplateWithResolvedThumbnail) => void;
}

function TemplateOption({ template, isSelected, onSelect }: TemplateOptionProps) {
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
      aria-label={`${template.title}${isSelected ? "（選択中）" : ""}`}
      className={cn(
        "cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary",
        isSelected && "ring-2 ring-primary",
        !isSelected && "hover:ring-2 hover:ring-primary/50"
      )}
      onClick={() => onSelect(template)}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-0 relative">
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          {template.resolvedThumbnailUrl ? (
            <Image
              src={template.resolvedThumbnailUrl}
              alt={`${template.title}のプレビュー`}
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
        <div className="p-2">
          <h3 className="font-medium text-xs truncate">{template.title}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
