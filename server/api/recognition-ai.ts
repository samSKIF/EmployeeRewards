import express from 'express';
import { db } from '../db';
import { users, recognitions } from '@shared/schema';
import { sql, eq, and, gte, desc, count, isNotNull } from 'drizzle-orm';

const router = express.Router();

// Helper function to get recognition analytics data
async function getAnalyticsData() {
  try {
    // Get total employee count
    const totalEmployees = await db.select({ count: count() }).from(users);
    
    // Get basic recognition stats
    const totalRecognitions = await db.select({ count: count() }).from(recognitions);
    
    // Get department stats with employee counts
    const departmentStats = await db
      .select({
        department: users.department,
        employeeCount: count(users.id),
      })
      .from(users)
      .where(sql`${users.department} IS NOT NULL`)
      .groupBy(users.department);

    // Get recognition stats by department
    const recognitionByDept = await db
      .select({
        department: users.department,
        recognitionCount: count(recognitions.id),
      })
      .from(recognitions)
      .leftJoin(users, eq(recognitions.recipientId, users.id))
      .where(sql`${users.department} IS NOT NULL`)
      .groupBy(users.department);

    // Get monthly trends (last 6 months)
    const monthlyTrends = await db
      .select({
        month: sql<string>`TO_CHAR(${recognitions.createdAt}, 'YYYY-MM')`,
        count: count(recognitions.id),
      })
      .from(recognitions)
      .where(gte(recognitions.createdAt, sql`NOW() - INTERVAL '6 months'`))
      .groupBy(sql`TO_CHAR(${recognitions.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${recognitions.createdAt}, 'YYYY-MM')`);

    // Get top recognizers
    const topRecognizers = await db
      .select({
        name: users.name,
        department: users.department,
        recognitionCount: count(recognitions.id),
      })
      .from(recognitions)
      .leftJoin(users, eq(recognitions.recognizerId, users.id))
      .where(sql`${users.name} IS NOT NULL`)
      .groupBy(users.id, users.name, users.department)
      .orderBy(desc(count(recognitions.id)))
      .limit(10);

    // Get most recognized employees
    const topRecipients = await db
      .select({
        name: users.name,
        department: users.department,
        recognitionCount: count(recognitions.id),
      })
      .from(recognitions)
      .leftJoin(users, eq(recognitions.recipientId, users.id))
      .where(sql`${users.name} IS NOT NULL`)
      .groupBy(users.id, users.name, users.department)
      .orderBy(desc(count(recognitions.id)))
      .limit(10);

    return {
      totalEmployees: totalEmployees[0]?.count || 0,
      totalRecognitions: totalRecognitions[0]?.count || 0,
      departmentStats,
      recognitionByDept,
      monthlyTrends,
      topRecognizers,
      topRecipients,
    };
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return null;
  }
}

// Function to generate chart data based on AI response
function generateChartConfig(question: string, data: any) {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('department') && lowerQuestion.includes('engagement')) {
    return {
      type: 'bar',
      data: {
        labels: data.departmentStats?.map((d: any) => d.department) || [],
        datasets: [{
          label: 'Recognition Count',
          data: data.departmentStats?.map((d: any) => d.recognitionCount) || [],
          backgroundColor: '#8884d8'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Recognition Count by Department'
          }
        }
      }
    };
  }
  
  if (lowerQuestion.includes('trend') || lowerQuestion.includes('time')) {
    return {
      type: 'line',
      data: {
        labels: data.monthlyTrends?.map((d: any) => d.month) || [],
        datasets: [{
          label: 'Monthly Recognitions',
          data: data.monthlyTrends?.map((d: any) => d.count) || [],
          borderColor: '#82ca9d',
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Recognition Trends Over Time'
          }
        }
      }
    };
  }

  if (lowerQuestion.includes('top') || lowerQuestion.includes('best')) {
    return {
      type: 'bar',
      data: {
        labels: data.topRecognizers?.slice(0, 5).map((d: any) => d.name) || [],
        datasets: [{
          label: 'Recognitions Given',
          data: data.topRecognizers?.slice(0, 5).map((d: any) => d.recognitionCount) || [],
          backgroundColor: '#ffc658'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 5 Recognizers'
          }
        }
      }
    };
  }

  return null;
}

// Conversational AI endpoint
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get current analytics data
    const analyticsData = await getAnalyticsData();
    
    if (!analyticsData) {
      return res.status(500).json({ error: 'Failed to fetch analytics data' });
    }

    // Smart pattern matching for common analytics questions
    const lowerQuestion = question.toLowerCase();
    let answer = '';
    let insights = [];

    // Employee count questions
    if (lowerQuestion.includes('employee') && (lowerQuestion.includes('count') || lowerQuestion.includes('many') || lowerQuestion.includes('total'))) {
      answer = `Your company has ${analyticsData.totalEmployees} total employees across all departments.`;
      insights = [`Company size: ${analyticsData.totalEmployees} employees`, 'This represents your current workforce'];
    }
    
    // Department questions
    else if (lowerQuestion.includes('department')) {
      if (lowerQuestion.includes('most') || lowerQuestion.includes('largest')) {
        const largestDept = analyticsData.departmentStats?.reduce((max, dept) => 
          dept.employeeCount > (max?.employeeCount || 0) ? dept : max
        );
        answer = largestDept ? 
          `${largestDept.department} is your largest department with ${largestDept.employeeCount} employees.` :
          'Department data is not available at the moment.';
        insights = largestDept ? [`${largestDept.department}: ${largestDept.employeeCount} employees`, 'This department may need more recognition focus'] : [];
      } else {
        const deptList = analyticsData.departmentStats?.map(d => `${d.department}: ${d.employeeCount} employees`).join(', ') || 'No department data available';
        answer = `Here's your department breakdown: ${deptList}`;
        insights = ['Department distribution shows organizational structure', 'Consider recognition balance across departments'];
      }
    }
    
    // Recognition questions
    else if (lowerQuestion.includes('recognition') && (lowerQuestion.includes('total') || lowerQuestion.includes('many'))) {
      answer = `Your company has recorded ${analyticsData.totalRecognitions} total recognitions so far.`;
      insights = [`Total recognitions: ${analyticsData.totalRecognitions}`, 'This shows your recognition culture activity'];
    }
    
    // Top recognizer questions
    else if (lowerQuestion.includes('top') && (lowerQuestion.includes('recognizer') || lowerQuestion.includes('giver'))) {
      const topRecognizer = analyticsData.topRecognizers?.[0];
      answer = topRecognizer ? 
        `${topRecognizer.name} from ${topRecognizer.department} is your top recognizer with ${topRecognizer.recognitionCount} recognitions given.` :
        'Recognition data is not available at the moment.';
      insights = topRecognizer ? [`${topRecognizer.name}: ${topRecognizer.recognitionCount} recognitions given`, 'This employee shows strong peer appreciation'] : [];
    }
    
    // Trends questions
    else if (lowerQuestion.includes('trend') || lowerQuestion.includes('pattern')) {
      const recentTrend = analyticsData.monthlyTrends?.slice(-2);
      if (recentTrend && recentTrend.length >= 2) {
        const change = recentTrend[1].count - recentTrend[0].count;
        const direction = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained stable';
        answer = `Recognition activity has ${direction} recently. Last month: ${recentTrend[1].count} recognitions vs previous month: ${recentTrend[0].count}.`;
        insights = [`Monthly change: ${change > 0 ? '+' : ''}${change}`, `Trend direction: ${direction}`];
      } else {
        answer = 'Trend data is not available for analysis at the moment.';
        insights = [];
      }
    }
    
    // Default response for other questions
    else {
      answer = `I can help you analyze your recognition data! Here's a quick overview: You have ${analyticsData.totalEmployees} employees with ${analyticsData.totalRecognitions} total recognitions. Try asking specific questions about departments, top performers, or recognition trends.`;
      insights = [
        `${analyticsData.totalEmployees} total employees`,
        `${analyticsData.totalRecognitions} total recognitions`,
        'Ask about departments, trends, or top performers'
      ];
    }

    const aiResponse = { answer, insights };
    
    // Generate chart configuration if applicable
    const chartConfig = generateChartConfig(question, analyticsData);

    res.json({
      answer: aiResponse.answer || 'I was unable to analyze that question.',
      insights: aiResponse.insights || [],
      chartConfig,
      rawData: analyticsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AI conversation:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get suggested questions
router.get('/suggestions', (req, res) => {
  const suggestions = [
    "Which department has the most engagement this month?",
    "Show me sentiment trends in Sales over last quarter",
    "Who are our top 5 recognizers?",
    "What's the recognition trend for the last 6 months?",
    "Which team needs more recognition?",
    "How does Engineering compare to other departments?",
    "What are the key insights from our recognition data?",
    "Show me monthly recognition patterns"
  ];

  res.json({ suggestions });
});

export default router;