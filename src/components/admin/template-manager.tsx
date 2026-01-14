"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, MoreVertical, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Template } from "@/db/schema";
import { TEMPLATE_CATEGORY } from "@/db/schema";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  type TemplateInput,
} from "@/actions/admin";

interface TemplateManagerProps {
  templates: Template[];
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
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TemplateInput>({
    category: TEMPLATE_CATEGORY.BACKGROUND,
    title: "",
    videoUrl: "",
    thumbnailUrl: "",
    displayOrder: 0,
  });

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      category: TEMPLATE_CATEGORY.BACKGROUND,
      title: "",
      videoUrl: "",
      thumbnailUrl: "",
      displayOrder: 0,
    });
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      category: template.category,
      title: template.title,
      videoUrl: template.videoUrl,
      thumbnailUrl: template.thumbnailUrl || "",
      displayOrder: template.displayOrder,
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    let result;
    if (editingTemplate) {
      result = await updateTemplate(editingTemplate.id, formData);
    } else {
      result = await createTemplate(formData);
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
      <div className="flex justify-end mb-4">
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      テンプレートがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  group.templates.map((template) => (
                    <TableRow key={template.id} data-testid="template-item">
                      <TableCell>{template.displayOrder}</TableCell>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell>
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={template.title}
                            className="w-16 h-10 object-cover rounded"
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
              <Label htmlFor="category">カテゴリ</Label>
              <Select
                value={String(formData.category)}
                onValueChange={(v) =>
                  setFormData({ ...formData, category: Number(v) })
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
              <Label htmlFor="videoUrl">動画URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, videoUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">サムネイルURL</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnailUrl: e.target.value })
                }
              />
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
    </>
  );
}
