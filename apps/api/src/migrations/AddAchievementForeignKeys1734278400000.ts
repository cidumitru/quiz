import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAchievementForeignKeys1734278400000 implements MigrationInterface {
  name = 'AddAchievementForeignKeys1734278400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if User table exists and has the expected structure
    const userTableExists = await queryRunner.hasTable('users');
    if (!userTableExists) {
      throw new Error('User table must exist before adding achievement foreign keys');
    }

    // Clean up orphaned records before adding constraints
    await this.cleanupOrphanedRecords(queryRunner);

    // Add foreign key constraint for user_achievements.userId -> users.id
    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      ADD CONSTRAINT "FK_user_achievements_user_id" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Add foreign key constraint for achievement_events.userId -> users.id  
    await queryRunner.query(`
      ALTER TABLE "achievement_events" 
      ADD CONSTRAINT "FK_achievement_events_user_id" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Add quiz-related foreign key if quiz table exists
    const quizTableExists = await queryRunner.hasTable('quiz');
    if (quizTableExists) {
      // Check if quizId column exists in achievement_events
      const hasQuizId = await queryRunner.hasColumn('achievement_events', 'quizId');
      
      if (!hasQuizId) {
        // Add quizId column if it doesn't exist
        await queryRunner.query(`
          ALTER TABLE "achievement_events" 
          ADD COLUMN "quizId" uuid NULL
        `);
      }

      // Add foreign key constraint for achievement_events.quizId -> quiz.id
      await queryRunner.query(`
        ALTER TABLE "achievement_events" 
        ADD CONSTRAINT "FK_achievement_events_quiz_id" 
        FOREIGN KEY ("quizId") REFERENCES "quiz"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);

      // Add index on quizId for performance
      await queryRunner.query(`
        CREATE INDEX "IDX_achievement_events_quiz_id" 
        ON "achievement_events" ("quizId")
      `);
    }

    // Add additional indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_user_earned" 
      ON "user_achievements" ("userId", "isEarned")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_achievement_earned" 
      ON "user_achievements" ("achievementId", "isEarned")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_achievement_events_user_processed" 
      ON "achievement_events" ("userId", "isProcessed")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_achievement_events_type_occurred" 
      ON "achievement_events" ("eventType", "occurredAt")
    `);

    // Add check constraints for data integrity
    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      ADD CONSTRAINT "CHK_user_achievements_progress" 
      CHECK ("currentProgress" >= 0 AND "currentProgress" <= "targetProgress")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      ADD CONSTRAINT "CHK_user_achievements_target" 
      CHECK ("targetProgress" > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      ADD CONSTRAINT "CHK_user_achievements_earned_date" 
      CHECK (("isEarned" = false AND "earnedAt" IS NULL) OR ("isEarned" = true AND "earnedAt" IS NOT NULL))
    `);

    // Add trigger to update lastUpdated automatically
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_user_achievement_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."lastUpdated" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_user_achievement_timestamp
      BEFORE UPDATE ON "user_achievements"
      FOR EACH ROW EXECUTE FUNCTION update_user_achievement_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_user_achievement_timestamp ON "user_achievements"
    `);
    
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_user_achievement_timestamp()
    `);

    // Drop check constraints
    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      DROP CONSTRAINT IF EXISTS "CHK_user_achievements_earned_date"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      DROP CONSTRAINT IF EXISTS "CHK_user_achievements_target"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      DROP CONSTRAINT IF EXISTS "CHK_user_achievements_progress"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_achievement_events_type_occurred"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_achievement_events_user_processed"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_achievements_achievement_earned"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_achievements_user_earned"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_achievement_events_quiz_id"
    `);

    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "achievement_events" 
      DROP CONSTRAINT IF EXISTS "FK_achievement_events_quiz_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "achievement_events" 
      DROP CONSTRAINT IF EXISTS "FK_achievement_events_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      DROP CONSTRAINT IF EXISTS "FK_user_achievements_user_id"
    `);

    // Optionally remove the quizId column if it was added by this migration
    const hasQuizId = await queryRunner.hasColumn('achievement_events', 'quizId');
    if (hasQuizId) {
      await queryRunner.query(`
        ALTER TABLE "achievement_events" 
        DROP COLUMN "quizId"
      `);
    }
  }

  private async cleanupOrphanedRecords(queryRunner: QueryRunner): Promise<void> {
    // Remove user_achievements records for non-existent users
    const orphanedUserAchievements = await queryRunner.query(`
      DELETE FROM "user_achievements" 
      WHERE "userId" NOT IN (SELECT "id" FROM "users")
      RETURNING COUNT(*)
    `);

    if (orphanedUserAchievements[0]?.count > 0) {
      console.log(`Cleaned up ${orphanedUserAchievements[0].count} orphaned user_achievements records`);
    }

    // Remove achievement_events records for non-existent users
    const orphanedAchievementEvents = await queryRunner.query(`
      DELETE FROM "achievement_events" 
      WHERE "userId" NOT IN (SELECT "id" FROM "users")
      RETURNING COUNT(*)
    `);

    if (orphanedAchievementEvents[0]?.count > 0) {
      console.log(`Cleaned up ${orphanedAchievementEvents[0].count} orphaned achievement_events records`);
    }

    // Fix any invalid progress values
    const invalidProgress = await queryRunner.query(`
      UPDATE "user_achievements" 
      SET "currentProgress" = "targetProgress"
      WHERE "currentProgress" > "targetProgress"
      RETURNING COUNT(*)
    `);

    if (invalidProgress[0]?.count > 0) {
      console.log(`Fixed ${invalidProgress[0].count} invalid progress values`);
    }

    // Fix earned achievements without earnedAt date
    const missingEarnedAt = await queryRunner.query(`
      UPDATE "user_achievements" 
      SET "earnedAt" = "updatedAt"
      WHERE "isEarned" = true AND "earnedAt" IS NULL
      RETURNING COUNT(*)
    `);

    if (missingEarnedAt[0]?.count > 0) {
      console.log(`Fixed ${missingEarnedAt[0].count} earned achievements without earnedAt date`);
    }

    // Fix unearned achievements with earnedAt date
    const invalidEarnedAt = await queryRunner.query(`
      UPDATE "user_achievements" 
      SET "earnedAt" = NULL
      WHERE "isEarned" = false AND "earnedAt" IS NOT NULL
      RETURNING COUNT(*)
    `);

    if (invalidEarnedAt[0]?.count > 0) {
      console.log(`Fixed ${invalidEarnedAt[0].count} unearned achievements with earnedAt date`);
    }
  }
}