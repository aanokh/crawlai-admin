"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/components/ui/chart"

interface WeeklySignupData {
  week: string
  count: number
}

export function UserGrowthChart({ data }: { data: WeeklySignupData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="week" interval={0} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickMargin={10} />
        <Tooltip />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

