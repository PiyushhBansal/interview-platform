"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TrendChart({
  data,
}: {
  data: { name: string; score: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="h-64 grid place-items-center text-sm text-zinc-500">
        No interviews yet — your score trend will appear here.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              fontSize: 12,
              color: "#e4e4e7",
            }}
          />
          <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
