ALTER TABLE "invoice_items" ADD COLUMN "cgst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "cgst_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "sgst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "sgst_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "igst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "igst_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "amount_paid" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "balance_due" numeric(10, 2) DEFAULT '0.00' NOT NULL;