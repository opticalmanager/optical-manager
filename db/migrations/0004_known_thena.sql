ALTER TABLE "customers" DROP CONSTRAINT "customers_registration_id_unique";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_invoice_number_unique";--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "discount_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_reg_id_unique" ON "customers" USING btree ("organization_id","registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_invoice_num_unique" ON "invoices" USING btree ("organization_id","invoice_number");