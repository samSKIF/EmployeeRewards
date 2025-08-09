import cron from "node-cron";
 import { db } from "../db";
 import { users, accounts } from "@shared/schema";
 import { eq, sql } from "drizzle-orm";
import { awardBirthdayPoints } from '../storage';
import { logger } from "@platform/sdk";

 // Format for date comparison in PostgreSQL
 const formatPostgresDate = (date: Date) => {
   return `${date.getMonth() + 1}-${date.getDate()}`;
 };

 // Schedule birthday rewards job - runs every day at 8:00 AM
export const scheduleBirthdayRewards = () => {
  logger.info("🎂 Scheduling birthday rewards job (daily at 08:00)");

   cron.schedule("0 8 * * *", async () => {
     try {
      logger.info("🎂 Running birthday rewards job...");
       const today = new Date();
       const monthDay = formatPostgresDate(today);

       // Find users whose birthday is today
       const birthdayUsers = await db
         .select()
         .from(users)
         .where(
           sql`EXTRACT(MONTH FROM ${users.birth_date}) = EXTRACT(MONTH FROM CURRENT_DATE) AND 
               EXTRACT(DAY FROM ${users.birth_date}) = EXTRACT(DAY FROM CURRENT_DATE)`
         );

      logger.info(`Found ${birthdayUsers.length} users with birthdays today`);

       // Award points to each user
       for (const user of birthdayUsers) {
         await awardBirthdayPoints(user.id);
       }

      logger.info("🎂 Birthday rewards job completed successfully");
     } catch (error) {
      logger.error("Error in birthday rewards job:", error);
     }
   });

   // For testing purposes, you can manually trigger the job
   // For testing: awardBirthdayPoints(1);
 };
