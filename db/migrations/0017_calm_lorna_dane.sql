ALTER TYPE "public"."inventory_category" ADD VALUE 'SUNGLASSES';--> statement-breakpoint
CREATE TABLE "sunglass_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"model_number" varchar(100),
	"frame_shape" varchar(100),
	"frame_color" varchar(100),
	"lens_color" varchar(100),
	"size" varchar(50),
	"gender" varchar(50),
	"is_polarized" boolean DEFAULT false,
	"uv_protection" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sunglass_details_inventory_id_unique" UNIQUE("inventory_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_dispatch_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shop_id" uuid,
	"recipient_phone" varchar(30) NOT NULL,
	"recipient_name" varchar(255),
	"message_text" text NOT NULL,
	"media_url" text,
	"media_type" varchar(50) DEFAULT 'TEXT' NOT NULL,
	"template_key" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "gstin" varchar(20);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "allow_negative_stock" boolean;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "print_name" varchar(100);--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "is_stockable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "default_sale_discount" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "default_purchase_discount" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "allow_negative_stock" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "category" varchar(50) DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "credit_period_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "sunglass_details" ADD CONSTRAINT "sunglass_details_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dispatch_queue" ADD CONSTRAINT "whatsapp_dispatch_queue_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dispatch_queue" ADD CONSTRAINT "whatsapp_dispatch_queue_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_queue_org_status_idx" ON "whatsapp_dispatch_queue" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "whatsapp_queue_shop_status_idx" ON "whatsapp_dispatch_queue" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "whatsapp_queue_created_idx" ON "whatsapp_dispatch_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customers_gstin_idx" ON "customers" USING btree ("gstin");--> statement-breakpoint
CREATE INDEX "vendors_org_category_idx" ON "vendors" USING btree ("organization_id","category");