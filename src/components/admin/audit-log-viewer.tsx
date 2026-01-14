"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter, FileText } from "lucide-react";
import type { AuditLogWithAdmin } from "@/actions/admin";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface AuditLogViewerProps {
  logs: AuditLogWithAdmin[];
}

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CREATE: { label: "作成", variant: "default" },
  UPDATE: { label: "更新", variant: "secondary" },
  DELETE: { label: "削除", variant: "destructive" },
  CANCEL: { label: "キャンセル", variant: "destructive" },
  COMPLETE: { label: "完了", variant: "outline" },
  ACTIVATE: { label: "有効化", variant: "default" },
  DEACTIVATE: { label: "無効化", variant: "secondary" },
  REFUND: { label: "返金", variant: "destructive" },
};

const entityLabels: Record<string, string> = {
  template: "テンプレート",
  reservation: "予約",
  schedule: "スケジュール",
  payment: "決済",
};

export function AuditLogViewer({ logs: initialLogs }: AuditLogViewerProps) {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const filteredLogs =
    entityFilter === "all"
      ? initialLogs
      : initialLogs.filter((log) => log.entity === entityFilter);

  if (initialLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">監査ログがありません</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          管理者の操作履歴がここに記録されます
        </p>
      </div>
    );
  }

  return (
    <>
      {/* フィルター */}
      <div className="flex flex-wrap gap-4 mb-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">フィルター</span>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">エンティティ</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="template">テンプレート</SelectItem>
              <SelectItem value="reservation">予約</SelectItem>
              <SelectItem value="schedule">スケジュール</SelectItem>
              <SelectItem value="payment">決済</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>管理者</TableHead>
              <TableHead>操作</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => {
              const action = actionLabels[log.action] || {
                label: log.action,
                variant: "secondary" as const,
              };

              return (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm:ss", {
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell>{log.adminName || "(不明)"}</TableCell>
                  <TableCell>
                    <Badge variant={action.variant}>{action.label}</Badge>
                  </TableCell>
                  <TableCell>{entityLabels[log.entity] || log.entity}</TableCell>
                  <TableCell>
                    {log.entityId ? (
                      <code className="text-xs bg-muted px-1 rounded">
                        #{log.entityId}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.details ? (
                      <pre className="text-xs bg-muted p-1 rounded max-w-xs truncate">
                        {JSON.stringify(log.details, null, 0)}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center mt-4">
        直近 {filteredLogs.length} 件を表示中
      </p>
    </>
  );
}
