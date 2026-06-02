CREATE TABLE "frame_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"model_number" varchar(100),
	"color_code" varchar(100),
	"size" varchar(50),
	"material" varchar(100),
	"frame_shape" varchar(100),
	"target_demographic" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frame_details_inventory_id_unique" UNIQUE("inventory_id")
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "hsn_code" varchar(20);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "cgst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "sgst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "igst_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "vendor_name" varchar(255);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "rack_location" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "requires_expiry_tracking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "batch_number" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "expiry_date" date;--> statement-breakpoint
ALTER TABLE "frame_details" ADD CONSTRAINT "frame_details_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;