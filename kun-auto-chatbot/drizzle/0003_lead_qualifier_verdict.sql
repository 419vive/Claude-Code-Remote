ALTER TABLE `conversations` ADD COLUMN `leadQualifierVerdict` json;
--> statement-breakpoint
ALTER TABLE `conversations` ADD COLUMN `leadQualifierAt` timestamp NULL;
