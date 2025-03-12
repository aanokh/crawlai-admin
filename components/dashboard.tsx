"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ActiveMetricsChart } from "@/components/active-metrics-chart"
import { NewMetricsChart } from "@/components/new-metrics-chart"
import { UserGrowthChart } from "@/components/user-growth-chart"
import { ModelDistribution } from "@/components/model-distribution"
import { UserRetentionChart } from "@/components/user-retention-chart"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users, Bot, MessageSquare, FileText, Clock, Search } from "lucide-react"

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard")
        const result = await response.json()
        setData(result)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleLogout = () => {
    document.cookie = "admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    router.push("/")
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-6">
        <DashboardHeader heading="CrawlAI Analytics Dashboard" text="View and analyze your application metrics." />
        <Button onClick={handleLogout}>Logout</Button>
      </div>

      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Users</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <div className="text-3xl font-bold">{data?.metrics.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">+{data?.metrics.newUsersThisWeek} this week</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <div className="text-3xl font-bold">{data?.metrics.activeUsers}</div>
                  <p className="text-sm text-muted-foreground">+{data?.metrics.newActiveUsersThisWeek} this week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Assistants</CardTitle>
              <Bot className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <div className="text-3xl font-bold">{data?.metrics.totalAssistants}</div>
                  <p className="text-sm text-muted-foreground">+{data?.metrics.newAssistantsThisWeek} this week</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <div className="text-3xl font-bold">{data?.metrics.activeAssistants}</div>
                  <p className="text-sm text-muted-foreground">
                    +{data?.metrics.newActiveAssistantsThisWeek} this week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Chats</CardTitle>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <div className="text-3xl font-bold">{data?.metrics.totalChats}</div>
                  <p className="text-sm text-muted-foreground">+{data?.metrics.newChatsThisWeek} this week</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <div className="text-3xl font-bold">{data?.metrics.activeChats}</div>
                  <p className="text-sm text-muted-foreground">+{data?.metrics.newActiveChatsThisWeek} this week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Total Documents</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.metrics.totalDocuments}</div>
              <p className="text-sm text-muted-foreground">Across {data?.metrics.totalSources} sources</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Response Times</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Crawl</p>
                  <div className="text-3xl font-bold">{data?.technicalOperations.weeklyAvgCrawlTime}ms</div>
                  <p className="text-sm text-muted-foreground">Weekly avg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chat</p>
                  <div className="text-3xl font-bold">{data?.technicalOperations.avgChatTime}ms</div>
                  <p className="text-sm text-muted-foreground">Response time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Web Searches</CardTitle>
              <Search className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.technicalOperations.percentWebSearches.toFixed(2)}%</div>
              <p className="text-sm text-muted-foreground">Of total queries</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Metrics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Active Metrics</CardTitle>
            <CardDescription>Active users, assistants, and chat sessions over the past week</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ActiveMetricsChart data={data?.weeklyActivity} />
          </CardContent>
        </Card>

        {/* New Metrics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>New Metrics</CardTitle>
            <CardDescription>New users, assistants, and chat sessions over the past week</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <NewMetricsChart data={data?.weeklyActivity} />
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth by Week</CardTitle>
            <CardDescription>New users that have signed up each week</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <UserGrowthChart data={data?.userData.signupsByWeek} />
          </CardContent>
        </Card>

        {/* User Retention */}
        <Card>
          <CardHeader>
            <CardTitle>User Retention Rate</CardTitle>
            <CardDescription>Weekly user retention rate</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <UserRetentionChart data={data?.userData.retentionRate} />
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Assistant Model Distribution</CardTitle>
            <CardDescription>Distribution of AI models used by assistants</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ModelDistribution data={data?.assistantData.modelDistribution} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

function DashboardSkeleton() {
  return (
    <DashboardShell>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-[250px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="gap-2">
                <Skeleton className="h-5 w-1/2" />
              </CardHeader>
              <CardContent className="h-10">
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-5 w-[140px] mt-2" />
              </CardContent>
            </Card>
          ))}
      </div>
      <div className="space-y-6">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-[200px]" />
                <Skeleton className="h-4 w-[300px] mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[250px] w-full" />
              </CardContent>
            </Card>
          ))}
      </div>
    </DashboardShell>
  )
}

