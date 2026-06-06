CREATE TABLE "lens_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"design" varchar(100),
	"refractive_index" varchar(50),
	"material" varchar(100),
	"blank_diameter" integer,
	"stock_power" varchar(100),
	"is_uncoated" boolean DEFAULT false NOT NULL,
	"is_anti_reflective" boolean DEFAULT false NOT NULL,
	"is_blue_control" boolean DEFAULT false NOT NULL,
	"is_tinted" boolean DEFAULT false NOT NULL,
	"is_polarized" boolean DEFAULT false NOT NULL,
	"is_hard_coat" boolean DEFAULT false NOT NULL,
	"is_photochromic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lens_details_inventory_id_unique" UNIQUE("inventory_id")
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "purchase_invoice_no" varchar(100);--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "inward_date" date;--> statement-breakpoint
ALTER TABLE "lens_details" ADD CONSTRAINT "lens_details_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;