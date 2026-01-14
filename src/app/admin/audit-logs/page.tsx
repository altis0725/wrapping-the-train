import "server-only";
import { getAuditLogs } from "@/actions/admin";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";

export default async function AuditLogsPage() {
  const logs = await getAuditLogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">監査ログ</h1>
      <AuditLogViewer logs={logs} />
    </div>
  );
}
