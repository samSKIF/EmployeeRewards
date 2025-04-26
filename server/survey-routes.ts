import { Router, Request, Response } from "express";
import { db } from "./db";
import { 
  surveys, 
  surveySections, 
  surveyQuestions, 
  surveyRecipients, 
  surveyResponses, 
  surveyTemplates,
  insertSurveySchema, 
  insertSurveySectionSchema,
  insertSurveyQuestionSchema,
  insertSurveyRecipientSchema,
  users,
  Survey
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { verifyToken, verifyAdmin, AuthenticatedRequest } from "./middleware/auth";

const router = Router();

// Survey Template Endpoints

// Get all survey templates
router.get("/templates", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await db.select().from(surveyTemplates);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching survey templates:", error);
    res.status(500).json({ message: "Failed to fetch survey templates" });
  }
});

// Get a specific survey template
router.get("/templates/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [template] = await db.select().from(surveyTemplates).where(eq(surveyTemplates.id, id));
    if (!template) {
      return res.status(404).json({ message: "Survey template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error fetching survey template:", error);
    res.status(500).json({ message: "Failed to fetch survey template" });
  }
});

// Create a new survey template
router.post("/templates", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, type, structure } = req.body;
    
    // Check if template with the same name already exists
    const existingTemplate = await db.select()
      .from(surveyTemplates)
      .where(eq(surveyTemplates.name, name));
      
    if (existingTemplate.length > 0) {
      return res.status(400).json({ message: "A template with this name already exists" });
    }
    
    const [template] = await db.insert(surveyTemplates)
      .values({
        name,
        description,
        type,
        structure,
        createdBy: req.user.id,
      })
      .returning();
      
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating survey template:", error);
    res.status(500).json({ message: "Failed to create survey template" });
  }
});

// Update a survey template
router.put("/templates/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, type, structure } = req.body;
    
    // Check if template exists
    const [existingTemplate] = await db.select()
      .from(surveyTemplates)
      .where(eq(surveyTemplates.id, id));
      
    if (!existingTemplate) {
      return res.status(404).json({ message: "Survey template not found" });
    }
    
    // Check if name is already taken by a different template
    if (name !== existingTemplate.name) {
      const duplicateName = await db.select()
        .from(surveyTemplates)
        .where(and(
          eq(surveyTemplates.name, name),
          eq(surveyTemplates.id, id)
        ));
        
      if (duplicateName.length > 0) {
        return res.status(400).json({ message: "A template with this name already exists" });
      }
    }
    
    const [template] = await db.update(surveyTemplates)
      .set({
        name,
        description,
        type,
        structure,
      })
      .where(eq(surveyTemplates.id, id))
      .returning();
      
    res.json(template);
  } catch (error) {
    console.error("Error updating survey template:", error);
    res.status(500).json({ message: "Failed to update survey template" });
  }
});

// Delete a survey template
router.delete("/templates/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if template exists
    const [existingTemplate] = await db.select()
      .from(surveyTemplates)
      .where(eq(surveyTemplates.id, id));
      
    if (!existingTemplate) {
      return res.status(404).json({ message: "Survey template not found" });
    }
    
    await db.delete(surveyTemplates)
      .where(eq(surveyTemplates.id, id));
      
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting survey template:", error);
    res.status(500).json({ message: "Failed to delete survey template" });
  }
});

// Survey Endpoints

// Get all surveys (admin only)
router.get("/", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allSurveys = await db.select().from(surveys);
    res.json(allSurveys);
  } catch (error) {
    console.error("Error fetching surveys:", error);
    res.status(500).json({ message: "Failed to fetch surveys" });
  }
});

// Get surveys assigned to the current user
router.get("/assigned", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Find survey recipients for this user
    const recipients = await db.select()
      .from(surveyRecipients)
      .where(eq(surveyRecipients.userId, req.user.id));
      
    if (recipients.length === 0) {
      return res.json([]);
    }
    
    // Get the survey IDs
    const surveyIds = recipients.map(r => r.surveyId);
    
    // Fetch the surveys
    const userSurveys = await db.select()
      .from(surveys)
      .where(inArray(surveys.id, surveyIds));
      
    // Combine with recipient status
    const surveysWithStatus = userSurveys.map(survey => {
      const recipient = recipients.find(r => r.surveyId === survey.id);
      return {
        ...survey,
        status: recipient?.status || "pending",
        completedAt: recipient?.completedAt
      };
    });
    
    res.json(surveysWithStatus);
  } catch (error) {
    console.error("Error fetching assigned surveys:", error);
    res.status(500).json({ message: "Failed to fetch assigned surveys" });
  }
});

// Get a specific survey with its sections and questions
router.get("/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Get the survey
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }
    
    // Check if user is admin or is assigned to this survey
    const isAdmin = req.user.isAdmin;
    
    if (!isAdmin) {
      const [recipient] = await db.select()
        .from(surveyRecipients)
        .where(and(
          eq(surveyRecipients.surveyId, id),
          eq(surveyRecipients.userId, req.user.id)
        ));
        
      if (!recipient) {
        return res.status(403).json({ message: "You don't have access to this survey" });
      }
    }
    
    // Get survey sections
    const sections = await db.select()
      .from(surveySections)
      .where(eq(surveySections.surveyId, id));
      
    // Get questions for each section
    const sectionIds = sections.map(s => s.id);
    const questions = await db.select()
      .from(surveyQuestions)
      .where(inArray(surveyQuestions.sectionId, sectionIds));
      
    // Get recipients count
    const recipients = await db.select()
      .from(surveyRecipients)
      .where(eq(surveyRecipients.surveyId, id));
      
    // Structure the response
    const surveyWithDetails = {
      ...survey,
      sections: sections.map(section => ({
        ...section,
        questions: questions
          .filter(q => q.sectionId === section.id)
          .sort((a, b) => a.order - b.order)
      })).sort((a, b) => a.order - b.order),
      recipientsCount: recipients.length,
      completedCount: recipients.filter(r => r.status === "completed").length
    };
    
    res.json(surveyWithDetails);
  } catch (error) {
    console.error("Error fetching survey details:", error);
    res.status(500).json({ message: "Failed to fetch survey details" });
  }
});

// Create a new survey
router.post("/", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      title, 
      description, 
      templateType,
      isAnonymous,
      isMandatory,
      startDate,
      endDate,
      status,
      sections = [],
      recipients = []
    } = req.body;
    
    // Create the survey
    const [survey] = await db.insert(surveys)
      .values({
        title,
        description,
        templateType,
        isAnonymous: isAnonymous || false,
        isMandatory: isMandatory || false,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || "draft",
        totalRecipients: recipients.length,
        createdBy: req.user.id
      })
      .returning();
      
    // Create sections and questions
    for (const [sectionIndex, section] of sections.entries()) {
      const [newSection] = await db.insert(surveySections)
        .values({
          surveyId: survey.id,
          title: section.title,
          description: section.description,
          order: sectionIndex
        })
        .returning();
        
      // Create questions for this section
      if (section.questions && Array.isArray(section.questions)) {
        for (const [questionIndex, question] of section.questions.entries()) {
          await db.insert(surveyQuestions)
            .values({
              sectionId: newSection.id,
              content: question.content,
              type: question.type,
              options: question.options,
              isRequired: question.isRequired !== false,
              order: questionIndex
            });
        }
      }
    }
    
    // Assign recipients
    if (recipients.length > 0) {
      const recipientInserts = recipients.map(userId => ({
        surveyId: survey.id,
        userId: parseInt(userId),
        status: "pending",
        notificationSent: false
      }));
      
      await db.insert(surveyRecipients)
        .values(recipientInserts);
    }
    
    res.status(201).json(survey);
  } catch (error) {
    console.error("Error creating survey:", error);
    res.status(500).json({ message: "Failed to create survey" });
  }
});

// Update a survey
router.put("/:id", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      title, 
      description, 
      templateType,
      isAnonymous,
      isMandatory,
      startDate,
      endDate,
      status
    } = req.body;
    
    // Check if survey exists
    const [existingSurvey] = await db.select()
      .from(surveys)
      .where(eq(surveys.id, id));
      
    if (!existingSurvey) {
      return res.status(404).json({ message: "Survey not found" });
    }
    
    // Update the survey
    const [updatedSurvey] = await db.update(surveys)
      .set({
        title,
        description,
        templateType,
        isAnonymous,
        isMandatory,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        updatedAt: new Date()
      })
      .where(eq(surveys.id, id))
      .returning();
      
    res.json(updatedSurvey);
  } catch (error) {
    console.error("Error updating survey:", error);
    res.status(500).json({ message: "Failed to update survey" });
  }
});

// Add recipients to a survey
router.post("/:id/recipients", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "No recipients provided" });
    }
    
    // Check if survey exists
    const [existingSurvey] = await db.select()
      .from(surveys)
      .where(eq(surveys.id, id));
      
    if (!existingSurvey) {
      return res.status(404).json({ message: "Survey not found" });
    }
    
    // Get existing recipients
    const existingRecipients = await db.select()
      .from(surveyRecipients)
      .where(eq(surveyRecipients.surveyId, id));
      
    const existingUserIds = existingRecipients.map(r => r.userId);
    
    // Filter out users who are already recipients
    const newUserIds = userIds.filter(userId => 
      !existingUserIds.includes(parseInt(userId))
    );
    
    if (newUserIds.length === 0) {
      return res.status(400).json({ message: "All users are already assigned to this survey" });
    }
    
    // Add new recipients
    const recipientInserts = newUserIds.map(userId => ({
      surveyId: id,
      userId: parseInt(userId),
      status: "pending",
      notificationSent: false
    }));
    
    await db.insert(surveyRecipients)
      .values(recipientInserts);
      
    // Update survey recipient count
    await db.update(surveys)
      .set({ 
        totalRecipients: existingRecipients.length + newUserIds.length,
        updatedAt: new Date()
      })
      .where(eq(surveys.id, id));
      
    res.status(201).json({ 
      message: `${newUserIds.length} recipients added to survey`
    });
  } catch (error) {
    console.error("Error adding survey recipients:", error);
    res.status(500).json({ message: "Failed to add recipients" });
  }
});

// Submit survey responses
router.post("/:id/respond", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id);
    const { responses } = req.body;
    
    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ message: "No responses provided" });
    }
    
    // Get the survey
    const [survey] = await db.select()
      .from(surveys)
      .where(eq(surveys.id, surveyId));
      
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }
    
    // Check if user is a recipient
    const [recipient] = await db.select()
      .from(surveyRecipients)
      .where(and(
        eq(surveyRecipients.surveyId, surveyId),
        eq(surveyRecipients.userId, req.user.id)
      ));
      
    if (!recipient) {
      return res.status(403).json({ message: "You are not assigned to this survey" });
    }
    
    // Check if survey is still active
    const now = new Date();
    if (now < new Date(survey.startDate) || now > new Date(survey.endDate)) {
      return res.status(400).json({ message: "Survey is not active" });
    }
    
    // Check if user has already completed the survey
    if (recipient.status === "completed") {
      return res.status(400).json({ message: "You have already completed this survey" });
    }
    
    // Process responses
    for (const response of responses) {
      const { questionId, responseText, responseValue, responseOptions } = response;
      
      await db.insert(surveyResponses)
        .values({
          surveyId,
          questionId,
          // If anonymous, don't store user ID
          userId: survey.isAnonymous ? null : req.user.id,
          responseText,
          responseValue,
          responseOptions
        });
    }
    
    // Mark recipient as completed
    await db.update(surveyRecipients)
      .set({ 
        status: "completed",
        completedAt: new Date()
      })
      .where(and(
        eq(surveyRecipients.surveyId, surveyId),
        eq(surveyRecipients.userId, req.user.id)
      ));
      
    res.status(201).json({ message: "Survey responses submitted successfully" });
  } catch (error) {
    console.error("Error submitting survey responses:", error);
    res.status(500).json({ message: "Failed to submit survey responses" });
  }
});

// Get survey analytics (admin only)
router.get("/:id/analytics", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Get the survey
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    
    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }
    
    // Get recipients statistics
    const recipients = await db.select()
      .from(surveyRecipients)
      .where(eq(surveyRecipients.surveyId, id));
      
    // Get all responses
    const responses = await db.select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, id));
      
    // Get sections and questions
    const sections = await db.select()
      .from(surveySections)
      .where(eq(surveySections.surveyId, id));
      
    const sectionIds = sections.map(s => s.id);
    const questions = await db.select()
      .from(surveyQuestions)
      .where(inArray(surveyQuestions.sectionId, sectionIds));
      
    // Calculate statistics per question
    const questionStats = questions.map(question => {
      const questionResponses = responses.filter(r => r.questionId === question.id);
      
      // Different statistics based on question type
      let stats = {};
      
      if (question.type === "rating") {
        // Calculate average rating
        const values = questionResponses.map(r => r.responseValue).filter(Boolean);
        const average = values.length > 0 
          ? values.reduce((a, b) => a + b, 0) / values.length 
          : 0;
          
        stats = {
          average,
          count: values.length,
          distribution: {}
        };
        
        // Count distribution of ratings
        values.forEach(value => {
          stats.distribution[value] = (stats.distribution[value] || 0) + 1;
        });
      } 
      else if (question.type === "multiple_choice") {
        // Count option selections
        stats = { options: {} };
        
        questionResponses.forEach(response => {
          if (response.responseOptions) {
            const options = response.responseOptions as string[];
            options.forEach(option => {
              stats.options[option] = (stats.options[option] || 0) + 1;
            });
          }
        });
      }
      else if (question.type === "text") {
        // Just count responses for text questions
        stats = {
          responseCount: questionResponses.length
        };
      }
      
      return {
        id: question.id,
        content: question.content,
        type: question.type,
        stats
      };
    });
    
    // Structure the analytics
    const analytics = {
      survey: {
        id: survey.id,
        title: survey.title,
        startDate: survey.startDate,
        endDate: survey.endDate,
        status: survey.status,
        isAnonymous: survey.isAnonymous
      },
      recipientStats: {
        total: recipients.length,
        completed: recipients.filter(r => r.status === "completed").length,
        pending: recipients.filter(r => r.status === "pending").length,
        completionRate: recipients.length > 0 
          ? (recipients.filter(r => r.status === "completed").length / recipients.length) * 100 
          : 0
      },
      sections: sections.map(section => ({
        id: section.id,
        title: section.title,
        questions: questionStats.filter(q => {
          const question = questions.find(que => que.id === q.id);
          return question && question.sectionId === section.id;
        })
      }))
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching survey analytics:", error);
    res.status(500).json({ message: "Failed to fetch survey analytics" });
  }
});

// Get notification count for current user
router.get("/notifications/count", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Count surveys assigned to user that are pending
    const pendingSurveys = await db.select({ count: { count: surveys.id } })
      .from(surveyRecipients)
      .innerJoin(surveys, eq(surveyRecipients.surveyId, surveys.id))
      .where(and(
        eq(surveyRecipients.userId, req.user.id),
        eq(surveyRecipients.status, "pending"),
        eq(surveys.status, "active")
      ));
      
    const count = pendingSurveys[0]?.count || 0;
    
    res.json({ count });
  } catch (error) {
    console.error("Error fetching survey notification count:", error);
    res.status(500).json({ message: "Failed to fetch notification count" });
  }
});

export default router;