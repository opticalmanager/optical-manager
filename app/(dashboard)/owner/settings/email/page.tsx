import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { getEmailConfig, getEmailSystemConfig, getEmailUsageStats } from "@/services/email.service";
import { db } from "@/lib/drizzle";
import { emailTemplates, emailTriggers, emailLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { EmailPortalClient } from "@/components/owner/email/EmailPortalClient";

export default async function EmailPortalPage() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const orgId = user.organizationId;

  // Resilient data fetching with fallbacks
  let organization: any = null;
  let emailConfig: any = null;
  let systemStatus: any = { isConfigured: false, status: "INACTIVE" };
  let templates: any[] = [];
  let triggers: any[] = [];
  let usageStats: any[] = [];
  let shopsList: any[] = [];
  let recentLogs: any[] = [];

  try {
    const results = await Promise.allSettled([
      getOrganizationById(orgId),
      getEmailConfig(orgId),
      getEmailSystemConfig(orgId),
      db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.organizationId, orgId))
        .orderBy(desc(emailTemplates.createdAt)),
      db
        .select()
        .from(emailTriggers)
        .where(eq(emailTriggers.organizationId, orgId))
        .orderBy(desc(emailTriggers.createdAt)),
      getEmailUsageStats(orgId),
      getShopsByOrganization(orgId),
      db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.organizationId, orgId))
        .orderBy(desc(emailLogs.sentAt))
        .limit(100),
    ]);

    if (results[0].status === "fulfilled") organization = results[0].value;
    if (results[1].status === "fulfilled") emailConfig = results[1].value;
    if (results[2].status === "fulfilled") systemStatus = results[2].value;
    if (results[3].status === "fulfilled") templates = results[3].value || [];
    if (results[4].status === "fulfilled") triggers = results[4].value || [];
    if (results[5].status === "fulfilled") usageStats = results[5].value || [];
    if (results[6].status === "fulfilled") shopsList = results[6].value || [];
    if (results[7].status === "fulfilled") recentLogs = results[7].value || [];
  } catch (error) {
    console.error("[EmailPortalPage] Fetching error:", error);
  }

  return (
    <EmailPortalClient
      organization={organization}
      emailConfig={emailConfig ? {
        id: emailConfig.id,
        emailAddress: emailConfig.emailAddress,
        senderName: emailConfig.senderName,
        status: emailConfig.status,
        isVerified: emailConfig.isVerified,
        dailySentCount: emailConfig.dailySentCount,
        dailyLimit: emailConfig.dailyLimit,
        hourlySentCount: emailConfig.hourlySentCount,
        hourlyLimit: emailConfig.hourlyLimit,
        lastSentAt: emailConfig.lastSentAt ? new Date(emailConfig.lastSentAt).toISOString() : null,
      } : null}
      systemStatus={systemStatus}
      templates={(templates || []).map(t => ({
        ...t,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
      }))}
      triggers={(triggers || []).map(tr => ({
        ...tr,
        lastTriggeredAt: tr.lastTriggeredAt ? new Date(tr.lastTriggeredAt).toISOString() : null,
        createdAt: tr.createdAt ? new Date(tr.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: tr.updatedAt ? new Date(tr.updatedAt).toISOString() : new Date().toISOString(),
      }))}
      usageStats={usageStats || []}
      shops={shopsList || []}
      logs={(recentLogs || []).map(l => ({
        ...l,
        sentAt: l.sentAt ? new Date(l.sentAt).toISOString() : new Date().toISOString(),
      }))}
    />
  );
}
