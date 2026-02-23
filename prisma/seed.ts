/**
 * LocalBoost Seed Script
 * Creates a demo business with sample data for testing.
 * Run: npm run db:seed
 */

import { PrismaClient, UserRole, AppointmentStatus, MessageChannel, TemplateLanguage, AutomationRuleType, BillingPlan, BillingStatus } from "@prisma/client";
import { addDays, addHours, subHours } from "date-fns";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding LocalBoost database...");

  // ── Operator/Admin User ──────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@localboost.app" },
    update: {},
    create: {
      id: randomUUID(),
      supabaseId: "seed-admin-supabase-id",
      name: "LocalBoost Admin",
      email: "admin@localboost.app",
      role: UserRole.ADMIN,
    },
  });

  // ── Demo Business Owner ──────────────────────────────
  const ownerUser = await prisma.user.upsert({
    where: { email: "demo@localboost.app" },
    update: {},
    create: {
      id: randomUUID(),
      supabaseId: "seed-owner-supabase-id",
      name: "Demos Stavrou",
      email: "demo@localboost.app",
      role: UserRole.OWNER,
    },
  });

  // ── Demo Business ────────────────────────────────────
  const business = await prisma.business.upsert({
    where: { id: "seed-business-id" },
    update: {},
    create: {
      id: "seed-business-id",
      name: "Stavrou Barbershop",
      industry: "Barber",
      timezone: "Asia/Nicosia",
      ownerUserId: ownerUser.id,
      googleReviewUrl: "https://g.page/r/demo-review-link/review",
      onboardingCompleted: true,
    },
  });

  // ── Location ─────────────────────────────────────────
  const location = await prisma.location.upsert({
    where: { id: "seed-location-id" },
    update: {},
    create: {
      id: "seed-location-id",
      businessId: business.id,
      name: "Main Branch – Nicosia",
      address: "15 Ledra Street, Nicosia 1011",
      phone: "+35722000001",
    },
  });

  // ── Billing (active Starter) ─────────────────────────
  await prisma.billing.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      plan: BillingPlan.PRO,
      status: BillingStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 25),
      messagesUsedThisMonth: 47,
      usagePeriodStart: new Date(new Date().setDate(1)),
    },
  });

  // ── Message Templates (EN + EL) ───────────────────────
  const templateData = [
    // Reminder 24h – SMS – EL
    {
      id: "tpl-sms-el-24h",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EL,
      name: "Υπενθύμιση 24ώρες",
      body: "Γεια {customer_name}! Υπενθύμιση για ραντεβού στο {business_name} στις {appointment_date} {appointment_time}. Επιβεβαίωση: {confirm_url} | Ακύρωση: {cancel_url} | STOP για διακοπή.",
      isDefault: true,
    },
    // Reminder 24h – SMS – EN
    {
      id: "tpl-sms-en-24h",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EN,
      name: "Reminder 24h",
      body: "Hi {customer_name}! Reminder for your appointment at {business_name} on {appointment_date} at {appointment_time}. Confirm: {confirm_url} | Cancel: {cancel_url} | Reply STOP to opt out.",
      isDefault: true,
    },
    // Reminder 2h – SMS – EL
    {
      id: "tpl-sms-el-2h",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EL,
      name: "Υπενθύμιση 2ώρες",
      body: "Υπενθύμιση: Ραντεβού στο {business_name} σε 2 ώρες ({appointment_time}). Επιβεβαίωση: {confirm_url} | STOP για διακοπή.",
      isDefault: true,
    },
    // Reminder 2h – SMS – EN
    {
      id: "tpl-sms-en-2h",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EN,
      name: "Reminder 2h",
      body: "Reminder: Your appointment at {business_name} is in 2 hours ({appointment_time}). Confirm: {confirm_url} | Reply STOP to opt out.",
      isDefault: true,
    },
    // Feedback – SMS – EL
    {
      id: "tpl-sms-el-feedback",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EL,
      name: "Αίτημα Αξιολόγησης",
      body: "Γεια {customer_name}! Πώς πήγε η επίσκεψή σου στο {business_name}; Δώσε βαθμολογία 1-5 εδώ: {feedback_url} STOP για διακοπή.",
      isDefault: true,
    },
    // Feedback – SMS – EN
    {
      id: "tpl-sms-en-feedback",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EN,
      name: "Feedback Request",
      body: "Hi {customer_name}! How was your visit at {business_name}? Rate us 1-5 here: {feedback_url} Reply STOP to opt out.",
      isDefault: true,
    },
    // Review – SMS – EL
    {
      id: "tpl-sms-el-review",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EL,
      name: "Αίτημα Google Review",
      body: "Χαρήκαμε που ήσουν μαζί μας! Αν έχεις λεπτό, θα εκτιμούσαμε πολύ ένα Google review: {review_url} Ευχαριστούμε! STOP για διακοπή.",
      isDefault: true,
    },
    // Review – SMS – EN
    {
      id: "tpl-sms-en-review",
      businessId: business.id,
      channel: MessageChannel.SMS,
      language: TemplateLanguage.EN,
      name: "Google Review Request",
      body: "Thanks for visiting {business_name}! We'd love your Google review: {review_url} Thank you! Reply STOP to opt out.",
      isDefault: true,
    },
    // Reminder 24h – Email – EN
    {
      id: "tpl-email-en-24h",
      businessId: business.id,
      channel: MessageChannel.EMAIL,
      language: TemplateLanguage.EN,
      name: "Email Reminder 24h",
      subject: "Your appointment tomorrow at {business_name}",
      body: `<p>Hi {customer_name},</p>
<p>This is a friendly reminder that you have an appointment at <strong>{business_name}</strong> tomorrow:</p>
<ul>
  <li><strong>Date:</strong> {appointment_date}</li>
  <li><strong>Time:</strong> {appointment_time}</li>
  <li><strong>Service:</strong> {service_name}</li>
</ul>
<p>
  <a href="{confirm_url}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-right:8px">✅ Confirm</a>
  <a href="{cancel_url}" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">❌ Cancel</a>
</p>
<p style="font-size:12px;color:#6b7280;margin-top:24px">
  <a href="{unsubscribe_url}">Unsubscribe</a> from appointment reminders.
</p>`,
      isDefault: true,
    },
    // Feedback – Email – EN
    {
      id: "tpl-email-en-feedback",
      businessId: business.id,
      channel: MessageChannel.EMAIL,
      language: TemplateLanguage.EN,
      name: "Email Feedback Request",
      subject: "How was your visit at {business_name}?",
      body: `<p>Hi {customer_name},</p>
<p>Thank you for visiting <strong>{business_name}</strong>! We'd love to hear your feedback.</p>
<p>Please rate your experience (1–5):</p>
<p>
  <a href="{feedback_url}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">⭐ Leave Feedback</a>
</p>
<p style="font-size:12px;color:#6b7280;margin-top:24px">
  <a href="{unsubscribe_url}">Unsubscribe</a>
</p>`,
      isDefault: true,
    },
  ];

  for (const tmpl of templateData) {
    await prisma.messageTemplate.upsert({
      where: { id: tmpl.id },
      update: {},
      create: tmpl as any,
    });
  }

  // ── Default Automation Rules ──────────────────────────
  const rulesData = [
    { id: "rule-24h", type: AutomationRuleType.REMINDER_24H, enabled: true, channel: MessageChannel.BOTH, delayMinutes: -1440 },
    { id: "rule-2h", type: AutomationRuleType.REMINDER_2H, enabled: true, channel: MessageChannel.SMS, delayMinutes: -120 },
    { id: "rule-feedback", type: AutomationRuleType.FEEDBACK_1H, enabled: true, channel: MessageChannel.BOTH, delayMinutes: 60 },
    { id: "rule-review", type: AutomationRuleType.REVIEW_FOLLOWUP_48H, enabled: true, channel: MessageChannel.BOTH, delayMinutes: 2880 },
  ];

  for (const rule of rulesData) {
    await prisma.automationRule.upsert({
      where: { id: rule.id },
      update: {},
      create: { ...rule, businessId: business.id },
    });
  }

  // ── Sample Customers ─────────────────────────────────
  const customers = [
    { id: "cust-1", fullName: "Αντώνης Χριστοδούλου", phone: "+35799000001", email: "antonis@example.com", consentSms: true, consentEmail: true },
    { id: "cust-2", fullName: "Maria Petrou", phone: "+35799000002", email: "maria@example.com", consentSms: true, consentEmail: true },
    { id: "cust-3", fullName: "Γιώργος Νεοφύτου", phone: "+35799000003", email: "giorgos@example.com", consentSms: true, consentEmail: false },
    { id: "cust-4", fullName: "Elena Constantinou", phone: "+35799000004", email: "elena@example.com", consentSms: false, consentEmail: true },
    { id: "cust-5", fullName: "Nikos Pavlou", phone: "+35799000005", email: null, consentSms: true, consentEmail: false },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        ...c,
        businessId: business.id,
        consentSource: "manual_import",
        consentTimestamp: new Date(),
      } as any,
    });
  }

  // ── Sample Appointments ───────────────────────────────
  const now = new Date();
  const appointments = [
    { id: "apt-1", customerId: "cust-1", serviceName: "Haircut + Beard", startAt: addDays(now, 1), status: AppointmentStatus.SCHEDULED },
    { id: "apt-2", customerId: "cust-2", serviceName: "Haircut", startAt: addDays(now, 1), status: AppointmentStatus.CONFIRMED },
    { id: "apt-3", customerId: "cust-3", serviceName: "Beard Trim", startAt: addHours(now, 3), status: AppointmentStatus.SCHEDULED },
    { id: "apt-4", customerId: "cust-4", serviceName: "Haircut", startAt: subHours(now, 2), status: AppointmentStatus.COMPLETED },
    { id: "apt-5", customerId: "cust-5", serviceName: "Haircut + Beard", startAt: subHours(now, 5), status: AppointmentStatus.NO_SHOW },
    { id: "apt-6", customerId: "cust-1", serviceName: "Haircut", startAt: addDays(now, 3), status: AppointmentStatus.SCHEDULED },
  ];

  for (const apt of appointments) {
    await prisma.appointment.upsert({
      where: { id: apt.id },
      update: {},
      create: {
        ...apt,
        businessId: business.id,
        locationId: location.id,
        endAt: addHours(apt.startAt, 1),
        confirmToken: randomUUID(),
        cancelToken: randomUUID(),
      } as any,
    });
  }

  // ── Sample Feedback ───────────────────────────────────
  await prisma.feedback.upsert({
    where: { id: "feedback-1" },
    update: {},
    create: {
      id: "feedback-1",
      businessId: business.id,
      appointmentId: "apt-4",
      customerId: "cust-4",
      rating: 5,
      comment: "Excellent service as always!",
      token: randomUUID(),
      submittedAt: subHours(now, 1),
    },
  });

  console.log("✅ Seed complete!");
  console.log(`   Admin user: ${adminUser.email}`);
  console.log(`   Demo owner: ${ownerUser.email}`);
  console.log(`   Business:   ${business.name}`);
  console.log(`   Customers:  ${customers.length}`);
  console.log(`   Appointments: ${appointments.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
