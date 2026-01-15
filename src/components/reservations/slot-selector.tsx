"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSlotTimeRange } from "@/lib/constants/slot";
import type { SlotInfo } from "@/actions/reservation";
import { Clock, Lock, User, Check } from "lucide-react";

interface SlotSelectorProps {
  slots: SlotInfo[];
  selectedSlot: number | null;
  onSelect: (slotNumber: number) => void;
  disabled?: boolean;
}

export function SlotSelector({
  slots,
  selectedSlot,
  onSelect,
  disabled,
}: SlotSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot.slotNumber;
        const isAvailable = slot.status === "available";
        const isPartial = slot.status === "partial";
        const isFull = slot.status === "full";
        const canReserve = isAvailable || isPartial;
        const remainingSlots = Math.max(0, slot.maxReservations - slot.reservationCount);

        return (
          <Button
            key={slot.slotNumber}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "h-auto py-4 flex flex-col items-center gap-2",
              isFull && !slot.isOwn && "opacity-50 cursor-not-allowed",
              slot.isOwn && "border-primary"
            )}
            onClick={() => canReserve && onSelect(slot.slotNumber)}
            disabled={disabled || (!canReserve && !slot.isOwn)}
            data-testid="slot"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {getSlotTimeRange(slot.slotNumber)}
              </span>
            </div>

            {/* 空き状況表示 */}
            {isAvailable && (
              <Badge variant="success" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                {remainingSlots}枠空き
              </Badge>
            )}

            {isPartial && (
              <Badge
                variant={remainingSlots >= 2 ? "success" : "warning"}
                className="text-xs"
              >
                {slot.isOwn ? (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    予約済み / 残り{remainingSlots}枠
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    残り{remainingSlots}枠
                  </span>
                )}
              </Badge>
            )}

            {isFull && (
              <Badge variant="secondary" className="text-xs">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {slot.isOwn ? "予約済み / 満席" : "満席"}
                </span>
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
