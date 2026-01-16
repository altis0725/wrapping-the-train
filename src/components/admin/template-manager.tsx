"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreVertical, Pencil, Trash2, Eye, EyeOff, Upload, Link, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Template } from "@/db/schema";
import { VideoUploader } from "./video-uploader";
import { TEMPLATE_CATEGORY } from "@/db/schema";

// 表示用に解決された URL を持つテンプレート型
export type TemplateWithResolvedThumbnail = Template & {
  resolvedThumbnailUrl?: string;
};
import {
  createTemplate,
  createTemplates,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  duplicateTemplate,
  duplicateTemplates,
  type TemplateInput,
} from "@/actions/admin";

interface TemplateManagerProps {
  templates: TemplateWithResolvedThumbnail[];
}

const categoryLabels: Record<number, string> = {
  [TEMPLATE_CATEGORY.BACKGROUND]: "背景",
  [TEMPLATE_CATEGORY.WINDOW]: "窓",
  [TEMPLATE_CATEGORY.WHEEL]: "車輪",
};

export function TemplateManager({ templates }: TemplateManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [bulkDuplicateDialogOpen, setBulkDuplicateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<Template | null>(null);
  const [duplicateTargetCategory, setDuplicateTargetCategory] = useState<number | null>(null);
  const [bulkDuplicateTargetCategories, setBulkDuplicateTargetCategories] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 複数選択用の state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [formData, setFormData] = useState<Omit<TemplateInput, 'category'> & { storageKey?: string; thumbnailStorageKey?: string; categories: Set<number> }>({
    categories: new Set([TEMPLATE_CATEGORY.BACKGROUND]),
    title: "",
    videoUrl: "",
    storageKey: "",
    thumbnailUrl: "",
    thumbnailStorageKey: "",
    displayOrder: 0,
  });
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "url">("upload");

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      categories: new Set([TEMPLATE_CATEGORY.BACKGROUND]),
      title: "",
      videoUrl: "",
      storageKey: "",
      thumbnailUrl: "",
      thumbnailStorageKey: "",
      displayOrder: 0,
    });
    setVideoInputMode("upload");
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    // thumbnailUrl が thumbnails/ で始まる場合は storageKey として扱う
    const isThumbnailStorageKey = template.thumbnailUrl?.startsWith("thumbnails/");
    setFormData({
      categories: new Set([template.category]),
      title: template.title,
      videoUrl: template.videoUrl || "",
      storageKey: template.storageKey || "",
      thumbnailUrl: isThumbnailStorageKey ? "" : (template.thumbnailUrl || ""),
      thumbnailStorageKey: isThumbnailStorageKey ? (template.thumbnailUrl || "") : "",
      displayOrder: template.displayOrder,
    });
    // storageKey がある場合はアップロードモード、なければURLモード
    setVideoInputMode(template.storageKey ? "upload" : "url");
    setError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    // 動画ソースのバリデーション
    const hasVideo =
      (videoInputMode === "upload" && formData.storageKey) ||
      (videoInputMode === "url" && formData.videoUrl);

    if (!hasVideo) {
      setError("動画ファイルまたは動画URLを指定してください");
      setIsSubmitting(false);
      return;
    }

    // カテゴリのバリデーション
    if (formData.categories.size === 0) {
      setError("カテゴリを選択してください");
      setIsSubmitting(false);
      return;
    }

    // 送信データを準備（選択されたモードに応じて不要なフィールドをクリア）
    // thumbnailStorageKey がある場合は thumbnailUrl として保存
    const baseData = {
      title: formData.title,
      storageKey: videoInputMode === "upload" ? formData.storageKey : undefined,
      videoUrl: videoInputMode === "url" ? formData.videoUrl : undefined,
      thumbnailUrl: formData.thumbnailStorageKey || formData.thumbnailUrl || undefined,
      displayOrder: formData.displayOrder,
    };

    let result;
    if (editingTemplate) {
      // 編集時は単一カテゴリのみ（既存の動作を維持）
      const category = Array.from(formData.categories)[0];
      result = await updateTemplate(editingTemplate.id, { ...baseData, category });
    } else {
      // 新規作成時は複数カテゴリ対応
      const categories = Array.from(formData.categories);
      if (categories.length === 1) {
        result = await createTemplate({ ...baseData, category: categories[0] });
      } else {
        result = await createTemplates({ ...baseData, category: categories[0] }, categories);
      }
    }

    if (result.success) {
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error || "エラーが発生しました");
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setIsSubmitting(true);
    const result = await deleteTemplate(deletingTemplate.id);

    if (result.success) {
      setDeleteDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error || "削除に失敗しました");
    }

    setIsSubmitting(false);
  };

  const handleToggleActive = async (template: Template) => {
    await toggleTemplateActive(template.id, template.isActive !== 1);
    router.refresh();
  };

  const openDuplicateDialog = (template: Template) => {
    setDuplicatingTemplate(template);
    setDuplicateTargetCategory(null);
    setError(null);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicate = async () => {
    if (!duplicatingTemplate || duplicateTargetCategory === null) return;

    setIsSubmitting(true);
    setError(null);

    const result = await duplicateTemplate(duplicatingTemplate.id, duplicateTargetCategory);

    if (result.success) {
      setDuplicateDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error || "複製に失敗しました");
    }

    setIsSubmitting(false);
  };

  // 複製先として選択可能なカテゴリ（現在のカテゴリを除く）
  const getAvailableCategories = (currentCategory: number) => {
    return [
      TEMPLATE_CATEGORY.BACKGROUND,
      TEMPLATE_CATEGORY.WINDOW,
      TEMPLATE_CATEGORY.WHEEL,
    ].filter((cat) => cat !== currentCategory);
  };

  // チェックボックス選択のハンドラ
  const handleSelectTemplate = (template: Template, checked: boolean) => {
    const newSelected = new Set(selectedTemplateIds);
    if (checked) {
      // 異なるカテゴリの場合は選択をリセット
      if (selectedCategory !== null && selectedCategory !== template.category) {
        newSelected.clear();
        setSelectedCategory(template.category);
      } else if (selectedCategory === null) {
        setSelectedCategory(template.category);
      }
      newSelected.add(template.id);
    } else {
      newSelected.delete(template.id);
      if (newSelected.size === 0) {
        setSelectedCategory(null);
      }
    }
    setSelectedTemplateIds(newSelected);
  };

  // カテゴリ内の全選択/解除
  const handleSelectAllInCategory = (category: number, checked: boolean) => {
    const categoryTemplates = templates.filter((t) => t.category === category);
    const newSelected = new Set(selectedTemplateIds);

    if (checked) {
      // 他のカテゴリの選択をクリア
      if (selectedCategory !== null && selectedCategory !== category) {
        newSelected.clear();
      }
      setSelectedCategory(category);
      categoryTemplates.forEach((t) => newSelected.add(t.id));
    } else {
      categoryTemplates.forEach((t) => newSelected.delete(t.id));
      if (newSelected.size === 0) {
        setSelectedCategory(null);
      }
    }
    setSelectedTemplateIds(newSelected);
  };

  // カテゴリ内の全て選択されているか
  const isAllSelectedInCategory = (category: number) => {
    const categoryTemplates = templates.filter((t) => t.category === category);
    return categoryTemplates.length > 0 && categoryTemplates.every((t) => selectedTemplateIds.has(t.id));
  };

  // カテゴリ内の一部が選択されているか
  const isSomeSelectedInCategory = (category: number) => {
    const categoryTemplates = templates.filter((t) => t.category === category);
    const selectedInCategory = categoryTemplates.filter((t) => selectedTemplateIds.has(t.id));
    return selectedInCategory.length > 0 && selectedInCategory.length < categoryTemplates.length;
  };

  // 一括複製ダイアログを開く
  const openBulkDuplicateDialog = () => {
    setBulkDuplicateTargetCategories(new Set());
    setError(null);
    setBulkDuplicateDialogOpen(true);
  };

  // 一括複製の実行
  const handleBulkDuplicate = async () => {
    if (selectedTemplateIds.size === 0 || bulkDuplicateTargetCategories.size === 0) return;

    setIsSubmitting(true);
    setError(null);

    const result = await duplicateTemplates(
      Array.from(selectedTemplateIds),
      Array.from(bulkDuplicateTargetCategories)
    );

    if (result.success) {
      setBulkDuplicateDialogOpen(false);
      setSelectedTemplateIds(new Set());
      setSelectedCategory(null);
      router.refresh();
    } else {
      setError(result.error || "一括複製に失敗しました");
    }

    setIsSubmitting(false);
  };

  // カテゴリのトグル（複数選択用）
  const toggleBulkDuplicateCategory = (category: number) => {
    const newCategories = new Set(bulkDuplicateTargetCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setBulkDuplicateTargetCategories(newCategories);
  };

  // formData のカテゴリトグル（新規作成用）
  const toggleFormCategory = (category: number) => {
    const newCategories = new Set(formData.categories);
    if (newCategories.has(category)) {
      // 最低1つは必要
      if (newCategories.size > 1) {
        newCategories.delete(category);
      }
    } else {
      newCategories.add(category);
    }
    setFormData({ ...formData, categories: newCategories });
  };

  // カテゴリでグループ化
  const groupedTemplates = [
    TEMPLATE_CATEGORY.BACKGROUND,
    TEMPLATE_CATEGORY.WINDOW,
    TEMPLATE_CATEGORY.WHEEL,
  ].map((category) => ({
    category,
    label: categoryLabels[category],
    templates: templates.filter((t) => t.category === category),
  }));

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          {selectedTemplateIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedTemplateIds.size}件選択中
              </span>
              <Button variant="outline" size="sm" onClick={openBulkDuplicateDialog}>
                <Copy className="h-4 w-4 mr-2" />
                一括複製
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTemplateIds(new Set());
                  setSelectedCategory(null);
                }}
              >
                選択解除
              </Button>
            </div>
          )}
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="space-y-8">
        {groupedTemplates.map((group) => (
          <div key={group.category}>
            <h2 className="text-lg font-semibold mb-3">
              {group.label} ({group.templates.length})
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelectedInCategory(group.category)}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isSomeSelectedInCategory(group.category);
                        }
                      }}
                      onCheckedChange={(checked) =>
                        handleSelectAllInCategory(group.category, !!checked)
                      }
                      disabled={selectedCategory !== null && selectedCategory !== group.category}
                    />
                  </TableHead>
                  <TableHead className="w-16">順番</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead>サムネイル</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      テンプレートがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  group.templates.map((template) => (
                    <TableRow key={template.id} data-testid="template-item">
                      <TableCell>
                        <Checkbox
                          checked={selectedTemplateIds.has(template.id)}
                          onCheckedChange={(checked) =>
                            handleSelectTemplate(template, !!checked)
                          }
                          disabled={selectedCategory !== null && selectedCategory !== template.category}
                        />
                      </TableCell>
                      <TableCell>{template.displayOrder}</TableCell>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell>
                        {template.resolvedThumbnailUrl ? (
                          <Image
                            src={template.resolvedThumbnailUrl}
                            alt={template.title}
                            width={64}
                            height={40}
                            className="object-cover rounded"
                            unoptimized={template.resolvedThumbnailUrl.includes("?") || template.resolvedThumbnailUrl.startsWith("/")}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive === 1 ? "default" : "secondary"}>
                          {template.isActive === 1 ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              編集
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDuplicateDialog(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              複製
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                              {template.isActive === 1 ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  無効化
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-2" />
                                  有効化
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDeletingTemplate(template);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      {/* 作成/編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "テンプレートを編集" : "テンプレートを作成"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>カテゴリ{!editingTemplate && "（複数選択可）"}</Label>
              {editingTemplate ? (
                <Select
                  value={String(Array.from(formData.categories)[0])}
                  onValueChange={(v) =>
                    setFormData({ ...formData, categories: new Set([Number(v)]) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(TEMPLATE_CATEGORY.BACKGROUND)}>
                      背景
                    </SelectItem>
                    <SelectItem value={String(TEMPLATE_CATEGORY.WINDOW)}>
                      窓
                    </SelectItem>
                    <SelectItem value={String(TEMPLATE_CATEGORY.WHEEL)}>
                      車輪
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[TEMPLATE_CATEGORY.BACKGROUND, TEMPLATE_CATEGORY.WINDOW, TEMPLATE_CATEGORY.WHEEL].map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={formData.categories.has(cat) ? "default" : "outline"}
                      onClick={() => toggleFormCategory(cat)}
                      className="justify-start"
                    >
                      {categoryLabels[cat]}
                    </Button>
                  ))}
                </div>
              )}
              {!editingTemplate && formData.categories.size > 1 && (
                <p className="text-sm text-muted-foreground">
                  {formData.categories.size}カテゴリに作成されます
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>動画</Label>
              <Tabs value={videoInputMode} onValueChange={(v) => setVideoInputMode(v as "upload" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    アップロード
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" />
                    URL指定
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  {formData.storageKey ? (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        アップロード済み
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {formData.storageKey}
                      </p>
                      {formData.thumbnailStorageKey && (
                        <p className="text-xs text-green-600 mt-1">
                          サムネイル自動生成済み
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setFormData({ ...formData, storageKey: "", thumbnailStorageKey: "" })}
                      >
                        別のファイルを選択
                      </Button>
                    </div>
                  ) : (
                    <VideoUploader
                      category={Array.from(formData.categories)[0]}
                      templateId={editingTemplate?.id}
                      onUpload={(storageKey, thumbnailStorageKey) =>
                        setFormData({ ...formData, storageKey, thumbnailStorageKey: thumbnailStorageKey || "" })
                      }
                      onError={(err) => setError(err)}
                      disabled={isSubmitting}
                    />
                  )}
                </TabsContent>
                <TabsContent value="url" className="mt-3">
                  <Input
                    id="videoUrl"
                    placeholder="https://example.com/video.mp4"
                    value={formData.videoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, videoUrl: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    外部URLを直接指定する場合はこちら
                  </p>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">サムネイルURL</Label>
              {formData.thumbnailStorageKey ? (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-green-600">自動生成済み</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {formData.thumbnailStorageKey}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setFormData({ ...formData, thumbnailStorageKey: "" })}
                  >
                    手動で指定する
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="thumbnailUrl"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={formData.thumbnailUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, thumbnailUrl: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    動画アップロード時は自動生成されます
                  </p>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">表示順</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: Number(e.target.value),
                  })
                }
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "処理中..." : editingTemplate ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを削除</DialogTitle>
            <DialogDescription>
              「{deletingTemplate?.title}」を削除してもよろしいですか？
              動画で使用中の場合は非表示になります。
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 複製ダイアログ（単一） */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを複製</DialogTitle>
            <DialogDescription>
              「{duplicatingTemplate?.title}」を別のカテゴリに複製します。
              動画とサムネイルは共有されます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>複製先カテゴリ（複数選択可）</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {duplicatingTemplate && getAvailableCategories(duplicatingTemplate.category).map((cat) => (
                <Button
                  key={cat}
                  variant={duplicateTargetCategory === cat ? "default" : "outline"}
                  onClick={() => setDuplicateTargetCategory(cat)}
                  className="justify-start"
                >
                  {categoryLabels[cat]}
                </Button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={isSubmitting || duplicateTargetCategory === null}
            >
              {isSubmitting ? "複製中..." : "複製"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一括複製ダイアログ */}
      <Dialog open={bulkDuplicateDialogOpen} onOpenChange={setBulkDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを一括複製</DialogTitle>
            <DialogDescription>
              選択した{selectedTemplateIds.size}件のテンプレートを複製します。
              動画とサムネイルは共有されます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>複製先カテゴリ（複数選択可）</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {selectedCategory !== null && getAvailableCategories(selectedCategory).map((cat) => (
                <Button
                  key={cat}
                  variant={bulkDuplicateTargetCategories.has(cat) ? "default" : "outline"}
                  onClick={() => toggleBulkDuplicateCategory(cat)}
                  className="justify-start"
                >
                  {categoryLabels[cat]}
                </Button>
              ))}
            </div>
            {bulkDuplicateTargetCategories.size > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                {selectedTemplateIds.size}件 × {bulkDuplicateTargetCategories.size}カテゴリ = {selectedTemplateIds.size * bulkDuplicateTargetCategories.size}件作成
              </p>
            )}
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDuplicateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleBulkDuplicate}
              disabled={isSubmitting || bulkDuplicateTargetCategories.size === 0}
            >
              {isSubmitting ? "複製中..." : "一括複製"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
