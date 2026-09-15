CREATE TYPE "public"."purchase_status" AS ENUM('DRAFT', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "customer_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance_before" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"balance_after" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"reference_number" varchar(100),
	"notes" text,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"hsn_code" varchar(20),
	"cgst_percent" numeric(5, 2) DEFAULT '6.00' NOT NULL,
	"sgst_percent" numeric(5, 2) DEFAULT '6.00' NOT NULL,
	"igst_percent" numeric(5, 2) DEFAULT '12.00' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"inventory_id" uuid,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"serial_number" integer NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_code" varchar(100),
	"category" varchar(50),
	"details" text,
	"unit_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"base_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"hsn_code" varchar(20),
	"gst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"cgst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"cgst_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"sgst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"sgst_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"igst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"igst_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"purchase_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"total_purchase_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"retail_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid,
	"vendor_name" varchar(255),
	"purchase_number" varchar(100) NOT NULL,
	"purchase_date" date NOT NULL,
	"status" "purchase_status" DEFAULT 'DRAFT' NOT NULL,
	"tax_rule" varchar(20) DEFAULT 'EXCLUDE' NOT NULL,
	"tax_type" varchar(50) DEFAULT 'SGST_CGST' NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"total_unit_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_base_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_gst_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_purchase" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"round_off" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_net_purchase" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(20),
	"email" varchar(255),
	"gstin" varchar(20),
	"pan_number" varchar(20),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "category" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "permissions" SET DEFAULT '{"dashboard":true,"inventory":true,"sales":true,"returns":true,"purchases":true,"customers":true,"appointments":true,"analytics":true,"reports":true,"settings":true,"support":true,"edit_orders":false,"delete_orders":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "store_credit" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "product_name" varchar(255);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "product_code" varchar(100);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "credit_applied" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "cadd_right" varchar(50);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "cadd_left" varchar(50);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "rx_number" varchar(50);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "rx_category" varchar(50) DEFAULT 'SPECTACLES' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "lens_type" varchar(100);--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN "refund_method" varchar(50) DEFAULT 'CASH' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN "credit_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_ledger" ADD CONSTRAINT "customer_credit_ledger_performed_by_profiles_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_cust_id_idx" ON "customer_credit_ledger" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_shop_id_idx" ON "customer_credit_ledger" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_org_id_idx" ON "customer_credit_ledger" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_credit_ledger_created_at_idx" ON "customer_credit_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_org_code_idx" ON "product_categories" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "product_categories_org_active_idx" ON "product_categories" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "purchase_order_items_po_id_idx" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_inventory_id_idx" ON "purchase_order_items" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_shop_id_idx" ON "purchase_order_items" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_shop_id_idx" ON "purchase_orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_org_id_idx" ON "purchase_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_vendor_id_idx" ON "purchase_orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "purchase_orders_date_idx" ON "purchase_orders" USING btree ("shop_id","purchase_date");--> statement-breakpoint
CREATE INDEX "purchase_orders_number_idx" ON "purchase_orders" USING btree ("organization_id","purchase_number");--> statement-breakpoint
CREATE INDEX "vendors_shop_id_idx" ON "vendors" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "vendors_org_id_idx" ON "vendors" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_org_name_idx" ON "vendors" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "vendors_org_gstin_idx" ON "vendors" USING btree ("organization_id","gstin");--> statement-breakpoint
CREATE INDEX "customers_store_credit_idx" ON "customers" USING btree ("store_credit");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_shop_product_code_idx" ON "inventory" USING btree ("shop_id","product_code");--> statement-breakpoint
CREATE INDEX "inventory_product_code_idx" ON "inventory" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "prescriptions_rx_number_idx" ON "prescriptions" USING btree ("rx_number");