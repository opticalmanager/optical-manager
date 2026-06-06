CREATE TYPE "public"."movement_type" AS ENUM('STOCK_IN', 'SOLD', 'ADJUSTMENT', 'RETURN', 'INITIAL');--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"quantity_change" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_number" varchar(100),
	"vendor_party" varchar(255),
	"cost_price_at_time" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_profiles_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_inventory_id_idx" ON "stock_movements" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "stock_movements_shop_id_idx" ON "stock_movements" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "stock_movements_org_id_idx" ON "stock_movements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stock_movements_inv_created_idx" ON "stock_movements" USING btree ("inventory_id","created_at");