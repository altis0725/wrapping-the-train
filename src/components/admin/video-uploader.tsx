"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoUploaderProps {
  category: number;
  templateId?: number;
  onUpload: (storageKey: string, thumbnailStorageKey?: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function VideoUploader({
  category,
  templateId = 0,
  onUpload,
  onError,
  disabled = false,
}: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ["video/mp4", "video/quicktime"];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!allowedTypes.includes(file.type)) {
      return "MP4 または MOV ファイルのみアップロード可能です";
    }

    if (file.size > maxSize) {
      return "ファイルサイズは 500MB 以下にしてください";
    }

    return null;
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState("error");
      onError?.(validationError);
      return;
    }

    setSelectedFile(file);
    setState("uploading");
    setProgress(0);
    setError(null);

    // プログレスシミュレーション用のインターバル（try/finally でリソースリーク防止）
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category.toString());
      formData.append("templateId", templateId.toString());

      // プログレスシミュレーション（XHR を使えば実際の進捗が取れるが、fetch APIでは難しい）
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/admin/templates/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "アップロードに失敗しました");
      }

      setProgress(100);
      setState("success");
      onUpload(data.storageKey, data.thumbnailStorageKey);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "アップロードに失敗しました";
      setError(errorMessage);
      setState("error");
      onError?.(errorMessage);
    } finally {
      // 必ずインターバルをクリア（リソースリーク防止）
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  }, [category, templateId, onUpload, onError, validateFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || state === "uploading") return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        uploadFile(file);
      }
    },
    [disabled, state, uploadFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled && state !== "uploading") {
      inputRef.current?.click();
    }
  };

  const reset = () => {
    setState("idle");
    setProgress(0);
    setError(null);
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled && state !== "uploading") {
        inputRef.current?.click();
      }
    }
  }, [disabled, state]);

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled || state === "uploading" ? -1 : 0}
        aria-label="動画ファイルをアップロード"
        aria-disabled={disabled || state === "uploading"}
        aria-busy={state === "uploading"}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          dragActive && "border-primary bg-primary/5",
          state === "error" && "border-destructive bg-destructive/5",
          state === "success" && "border-green-500 bg-green-50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled &&
            state === "idle" &&
            "hover:border-primary/50 hover:bg-muted/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          onChange={handleChange}
          className="sr-only"
          aria-label="動画ファイルを選択"
          disabled={disabled || state === "uploading"}
        />

        <div className="flex flex-col items-center gap-3 text-center">
          {state === "idle" && (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  ドラッグ&ドロップ または クリックしてファイルを選択
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, MOV (最大 500MB)
                </p>
              </div>
            </>
          )}

          {state === "uploading" && (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div>
                <p className="text-sm font-medium">アップロード中...</p>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.name}
                  </p>
                )}
              </div>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-700">
                  アップロード完了
                </p>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.name}
                  </p>
                )}
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <X className="h-10 w-10 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  アップロードエラー
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {state === "uploading" && (
        <Progress
          value={progress}
          className="h-2"
          aria-label={`アップロード進行状況 ${progress}%`}
        />
      )}

      {(state === "success" || state === "error") && (
        <Button variant="outline" size="sm" onClick={reset} className="w-full">
          {state === "success" ? "別のファイルを選択" : "再試行"}
        </Button>
      )}
    </div>
  );
}
