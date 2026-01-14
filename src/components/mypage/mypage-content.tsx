"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoList } from "./video-list";
import { ReservationList } from "./reservation-list";
import { PaymentList } from "./payment-list";
import type { VideoWithTemplates } from "@/actions/video";
import type { Reservation, Payment } from "@/db/schema";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

interface MyPageContentProps {
  videos: VideoWithTemplates[];
  reservations: Reservation[];
  payments: Payment[];
}

export function MyPageContent({
  videos,
  reservations,
  payments,
}: MyPageContentProps) {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const showSuccessMessage = paymentStatus === "success";

  return (
    <div className="space-y-4">
      {showSuccessMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            決済が完了しました。予約が確定されました。
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            動画 ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="reservations">
            予約 ({reservations.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            決済 ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="videos"
          className="mt-6"
          data-testid="videos-section"
        >
          <VideoList videos={videos} />
        </TabsContent>

        <TabsContent
          value="reservations"
          className="mt-6"
          data-testid="reservations-section"
        >
          <ReservationList reservations={reservations} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentList payments={payments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
