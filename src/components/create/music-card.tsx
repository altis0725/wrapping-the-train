"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Music, Check } from "lucide-react";
import type { TemplateWithResolvedThumbnail } from "@/actions/template";

interface MusicCardProps {
  template: TemplateWithResolvedThumbnail;
  isSelected: boolean;
  onSelect: (template: TemplateWithResolvedThumbnail) => void;
}

export function MusicCard({ template, isSelected, onSelect }: MusicCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // 30秒の試聴制限
  const MAX_PREVIEW_DURATION = 30;

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // 再生/停止の切り替え
  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!audioRef.current) {
        // 音楽URLはresolvedThumbnailUrlに格納されている（getMusicUrlで解決済み）
        const audioUrl = template.resolvedThumbnailUrl || "";
        if (!audioUrl) {
          console.error("音楽URLが見つかりません");
          return;
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.volume = 0.7;

        // 終了時のハンドラ
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setProgress(0);
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
        };

        // エラーハンドラ
        audioRef.current.onerror = () => {
          console.error("音楽の再生に失敗しました");
          setIsPlaying(false);
          setProgress(0);
        };
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("再生エラー:", err);
        });
        setIsPlaying(true);

        // プログレスの更新（30秒制限）
        progressInterval.current = setInterval(() => {
          if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            if (currentTime >= MAX_PREVIEW_DURATION) {
              audioRef.current.pause();
              setIsPlaying(false);
              setProgress(100);
              if (progressInterval.current) {
                clearInterval(progressInterval.current);
              }
            } else {
              setProgress((currentTime / MAX_PREVIEW_DURATION) * 100);
            }
          }
        }, 100);
      }
    },
    [isPlaying, template.resolvedThumbnailUrl]
  );

  // 選択時のハンドラ
  const handleSelect = useCallback(() => {
    onSelect(template);
  }, [onSelect, template]);

  // キーボード操作のハンドラ（Enter/Spaceで選択）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    },
    [handleSelect]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative w-full text-left rounded-lg border-2 transition-all duration-200 cursor-pointer",
        "p-4 bg-card hover:bg-accent/50",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
      aria-pressed={isSelected}
      aria-label={`${template.title}${isSelected ? "（選択中）" : ""}`}
    >
      {/* 選択インジケーター */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* 音楽アイコンと再生ボタン */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-primary/40",
              isPlaying && "animate-pulse"
            )}
          >
            <Music className="h-8 w-8 text-primary" />
          </div>

          {/* 再生/停止ボタン */}
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              "absolute -bottom-1 -right-1 w-8 h-8 rounded-full",
              "bg-primary text-primary-foreground",
              "flex items-center justify-center",
              "hover:bg-primary/90 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
            aria-label={isPlaying ? "停止" : "再生（30秒プレビュー）"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{template.title}</h4>

          {/* プログレスバー */}
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full bg-primary transition-all duration-100",
                isPlaying && "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isPlaying
              ? `再生中... ${Math.floor((progress / 100) * MAX_PREVIEW_DURATION)}秒`
              : "クリックで30秒試聴"}
          </p>
        </div>
      </div>
    </div>
  );
}
