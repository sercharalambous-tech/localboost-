/**
 * Integration tests for message sending (mocked providers)
 * Run with: npm test
 */

// Mock environment
process.env.TEST_MODE = "true";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.TWILIO_ACCOUNT_SID = "ACtest";
process.env.TWILIO_AUTH_TOKEN = "test";
process.env.TWILIO_FROM_NUMBER = "+15005550006";
process.env.POSTMARK_SERVER_TOKEN = "test";
process.env.POSTMARK_FROM_EMAIL = "test@test.com";
process.env.POSTMARK_FROM_NAME = "Test";

import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/templates";

describe("sendSms (TEST_MODE)", () => {
  it("returns test message ID without calling Twilio", async () => {
    const id = await sendSms({ to: "+35799000001", body: "Test message" });
    expect(id).toMatch(/^test_/);
  });

  it("returns unique IDs per call", async () => {
    const id1 = await sendSms({ to: "+35799000001", body: "Msg 1" });
    const id2 = await sendSms({ to: "+35799000001", body: "Msg 2" });
    expect(id1).not.toBe(id2);
  });
});

describe("sendEmail (TEST_MODE)", () => {
  it("returns test message ID without calling Postmark", async () => {
    const id = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      htmlBody: "<p>Test body</p>",
    });
    expect(id).toMatch(/^test_/);
  });
});

describe("Full reminder flow (unit)", () => {
  it("renders SMS reminder with all required vars", () => {
    const template = "Hi {customer_name}, reminder for {business_name} on {appointment_date} at {appointment_time}. Confirm: {confirm_url}";
    const vars = {
      customer_name: "Stavros",
      business_name: "Barbershop",
      appointment_date: "15/06/2025",
      appointment_time: "10:00",
      confirm_url: "https://localboost.app/api/appointments/confirm/abc123",
    };
    const rendered = renderTemplate(template, vars);
    expect(rendered).toContain("Stavros");
    expect(rendered).toContain("Barbershop");
    expect(rendered).toContain("abc123");
  });

  it("renders feedback SMS correctly", () => {
    const template = "How was your visit at {business_name}? Rate 1-5: {feedback_url}";
    const vars = {
      business_name: "Lux Nails",
      feedback_url: "https://localboost.app/feedback/xyz789",
    };
    const rendered = renderTemplate(template, vars);
    expect(rendered).toContain("Lux Nails");
    expect(rendered).toContain("xyz789");
  });
});
