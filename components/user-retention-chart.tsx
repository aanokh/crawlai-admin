"use client"

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/components/ui/chart"

interface RetentionData {
  week: string
  rate: number
}

export function UserRetentionChart({ data }: { data: RetentionData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="week" interval={0} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Retention Rate"]} />
        <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

