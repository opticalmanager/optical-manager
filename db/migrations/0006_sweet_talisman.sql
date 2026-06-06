CREATE TABLE "accessory_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"type" varchar(100),
	"size_volume" varchar(100),
	"color_pattern" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessory_details_inventory_id_unique" UNIQUE("inventory_id")
);
--> statement-breakpoint
CREATE TABLE "contact_lens_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"modality" varchar(100),
	"box_quantity" integer,
	"base_curve" varchar(50),
	"diameter" varchar(50),
	"color" varchar(100),
	"sphere" varchar(50),
	"cylinder" varchar(50),
	"axis" varchar(50),
	"add_power" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_lens_details_inventory_id_unique" UNIQUE("inventory_id")
);
--> statement-breakpoint
ALTER TABLE "accessory_details" ADD CONSTRAINT "accessory_details_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_lens_details" ADD CONSTRAINT "contact_lens_details_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;