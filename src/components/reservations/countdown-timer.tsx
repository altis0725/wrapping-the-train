"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  expiresAt: Date;
  onExpire: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = expiresAt.getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isUrgent = timeLeft <= 60; // 1分以下

  return (
    <Alert variant={isUrgent ? "destructive" : "warning"}>
      <Clock className="h-4 w-4" />
      <AlertTitle>仮押さえ中</AlertTitle>
      <AlertDescription>
        残り時間:{" "}
        <span className="font-bold text-lg">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        {isUrgent && (
          <span className="block mt-1 text-sm">
            お早めに決済を完了してください
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
