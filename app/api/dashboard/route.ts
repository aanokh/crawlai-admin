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
    WITH
    
    total_chats AS (
      SELECT
        COUNT(*)
      FROM
        chats c
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM assistants a
          JOIN nextauth_users nu
            ON nu.user_id = a.user_id
          WHERE
            a.assistant_id = c.assistant_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    total_users AS (
      SELECT
        COUNT(*)
      FROM
        users u
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nextauth_users nu
          WHERE
            nu.user_id = u.user_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    total_assistants AS (
      SELECT
        COUNT(*) AS total_assistants
      FROM
        assistants a
      WHERE
        NOT EXISTS (
          SELECT 1
          FROM nextauth_users nu
          WHERE
            nu.user_id = a.user_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    new_assistants AS (
      SELECT
        COUNT(DISTINCT cl.assistant_id)
      FROM
        crawl_logs cl
      WHERE
        cl.new_assistant = TRUE
        -- start of last calendar week (Mon 00:00)…
        AND cl.end_timestamp >= date_trunc('week', current_date)
        -- …up to the start of this calendar week (Mon 00:00), exclusive
        AND cl.end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
        -- exclude any with a matching user whose password_hash = 'temporary password'
        AND NOT EXISTS (
          SELECT 1
          FROM nextauth_users nu
          WHERE nu.user_id = cl.user_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    new_chats AS (
      SELECT
        COUNT(DISTINCT ml.chat_id)
      FROM
        message_logs ml
      WHERE
        ml.new_chat = TRUE
        -- from start of last calendar week (Mon 00:00)…
        AND ml.end_timestamp >= date_trunc('week', current_date)
        -- …up to the start of this calendar week (Mon 00:00), exclusive
        AND ml.end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
        -- exclude users whose password_hash = 'temporary password'
        AND NOT EXISTS (
          SELECT 1
          FROM nextauth_users nu
          WHERE nu.user_id = ml.user_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    new_users AS (
      SELECT
        COUNT(DISTINCT u.user_id)
      FROM
        users u
      WHERE
        -- only those created since last week’s Monday 00:00
        u.created_time >= date_trunc('week', current_date)
        -- up to this week’s Monday 00:00 (exclusive)
        AND u.created_time <  date_trunc('week', current_date) + INTERVAL '1 week'
        -- drop any with a matching nextauth_users row where the password is 'temporary password'
        AND NOT EXISTS (
          SELECT 1
          FROM nextauth_users nu
          WHERE nu.user_id = u.user_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    active_users AS (
      SELECT
        COUNT(DISTINCT logs.user_id)
      FROM (
        SELECT user_id, end_timestamp
        FROM message_logs
        WHERE end_timestamp >= date_trunc('week', current_date)
          AND end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
        UNION ALL
        SELECT user_id, end_timestamp
        FROM crawl_logs
        WHERE end_timestamp >= date_trunc('week', current_date)
          AND end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
      ) AS logs
      WHERE NOT EXISTS (
        SELECT 1
        FROM nextauth_users nu
        WHERE nu.user_id = logs.user_id
          AND nu.password_hash = 'temporary password'
      )
    ),

    active_assistants AS (
      SELECT
        COUNT(DISTINCT logs.assistant_id)
      FROM (
        SELECT assistant_id, end_timestamp
        FROM message_logs
        WHERE
          end_timestamp >= date_trunc('week', current_date)
          AND end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
        UNION ALL
        SELECT assistant_id, end_timestamp
        FROM crawl_logs
        WHERE
          end_timestamp >= date_trunc('week', current_date)
          AND end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
      ) AS logs
      JOIN assistants a
        ON a.assistant_id = logs.assistant_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM nextauth_users nu
        WHERE
          nu.user_id = a.user_id
          AND nu.password_hash = 'temporary password'
      )
    ),

    active_chats AS (
      SELECT
        COUNT(DISTINCT ml.chat_id)
      FROM
        message_logs ml
        JOIN assistants a
          ON a.assistant_id = ml.assistant_id
      WHERE
        ml.end_timestamp >= date_trunc('week', current_date)
        AND ml.end_timestamp <  date_trunc('week', current_date) + INTERVAL '1 week'
        AND NOT EXISTS (
          SELECT 1
          FROM nextauth_users nu
          WHERE
            nu.user_id      = a.user_id
            AND nu.password_hash = 'temporary password'
        )
    ),

    total_documents AS (
      SELECT
        SUM(document_count)
      FROM
        sources
    ),

    total_sources AS (
      SELECT
        COUNT(*) AS total_source_rows
      FROM
        sources
    )

    SELECT
      (SELECT * FROM total_chats)        AS total_chats,
      (SELECT * FROM total_users)        AS total_users,
      (SELECT * FROM total_assistants)   AS total_assistants,
      (SELECT * FROM new_assistants)     AS new_assistants,
      (SELECT * FROM new_chats)          AS new_chats,
      (SELECT * FROM new_users)          AS new_users,
      (SELECT * FROM active_users)       AS active_users,
      (SELECT * FROM active_assistants)  AS active_assistants,
      (SELECT * FROM active_chats)       AS active_chats,
      (SELECT * FROM total_documents)    AS total_documents,
      (SELECT * FROM total_sources)      AS total_sources;
  `;

  const metricsData = {
    metrics: {
      totalUsers: Number(metrics.total_users), //done
      activeUsers: Number(metrics.active_users), //done
      newUsersThisWeek: Number(metrics.new_users), //done
      newActiveUsersThisWeek: Number(metrics.newActiveUsersThisWeek),
      totalAssistants: Number(metrics.total_assistants), //done
      activeAssistants: Number(metrics.active_assistants),// done
      newAssistantsThisWeek: Number(metrics.new_assistants), // done
      newActiveAssistantsThisWeek: Number(metrics.newActiveAssistantsThisWeek),
      totalChats: Number(metrics.total_chats), //done
      activeChats: Number(metrics.active_chats), //done
      newChatsThisWeek: Number(metrics.new_chats), // done
      newActiveChatsThisWeek: Number(metrics.newActiveChatsThisWeek), //done
      totalDocuments: Number(metrics.total_documents), //done
      totalSources: Number(metrics.total_sources), //done
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
    ),
    web_search AS (
      SELECT
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE web_search)
          / NULLIF(COUNT(*), 0)
        , 2) AS percent_web_search
      FROM
        message_logs
    )
    SELECT 
      ROUND(COALESCE(AVG(ct.duration_ms), 0)) as "avgChatTime",
      ROUND(COALESCE(AVG(crt.duration_ms), 0)) as "weeklyAvgCrawlTime",
      MAX(ws.percent_web_search) as "percentWebSearches"
    FROM chat_times ct, crawl_times crt, web_search ws`;

  const technicalOperations = {
    weeklyAvgCrawlTime: Number(timingMetrics.weeklyAvgCrawlTime),
    avgChatTime: Number(timingMetrics.avgChatTime),
    percentWebSearches: Number(timingMetrics.percentWebSearches)
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
    ...metricsData,
    weeklyActivity,
    assistantData: {
      modelDistribution: modelDistribution
    },
    technicalOperations,
    userData
  })
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
