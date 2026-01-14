"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Receipt } from "lucide-react";
import type { Payment } from "@/db/schema";
import { PAYMENT_STATUS } from "@/db/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface PaymentListProps {
  payments: Payment[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [PAYMENT_STATUS.PENDING]: { label: "処理中", variant: "secondary" },
  [PAYMENT_STATUS.SUCCEEDED]: { label: "完了", variant: "default" },
  [PAYMENT_STATUS.FAILED]: { label: "失敗", variant: "destructive" },
  [PAYMENT_STATUS.REFUNDED]: { label: "返金済み", variant: "outline" },
};

export function PaymentList({ payments }: PaymentListProps) {
  // 新しい順にソート
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">決済履歴がありません</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          投影予約を行うと、ここに決済履歴が表示されます
        </p>
      </div>
    );
  }

  return (
    <>
      {/* モバイル表示 */}
      <div className="space-y-4 md:hidden">
        {sortedPayments.map((payment) => {
          const status = statusConfig[payment.status] || {
            label: payment.status,
            variant: "secondary" as const,
          };

          return (
            <div
              key={payment.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    ¥{payment.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.createdAt), "yyyy/MM/dd HH:mm", {
                      locale: ja,
                    })}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {payment.refundedAt && (
                <p className="text-xs text-muted-foreground">
                  返金日: {format(new Date(payment.refundedAt), "yyyy/MM/dd HH:mm")}
                </p>
              )}

              {payment.status === PAYMENT_STATUS.SUCCEEDED &&
                payment.stripePaymentIntentId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Stripeの領収書ページは直接リンクできないため、
                      // Stripe Dashboard経由で確認する必要がある
                      // 実際の実装では、Stripe APIで領収書URLを取得する
                    }}
                    disabled
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    領収書 (準備中)
                  </Button>
                )}
            </div>
          );
        })}
      </div>

      {/* デスクトップ表示 */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>決済日時</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>返金日</TableHead>
              <TableHead className="text-right">領収書</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.map((payment) => {
              const status = statusConfig[payment.status] || {
                label: payment.status,
                variant: "secondary" as const,
              };

              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.createdAt), "yyyy/MM/dd HH:mm", {
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    ¥{payment.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {payment.refundedAt ? (
                      format(new Date(payment.refundedAt), "yyyy/MM/dd HH:mm")
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === PAYMENT_STATUS.SUCCEEDED &&
                      payment.stripePaymentIntentId && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          準備中
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
