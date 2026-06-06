CREATE INDEX "customers_shop_id_idx" ON "customers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "customers_org_id_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "inventory_shop_id_idx" ON "inventory" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "inventory_org_id_idx" ON "inventory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_sku_idx" ON "inventory" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inventory_shop_active_idx" ON "inventory" USING btree ("shop_id","is_active");--> statement-breakpoint
CREATE INDEX "invoices_shop_id_idx" ON "invoices" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "invoices_org_id_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "prescriptions_shop_id_idx" ON "prescriptions" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "prescriptions_org_id_idx" ON "prescriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prescriptions_customer_id_idx" ON "prescriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "profiles_shop_id_idx" ON "profiles" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "profiles_org_id_idx" ON "profiles" USING btree ("organization_id");