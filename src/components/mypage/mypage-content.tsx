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
    <div className="space-y-6">
      {showSuccessMessage && (
        <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            決済が完了しました。予約が確定されました。
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10 h-auto p-1 rounded-xl">
          <TabsTrigger
            value="videos"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 border border-transparent py-3 transition-all duration-300 font-bold tracking-wide"
          >
            動画 ({videos.length})
          </TabsTrigger>
          <TabsTrigger
            value="reservations"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 border border-transparent py-3 transition-all duration-300 font-bold tracking-wide"
          >
            予約 ({reservations.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/50 border border-transparent py-3 transition-all duration-300 font-bold tracking-wide"
          >
            決済 ({payments.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-8 relative min-h-[400px]">
          <TabsContent
            value="videos"
            className="mt-0 animate-fade-in-up"
            data-testid="videos-section"
          >
            <VideoList videos={videos} />
          </TabsContent>

          <TabsContent
            value="reservations"
            className="mt-0 animate-fade-in-up"
            data-testid="reservations-section"
          >
            <ReservationList reservations={reservations} />
          </TabsContent>

          <TabsContent
            value="payments"
            className="mt-0 animate-fade-in-up"
          >
            <PaymentList payments={payments} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
