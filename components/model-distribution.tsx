"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "@/components/ui/chart"

interface ModelData {
  name: string
  value: number
}

const COLORS = ["#10b981", "#6366f1", "#f97316", "#8b5cf6", "#ef4444"]

export function ModelDistribution({ data }: { data: ModelData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} assistants`, name]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

