CREATE TABLE "order_edit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"user_name" varchar(255) NOT NULL,
	"user_role" varchar(50) NOT NULL,
	"summary" text NOT NULL,
	"snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "permissions" SET DEFAULT '{"dashboard":true,"inventory":true,"sales":true,"returns":true,"customers":true,"appointments":true,"analytics":true,"reports":true,"settings":true,"support":true,"edit_orders":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "order_edit_history" ADD CONSTRAINT "order_edit_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_edit_history" ADD CONSTRAINT "order_edit_history_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_edit_history" ADD CONSTRAINT "order_edit_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_edit_history" ADD CONSTRAINT "order_edit_history_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_edit_history_order_id_idx" ON "order_edit_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_edit_history_shop_id_idx" ON "order_edit_history" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "order_edit_history_org_id_idx" ON "order_edit_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "order_edit_history_created_at_idx" ON "order_edit_history" USING btree ("created_at");