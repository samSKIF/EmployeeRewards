import express from 'express';
import OpenAI from 'openai';
import { db } from '../db';
import { users, recognitions } from '@shared/schema';
import { sql, eq, and, gte, desc, count, isNotNull } from 'drizzle-orm';

const router = express.Router();

// Initialize OpenAI - the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Helper function to get recognition analytics data
async function getAnalyticsData() {
  try {
    // Get basic recognition stats
    const totalRecognitions = await db.select({ count: count() }).from(recognitions);
    
    // Get department stats
    const departmentStats = await db
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
      .groupBy(users.id, users.name, users.department)
      .orderBy(desc(count(recognitions.id)))
      .limit(10);

    return {
      totalRecognitions: totalRecognitions[0]?.count || 0,
      departmentStats,
      monthlyTrends,
      topRecognizers,
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

    // Create context for AI
    const context = `
    You are an AI assistant for employee recognition analytics. Here's the current data:

    Total Recognitions: ${analyticsData.totalRecognitions}
    
    Department Statistics:
    ${analyticsData.departmentStats?.map(d => `${d.department}: ${d.recognitionCount} recognitions`).join('\n') || 'No department data'}
    
    Monthly Trends (last 6 months):
    ${analyticsData.monthlyTrends?.map(d => `${d.month}: ${d.count} recognitions`).join('\n') || 'No trend data'}
    
    Top Recognizers:
    ${analyticsData.topRecognizers?.slice(0, 5).map(d => `${d.name} (${d.department}): ${d.recognitionCount} recognitions`).join('\n') || 'No recognizer data'}

    Please answer the user's question about recognition analytics in a helpful, concise way. Focus on actionable insights and specific numbers from the data above. Format your response in JSON with 'answer' and 'insights' fields.
    `;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: context },
        { role: "user", content: question }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
    
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