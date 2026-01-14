import "server-only";
import { getAdminReservations } from "@/actions/admin";
import { ReservationManager } from "@/components/admin/reservation-manager";

export default async function ReservationsPage() {
  const reservations = await getAdminReservations();

  return (
    <div className="space-y-6" data-testid="reservation-item">
      <h1 className="text-2xl font-bold">予約管理</h1>
      <ReservationManager reservations={reservations} />
    </div>
  );
}
