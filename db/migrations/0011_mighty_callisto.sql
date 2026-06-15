ALTER TABLE "customers" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "pincode" varchar(20);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "is_rescheduled" boolean DEFAULT false NOT NULL;