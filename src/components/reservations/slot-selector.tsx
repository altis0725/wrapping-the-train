"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSlotTimeRange } from "@/lib/constants/slot";
import type { SlotInfo } from "@/actions/reservation";
import { Clock, Lock, User } from "lucide-react";

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
        const isHold = slot.status === "hold";
        const isReserved = slot.status === "reserved";

        return (
          <Button
            key={slot.slotNumber}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "h-auto py-4 flex flex-col items-center gap-2",
              !isAvailable && !slot.isOwn && "opacity-50 cursor-not-allowed",
              slot.isOwn && isHold && "border-primary"
            )}
            onClick={() => isAvailable && onSelect(slot.slotNumber)}
            disabled={disabled || (!isAvailable && !slot.isOwn)}
            data-testid="slot"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {getSlotTimeRange(slot.slotNumber)}
              </span>
            </div>

            {isAvailable && (
              <Badge variant="success" className="text-xs">
                予約可能
              </Badge>
            )}

            {isHold && (
              <Badge
                variant={slot.isOwn ? "default" : "warning"}
                className="text-xs"
              >
                {slot.isOwn ? (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    あなたが仮押さえ中
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    仮押さえ中
                  </span>
                )}
              </Badge>
            )}

            {isReserved && (
              <Badge variant="secondary" className="text-xs">
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  予約済み
                </span>
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
