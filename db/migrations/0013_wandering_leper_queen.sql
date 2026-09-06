CREATE TYPE "public"."appointment_status" AS ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."demo_request_status" AS ENUM('PENDING', 'CONTACTED', 'DEMO_SCHEDULED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."final_action" AS ENUM('RESTOCK_INVENTORY', 'REPAIR_AT_STORE', 'SEND_TO_VENDOR', 'SCRAP_DAMAGE', 'HOLD_FOR_INSPECTION');--> statement-breakpoint
CREATE TYPE "public"."inspection_reason" AS ENUM('LOOKS_NEW', 'MINOR_WEAR', 'DAMAGED', 'WRONG_PRODUCT', 'MANUFACTURING_DEFECT', 'WARRANTY_CLAIM');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('DRAFT', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."return_type" AS ENUM('SELECTED_PRODUCTS', 'ENTIRE_INVOICE');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('SCHEDULED', 'COMPLETED', 'DRAFT', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('MARKETING', 'UTILITY', 'AUTHENTICATION');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('APPROVED', 'PENDING', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."trigger_event" AS ENUM('BIRTHDAY', 'PURCHASE', 'APPOINTMENT', 'RE_ENGAGEMENT');--> statement-breakpoint
CREATE TYPE "public"."trigger_status" AS ENUM('ACTIVE', 'PAUSED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_config_status" AS ENUM('CONNECTED', 'DISCONNECTED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."email_category" AS ENUM('INVOICE', 'RECEIPT', 'REMINDER', 'WELCOME', 'APPOINTMENT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."email_config_status" AS ENUM('ACTIVE', 'INACTIVE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."email_log_status" AS ENUM('SENT', 'FAILED', 'RATE_LIMITED', 'QUEUED');--> statement-breakpoint
CREATE TYPE "public"."email_priority" AS ENUM('CRITICAL', 'STANDARD', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('GMAIL', 'CUSTOM_SMTP');--> statement-breakpoint
CREATE TYPE "public"."email_trigger_event" AS ENUM('CUSTOMER_CREATED', 'INVOICE_CREATED', 'PAYMENT_RECEIVED', 'APPOINTMENT_BOOKED', 'APPOINTMENT_REMINDER');--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE 'SUSPENDED' BEFORE 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'SUPER_ADMIN' BEFORE 'OWNER';--> statement-breakpoint
CREATE TABLE "appointment_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"form_fields" jsonb DEFAULT '[{"id":"full_name","label":"Full Name","type":"text","enabled":true,"required":true,"icon":"user"},{"id":"phone_number","label":"Phone Number","type":"tel","enabled":true,"required":true,"icon":"phone"},{"id":"time_to_visit","label":"Time to Visit","type":"datetime","enabled":true,"required":true,"icon":"clock"},{"id":"select_branch","label":"Select Branch","type":"select","enabled":true,"required":true,"icon":"map-pin"},{"id":"purpose_of_visit","label":"Purpose of Visit","type":"select","enabled":true,"required":true,"icon":"message-square"},{"id":"additional_notes","label":"Additional Notes","type":"textarea","enabled":false,"required":false,"icon":"file-text"}]'::jsonb NOT NULL,
	"visit_purposes" jsonb DEFAULT '["Eye Test / Vision Check","Contact Lens Consultation","Frame Selection"]'::jsonb NOT NULL,
	"page_title" varchar(255) DEFAULT 'Book Your Appointment' NOT NULL,
	"page_subtitle" text DEFAULT 'Schedule your visit with our experts. We''re here to help you see better.' NOT NULL,
	"primary_color" varchar(20) DEFAULT '#2563EB' NOT NULL,
	"button_text" varchar(100) DEFAULT 'Book Appointment' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_configs_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"visit_time" timestamp with time zone NOT NULL,
	"purpose_of_visit" varchar(255) NOT NULL,
	"additional_notes" text,
	"status" "appointment_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"owner_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"city" varchar(100),
	"status" "demo_request_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"invoice_item_id" uuid NOT NULL,
	"inventory_id" uuid,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity_returned" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"refund_amount" numeric(10, 2) NOT NULL,
	"inspection_reason" "inspection_reason" DEFAULT 'LOOKS_NEW' NOT NULL,
	"final_action" "final_action" DEFAULT 'RESTOCK_INVENTORY' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"return_number" varchar(50) NOT NULL,
	"return_type" "return_type" DEFAULT 'SELECTED_PRODUCTS' NOT NULL,
	"status" "return_status" DEFAULT 'COMPLETED' NOT NULL,
	"total_refund_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"processed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shop_id" uuid,
	"name" varchar(255) NOT NULL,
	"offer_details" text,
	"audience" varchar(255) DEFAULT 'All Customers' NOT NULL,
	"audience_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'SCHEDULED' NOT NULL,
	"template_id" uuid,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"read" integer DEFAULT 0 NOT NULL,
	"replied" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shop_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"event" "trigger_event" NOT NULL,
	"timing_value" integer DEFAULT 1 NOT NULL,
	"timing_unit" varchar(20) DEFAULT 'Day' NOT NULL,
	"timing_direction" varchar(20) DEFAULT 'Before' NOT NULL,
	"trigger_time" varchar(20) DEFAULT '09:00 AM' NOT NULL,
	"template_id" uuid,
	"template_name" varchar(255),
	"status" "trigger_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"phone_number" varchar(30),
	"business_name" varchar(255),
	"status" "whatsapp_config_status" DEFAULT 'CONNECTED' NOT NULL,
	"api_key" text,
	"webhook_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "template_category" DEFAULT 'MARKETING' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"status" "template_status" DEFAULT 'APPROVED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" "email_provider" DEFAULT 'GMAIL' NOT NULL,
	"smtp_host" varchar(255) DEFAULT 'smtp.gmail.com' NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"app_name" varchar(255),
	"encrypted_password" text NOT NULL,
	"sender_name" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"status" "email_config_status" DEFAULT 'INACTIVE' NOT NULL,
	"last_error" text,
	"daily_sent_count" integer DEFAULT 0 NOT NULL,
	"daily_limit" integer DEFAULT 490 NOT NULL,
	"hourly_sent_count" integer DEFAULT 0 NOT NULL,
	"hourly_limit" integer DEFAULT 250 NOT NULL,
	"minute_sent_count" integer DEFAULT 0 NOT NULL,
	"minute_limit" integer DEFAULT 30 NOT NULL,
	"last_minute_reset_at" timestamp with time zone,
	"last_hour_reset_at" timestamp with time zone,
	"last_daily_reset_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_configs_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shop_id" uuid,
	"trigger_id" uuid,
	"template_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"subject" varchar(500) NOT NULL,
	"status" "email_log_status" DEFAULT 'QUEUED' NOT NULL,
	"error_message" text,
	"trigger_event" varchar(50),
	"shop_name" varchar(255),
	"message_id" varchar(255),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"category" "email_category" DEFAULT 'CUSTOM' NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"event" "email_trigger_event" NOT NULL,
	"template_id" uuid,
	"template_name" varchar(255),
	"priority" "email_priority" DEFAULT 'STANDARD' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"description" text,
	"last_triggered_at" timestamp with time zone,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sold_by" varchar(255);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "custom_role_name" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "permissions" jsonb DEFAULT '{"dashboard":true,"inventory":true,"sales":true,"returns":true,"customers":true,"appointments":true,"analytics":true,"reports":true,"settings":true,"support":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "max_shops" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "max_users" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_cycle" varchar(20) DEFAULT 'MONTHLY' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "appointment_configs" ADD CONSTRAINT "appointment_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_return_id_sales_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."sales_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_invoice_item_id_invoice_items_id_fk" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."invoice_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_processed_by_profiles_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_template_id_whatsapp_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_triggers" ADD CONSTRAINT "promotion_triggers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_triggers" ADD CONSTRAINT "promotion_triggers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_triggers" ADD CONSTRAINT "promotion_triggers_template_id_whatsapp_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_configs" ADD CONSTRAINT "email_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_trigger_id_email_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."email_triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_org_id_idx" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointments_shop_id_idx" ON "appointments" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "demo_requests_status_idx" ON "demo_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "demo_requests_email_idx" ON "demo_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "demo_requests_phone_idx" ON "demo_requests" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "sales_return_items_return_id_idx" ON "sales_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "sales_return_items_inv_item_id_idx" ON "sales_return_items" USING btree ("invoice_item_id");--> statement-breakpoint
CREATE INDEX "sales_return_items_inv_id_idx" ON "sales_return_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "sales_returns_shop_id_idx" ON "sales_returns" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "sales_returns_org_id_idx" ON "sales_returns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sales_returns_invoice_id_idx" ON "sales_returns" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "sales_returns_customer_id_idx" ON "sales_returns" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_returns_return_num_idx" ON "sales_returns" USING btree ("return_number");--> statement-breakpoint
CREATE INDEX "promotion_campaigns_org_id_idx" ON "promotion_campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "promotion_triggers_org_id_idx" ON "promotion_triggers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "whatsapp_configs_org_id_idx" ON "whatsapp_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "whatsapp_templates_org_id_idx" ON "whatsapp_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_configs_org_id_idx" ON "email_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_logs_org_id_idx" ON "email_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_logs_sent_at_idx" ON "email_logs" USING btree ("organization_id","sent_at");--> statement-breakpoint
CREATE INDEX "email_logs_shop_id_idx" ON "email_logs" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "email_logs_status_idx" ON "email_logs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "email_templates_org_id_idx" ON "email_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_templates_category_idx" ON "email_templates" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "email_triggers_org_id_idx" ON "email_triggers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_triggers_event_idx" ON "email_triggers" USING btree ("organization_id","event");