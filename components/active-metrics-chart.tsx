"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/ui/chart"

interface WeeklyActivityData {
  date: string
  activeUsers: number
  activeChats: number
  activeAssistants: number
}

export function ActiveMetricsChart({ data }: { data: WeeklyActivityData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="activeUsers"
          name="Active Users"
          stackId="1"
          stroke="#0ea5e9"
          fill="#0ea5e9"
          fillOpacity={0.2}
        />
        <Area
          type="monotone"
          dataKey="activeChats"
          name="Active Chats"
          stackId="2"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.2}
        />
        <Area
          type="monotone"
          dataKey="activeAssistants"
          name="Active Assistants"
          stackId="3"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-4 rounded-md shadow-md">
        <p className="font-medium">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
              <span className="text-sm">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

