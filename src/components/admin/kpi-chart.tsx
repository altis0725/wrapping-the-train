"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface DailyStats {
  date: string;
  videos: number;
  reservations: number;
  revenue: number;
}

interface KPIChartProps {
  data: DailyStats[];
}

export function KPIChart({ data }: KPIChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>推移グラフ</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="videos">
          <TabsList>
            <TabsTrigger value="videos">動画・予約</TabsTrigger>
            <TabsTrigger value="revenue">売上</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => value.slice(5)}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  labelFormatter={(label) => `日付: ${label}`}
                  formatter={(value, name) => [
                    value ?? 0,
                    name === "videos" ? "動画作成数" : "予約数",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "videos" ? "動画作成数" : "予約数"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="videos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="reservations"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="revenue" className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => value.slice(5)}
                  fontSize={12}
                />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value) => `¥${value.toLocaleString()}`}
                />
                <Tooltip
                  labelFormatter={(label) => `日付: ${label}`}
                  formatter={(value) => [
                    `¥${(value ?? 0).toLocaleString()}`,
                    "売上",
                  ]}
                />
                <Legend formatter={() => "売上"} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
