import "server-only";
import { getTemplates } from "@/actions/admin";
import { TemplateManager } from "@/components/admin/template-manager";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6" data-testid="template-item">
      <h1 className="text-2xl font-bold">テンプレート管理</h1>
      <TemplateManager templates={templates} />
    </div>
  );
}
