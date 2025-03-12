import { NextResponse } from "next/server"
import sql from "@/lib/db"


function calculateRetentionRate(startUsers: number, endUsers: number, newUsers: number): number {
  return ((endUsers - newUsers) / startUsers) * 100
}

export async function GET() {
  // This is where you would connect to your database
  // For now, we'll use mock data

  // Get weekly activity data for the past 7 days
  const weeklyActivity = await sql`
    WITH dates AS (
      SELECT generate_series(
        date_trunc('day', NOW() - interval '6 days'),
        date_trunc('day', NOW()),
        interval '1 day'
      )::date AS date
    ),
    new_users AS (
      SELECT 
        date_trunc('day', created_time)::date AS date,
        COUNT(*) as count
      FROM users 
      WHERE created_time >= NOW() - interval '7 days'
      GROUP BY 1
    ),
    new_chats AS (
      SELECT 
        date_trunc('day', end_timestamp)::date AS date,
        COUNT(DISTINCT chat_id) as count
      FROM message_logs
      WHERE new_chat = true 
      AND end_timestamp >= NOW() - interval '7 days'
      GROUP BY 1
    ),
    new_assistants AS (
      SELECT
        date_trunc('day', end_timestamp)::date AS date, 
        COUNT(DISTINCT assistant_id) as count
      FROM crawl_logs
      WHERE new_assistant = true
      AND end_timestamp >= NOW() - interval '7 days'
      GROUP BY 1
    ),
    active_counts AS (
      SELECT 
        date_trunc('day', date) AS date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT assistant_id) as active_assistants,
        COUNT(DISTINCT chat_id) as active_chats
      FROM (
        SELECT 
          end_timestamp::date as date,
          user_id,
          assistant_id,
          chat_id
        FROM message_logs
        WHERE end_timestamp >= NOW() - interval '7 days'
        UNION
        SELECT
          end_timestamp::date as date,
          user_id,
          assistant_id,
          NULL as chat_id
        FROM crawl_logs 
        WHERE end_timestamp >= NOW() - interval '7 days'
      ) combined_logs
      GROUP BY 1
    )
    SELECT
      to_char(d.date, 'Mon DD') as date,
      COALESCE(nu.count, 0) as "newUsers",
      COALESCE(nc.count, 0) as "newChats",
      COALESCE(na.count, 0) as "newAssistants",
      COALESCE(ac.active_users, 0) as "activeUsers",
      COALESCE(ac.active_assistants, 0) as "activeAssistants",
      COALESCE(ac.active_chats, 0) as "activeChats"
    FROM dates d
    LEFT JOIN new_users nu ON d.date = nu.date
    LEFT JOIN new_chats nc ON d.date = nc.date
    LEFT JOIN new_assistants na ON d.date = na.date
    LEFT JOIN active_counts ac ON d.date = ac.date
    ORDER BY d.date ASC`;

    

  // Calculate weekly totals from the activity data
  const newUsersThisWeek = weeklyActivity.reduce((sum, day) => sum + Number(day.newUsers), 0);
  const newChatsThisWeek = weeklyActivity.reduce((sum, day) => sum + Number(day.chatSessions), 0);
  const newAssistantsThisWeek = weeklyActivity.reduce((sum, day) => sum + Number(day.newAssistants), 0);

  const modelDistribution = await sql`
    SELECT 
      model_name as name,
      COUNT(*)::integer as value
    FROM assistants
    GROUP BY model_name
    ORDER BY value DESC
  `;

  // Get basic metrics
  

  // Example: const data = await db.query('SELECT * FROM users');
  const [metrics] = await sql`
    WITH active_counts AS (
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT assistant_id) as active_assistants,
        COUNT(DISTINCT chat_id) as active_chats
      FROM (
        SELECT 
          user_id, 
          assistant_id, 
          chat_id, 
          end_timestamp 
        FROM message_logs
        WHERE end_timestamp >= date_trunc('week', NOW())
        AND end_timestamp < date_trunc('week', NOW() + interval '1 week')
        UNION
        SELECT 
          user_id, 
          assistant_id, 
          NULL as chat_id, 
          end_timestamp 
        FROM crawl_logs
        WHERE end_timestamp >= date_trunc('week', NOW())
        AND end_timestamp < date_trunc('week', NOW() + interval '1 week')
      ) combined_logs
    ),
    new_users AS (
      SELECT COUNT(DISTINCT user_id) as new_users
      FROM users
      WHERE created_time >= date_trunc('week', NOW())
      AND created_time < date_trunc('week', NOW() + interval '1 week')
    ),
    new_assistants AS (
      SELECT COUNT(DISTINCT assistant_id) as new_assistants
      FROM crawl_logs
      WHERE new_assistant = true
      AND end_timestamp >= date_trunc('week', NOW())
      AND end_timestamp < date_trunc('week', NOW() + interval '1 week')
    ),
    new_chats AS (
      SELECT COUNT(DISTINCT chat_id) as new_chats
      FROM message_logs
      WHERE new_chat = true
      AND end_timestamp >= date_trunc('week', NOW())
      AND end_timestamp < date_trunc('week', NOW() + interval '1 week')
    )
    SELECT
      (SELECT COUNT(DISTINCT user_id) FROM users) as "totalUsers",
      active_counts.active_users as "activeUsers",
      new_users.new_users as "newUsersThisWeek",
      (SELECT COUNT(DISTINCT assistant_id) FROM assistants) as "totalAssistants",
      active_counts.active_assistants as "activeAssistants",
      new_assistants.new_assistants as "newAssistantsThisWeek",
      (SELECT COUNT(DISTINCT chat_id) FROM chats) as "totalChats",
      active_counts.active_chats as "activeChats",
      new_chats.new_chats as "newChatsThisWeek",
      (SELECT COALESCE(SUM(document_count), 0) FROM sources) as "totalDocuments",
      (SELECT COUNT(*) FROM sources) as "totalSources"
    FROM
      active_counts,
      new_users,
      new_assistants,
      new_chats;
  `;

  const mockData = {
    metrics: {
      totalUsers: Number(metrics.totalUsers),
      activeUsers: Number(metrics.activeUsers),
      newUsersThisWeek: Number(metrics.newUsersThisWeek),
      newActiveUsersThisWeek: Number(metrics.newActiveUsersThisWeek),
      totalAssistants: Number(metrics.totalAssistants),
      activeAssistants: Number(metrics.activeAssistants),
      newAssistantsThisWeek: Number(metrics.newAssistantsThisWeek),
      newActiveAssistantsThisWeek: Number(metrics.newActiveAssistantsThisWeek),
      totalChats: Number(metrics.totalChats),
      activeChats: Number(metrics.activeChats),
      newChatsThisWeek: Number(metrics.newChatsThisWeek),
      newActiveChatsThisWeek: Number(metrics.newActiveChatsThisWeek),
      totalDocuments: Number(metrics.totalDocuments),
      totalSources: Number(metrics.totalSources),
    }
  }

  const [timingMetrics] = await sql`
    WITH chat_times AS (
      SELECT 
        ROUND(EXTRACT(EPOCH FROM (end_timestamp - start_timestamp)) * 1000) as duration_ms
      FROM message_logs
      WHERE end_timestamp >= date_trunc('week', NOW())
      AND end_timestamp < date_trunc('week', NOW() + interval '1 week')
    ),
    crawl_times AS (
      SELECT 
        ROUND(EXTRACT(EPOCH FROM (end_timestamp - start_timestamp)) * 1000) as duration_ms
      FROM crawl_logs
      WHERE end_timestamp >= date_trunc('week', NOW())
      AND end_timestamp < date_trunc('week', NOW() + interval '1 week')
      AND new_assistant = true
    )
    SELECT 
      ROUND(COALESCE(AVG(ct.duration_ms), 0)) as "avgChatTime",
      ROUND(COALESCE(AVG(crt.duration_ms), 0)) as "weeklyAvgCrawlTime",
      50 as "percentWebSearches"
    FROM chat_times ct, crawl_times crt`;

  const technicalOperations = {
    weeklyAvgCrawlTime: Number(timingMetrics.weeklyAvgCrawlTime),
    avgChatTime: Number(timingMetrics.avgChatTime),
    percentWebSearches: 50  // Fixed at 50% as requested
  };

  // Get weekly user data (active users in a week, new users in a week)
  const weeklyData = await sql`
    WITH RECURSIVE weeks AS (
      SELECT 
        date_trunc('week', NOW())::timestamp AS week_start
      UNION ALL
      SELECT 
        (week_start - interval '7 days')::timestamp
      FROM weeks
      WHERE week_start > NOW() - interval '8 weeks'
    ),
    new_users_by_week AS (
      SELECT
        date_trunc('week', created_time)::timestamp as week_start,
        COUNT(DISTINCT user_id) as new_users
      FROM users 
      WHERE created_time >= NOW() - interval '8 weeks'
      GROUP BY 1
    )
    SELECT
      to_char(w.week_start, 'YYYY-MM-DD') as week_start,
      COUNT(DISTINCT user_id) as active_users,
      COALESCE(nu.new_users, 0) as new_users
    FROM weeks w
    LEFT JOIN (
      SELECT 
        date_trunc('week', end_timestamp)::timestamp as week_start,
        user_id 
      FROM (
        SELECT end_timestamp, user_id FROM crawl_logs
        UNION
        SELECT end_timestamp, user_id FROM message_logs
      ) combined_logs
      WHERE end_timestamp >= NOW() - interval '8 weeks'
    ) activity ON activity.week_start = w.week_start
    LEFT JOIN new_users_by_week nu ON w.week_start = nu.week_start
    GROUP BY w.week_start, nu.new_users
    ORDER BY w.week_start DESC`;

  console.log(weeklyData);

  // Transform weeklyData into userData format, limiting to 7 weeks
  const userData = {
    signupsByWeek: weeklyData.slice(0, 7).map((week, i) => ({
      week: `Week ${7 - i}`, 
      count: Number(week.new_users)
    })).reverse(),

    retentionRate: weeklyData.slice(0, 7).map((week, i) => {
      const currentActiveUsers = Number(week.active_users)
      const newUsers = Number(week.new_users)
      // Get previous week's active users (from 8th week for first calculation)
      const prevActiveUsers = Number(weeklyData[i + 1]?.active_users || 0)

      const retentionRate = calculateRetentionRate(
        prevActiveUsers,
        currentActiveUsers, 
        newUsers
      )

      return {
        week: `Week ${7 - i}`,
        rate: Number(retentionRate.toFixed(2))
      }
    }).reverse()
  }

  return NextResponse.json({
    ...mockData,
    weeklyActivity,
    assistantData: {
      modelDistribution: modelDistribution
    },
    technicalOperations,
    userData
  })
}

function generateMockData() {
  const today = new Date()

  // Basic metrics
  const metrics = {
    totalUsers: 1287,
    activeUsers: 543,
    newUsersThisWeek: 43,
    newActiveUsersThisWeek: 28,

    totalAssistants: 3421,
    activeAssistants: 1245,
    newAssistantsThisWeek: 128,
    newActiveAssistantsThisWeek: 87,

    totalChats: 15642,
    activeChats: 2341,
    newChatsThisWeek: 743,
    newActiveChatsThisWeek: 412,

    totalDocuments: 8754,
    totalSources: 521,
  }

  // Weekly activity data (last 7 days)
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - i))

    // On the last day, use the exact same values as in the metrics
    // to ensure consistency between the chart and the stat boxes
    if (i === 6) {
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        newUsers: metrics.newUsersThisWeek,
        activeUsers: metrics.activeUsers,
        newChats: metrics.newChatsThisWeek,
        activeChats: metrics.activeChats,
        newAssistants: metrics.newAssistantsThisWeek,
        activeAssistants: metrics.activeAssistants,
      }
    }

    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      newUsers: Math.floor(Math.random() * 15) + 3,
      activeUsers: Math.floor(Math.random() * 100) + 400,
      newChats: Math.floor(Math.random() * 150) + 50,
      activeChats: Math.floor(Math.random() * 500) + 1500,
      newAssistants: Math.floor(Math.random() * 25) + 5,
      activeAssistants: Math.floor(Math.random() * 200) + 1000,
    }
  })

  // User data
  const userData = {
    signupsByWeek: Array.from({ length: 7 }, (_, i) => {
      // For the last week, use the same value as in metrics
      if (i === 6) {
        return {
          week: `Week ${7 - i}`,
          count: metrics.newUsersThisWeek,
        }
      }
      return {
        week: `Week ${7 - i}`,
        count: Math.floor(Math.random() * 50) + 20,
      }
    }).reverse(),
    retentionRate: (() => {
      let previousWeekUsers = 1000 // Starting with an assumed base of 1000 users
      return Array.from({ length: 7 }, (_, i) => {
        const newUsers = i === 6 ? metrics.newUsersThisWeek : Math.floor(Math.random() * 50) + 20
        const currentWeekUsers = previousWeekUsers + newUsers
        const retentionRate = calculateRetentionRate(previousWeekUsers, currentWeekUsers, newUsers)
        previousWeekUsers = currentWeekUsers
        return {
          week: `Week ${7 - i}`,
          rate: Number.parseFloat(retentionRate.toFixed(2)),
        }
      }).reverse()
    })(),
  }

  // Assistant data
  const assistantData = {
    modelDistribution: [
      { name: "gpt-4o", value: 1842 },
      { name: "claude-3", value: 724 },
      { name: "gemini-pro", value: 512 },
      { name: "mistral", value: 343 },
    ],
  }

  // Technical operations data
  const technicalOperations = {
    weeklyAvgCrawlTime: Math.floor(Math.random() * 500) + 1000, // 1000-1500 milliseconds
    avgChatTime: Math.floor(Math.random() * 1000) + 2000, // 2000-3000 milliseconds
    percentWebSearches: Math.random() * 30 + 10, // 10-40%
  }

  return {
    metrics,
    weeklyActivity,
    userData,
    assistantData,
    technicalOperations,
  }
}
/*
schema definition

interface DashboardData {
  metrics: {
    totalUsers: number
    activeUsers: number
    newUsersThisWeek: number
    newActiveUsersThisWeek: number
    totalAssistants: number
    activeAssistants: number
    newAssistantsThisWeek: number
    newActiveAssistantsThisWeek: number
    totalChats: number
    activeChats: number
    newChatsThisWeek: number
    newActiveChatsThisWeek: number
    totalDocuments: number
    totalSources: number
  }

  weeklyActivity: Array<{
    date: string  // Format: "MMM D" (e.g., "Jan 15")
    newUsers: number
    activeUsers: number
    newChats: number
    activeChats: number
    newAssistants: number
    activeAssistants: number
  }>

  userData: {
    signupsByWeek: Array<{
      week: string  // Format: "Week N" (e.g., "Week 1")
      count: number
    }>
    retentionRate: Array<{
      week: string  // Format: "Week N" (e.g., "Week 1")
      rate: number  // Fixed to 2 decimal places
    }>
  }

  assistantData: {
    modelDistribution: Array<{
      name: string  // Model names like "gpt-4o", "claude-3", etc.
      value: number
    }>
  }

  technicalOperations: {
    weeklyAvgCrawlTime: number  // milliseconds (1000-1500)
    avgChatTime: number         // milliseconds (2000-3000)
    percentWebSearches: number  // percentage (10-40)
  }
}
*/
