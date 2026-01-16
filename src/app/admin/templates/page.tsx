import "server-only";
import { getTemplates } from "@/actions/admin";
import { TemplateManager, type TemplateWithResolvedThumbnail } from "@/components/admin/template-manager";
import { getThumbnailUrl } from "@/lib/storage/resolver";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  // thumbnailUrl が storageKey の場合は表示用 URL を別フィールドに解決
  const templatesWithResolvedThumbnails: TemplateWithResolvedThumbnail[] = await Promise.all(
    templates.map(async (template) => {
      let resolvedThumbnailUrl: string | undefined;
      if (template.thumbnailUrl?.startsWith("thumbnails/")) {
        try {
          resolvedThumbnailUrl = await getThumbnailUrl(template.thumbnailUrl);
        } catch {
          // エラー時は undefined（表示されないが保存は維持）
        }
      } else if (template.thumbnailUrl) {
        // 外部 URL の場合はそのまま使用
        resolvedThumbnailUrl = template.thumbnailUrl;
      }
      return { ...template, resolvedThumbnailUrl };
    })
  );

  return (
    <div className="space-y-6" data-testid="template-item">
      <h1 className="text-2xl font-bold">テンプレート管理</h1>
      <TemplateManager templates={templatesWithResolvedThumbnails} />
    </div>
  );
}
