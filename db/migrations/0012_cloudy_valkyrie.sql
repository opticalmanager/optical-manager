ALTER TABLE "shops" ADD COLUMN "gstin" varchar(50);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "cin" varchar(50);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "msme_udyam" varchar(100);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "bank_name" varchar(255);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "bank_branch" varchar(255);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "bank_account_number" varchar(50);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "bank_ifsc" varchar(20);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;