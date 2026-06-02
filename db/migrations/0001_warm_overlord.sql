CREATE TYPE "public"."blood_group" AS ENUM('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."prescription_type" AS ENUM('DISTANCE', 'NEAR');--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"inventory_id" uuid,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "registration_id" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "blood_group" "blood_group";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "referred_by" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "chief_complaint" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "family_history" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "systemic_illness" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "allergies" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "special_instructions" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "prescription_type" "prescription_type" DEFAULT 'DISTANCE' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "right_nv" varchar(50);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "left_nv" varchar(50);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "pd_right" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "pd_left" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "doctor_name" varchar(255);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "party_name" varchar(255);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "frame_name" varchar(255);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "estimated_delivery" date;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "special_instructions" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_registration_id_unique" UNIQUE("registration_id");