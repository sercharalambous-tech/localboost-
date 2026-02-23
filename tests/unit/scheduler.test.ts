/**
 * Unit tests for the scheduler logic
 */

import { renderTemplate, buildAppointmentVars } from "@/lib/templates";
import { isOptOutMessage } from "@/lib/twilio";

// ── Template rendering ────────────────────────────────────

describe("renderTemplate", () => {
  it("replaces single variable", () => {
    const result = renderTemplate("Hi {customer_name}!", { customer_name: "Stavros" });
    expect(result).toBe("Hi Stavros!");
  });

  it("replaces multiple variables", () => {
    const tpl = "Hi {customer_name}, your appointment at {business_name} is at {appointment_time}.";
    const result = renderTemplate(tpl, {
      customer_name: "Maria",
      business_name: "Lux Nails",
      appointment_time: "14:30",
    });
    expect(result).toBe("Hi Maria, your appointment at Lux Nails is at 14:30.");
  });

  it("replaces all occurrences of the same variable", () => {
    const result = renderTemplate("{customer_name} - {customer_name}", { customer_name: "Nikos" });
    expect(result).toBe("Nikos - Nikos");
  });

  it("leaves unknown variables empty string", () => {
    const result = renderTemplate("Hello {unknown}", {});
    expect(result).toBe("Hello ");
  });

  it("handles empty template", () => {
    expect(renderTemplate("", { customer_name: "Test" })).toBe("");
  });
});

// ── buildAppointmentVars ──────────────────────────────────

describe("buildAppointmentVars", () => {
  it("formats date and time in Cyprus timezone", () => {
    const vars = buildAppointmentVars({
      customerName: "Antonis",
      businessName: "Stavros Barbershop",
      serviceName: "Haircut",
      startAt: new Date("2025-06-15T10:00:00.000Z"),
      timezone: "Asia/Nicosia",
      appointmentId: "apt-test",
    });

    expect(vars.customer_name).toBe("Antonis");
    expect(vars.business_name).toBe("Stavros Barbershop");
    expect(vars.appointment_date).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(vars.appointment_time).toMatch(/\d{2}:\d{2}/);
  });

  it("builds confirm URL from token", () => {
    const vars = buildAppointmentVars({
      customerName: "Test",
      businessName: "Test Biz",
      serviceName: "Service",
      startAt: new Date(),
      timezone: "Asia/Nicosia",
      appointmentId: "apt-1",
      confirmToken: "my-token-123",
    });
    expect(vars.confirm_url).toContain("my-token-123");
  });

  it("builds cancel URL from token", () => {
    const vars = buildAppointmentVars({
      customerName: "Test",
      businessName: "Test Biz",
      serviceName: "Service",
      startAt: new Date(),
      timezone: "Asia/Nicosia",
      appointmentId: "apt-1",
      cancelToken: "cancel-456",
    });
    expect(vars.cancel_url).toContain("cancel-456");
  });

  it("returns undefined review_url when no google link", () => {
    const vars = buildAppointmentVars({
      customerName: "Test",
      businessName: "Test Biz",
      serviceName: "Service",
      startAt: new Date(),
      timezone: "Asia/Nicosia",
      appointmentId: "apt-1",
    });
    expect(vars.review_url).toBeUndefined();
  });
});

// ── SMS Opt-out detection ─────────────────────────────────

describe("isOptOutMessage", () => {
  it("detects STOP", () => { expect(isOptOutMessage("STOP")).toBe(true); });
  it("detects lowercase stop", () => { expect(isOptOutMessage("stop")).toBe(true); });
  it("detects UNSUBSCRIBE", () => { expect(isOptOutMessage("UNSUBSCRIBE")).toBe(true); });
  it("detects CANCEL", () => { expect(isOptOutMessage("CANCEL")).toBe(true); });
  it("does NOT flag normal messages", () => { expect(isOptOutMessage("Hello there!")).toBe(false); });
  it("does NOT flag messages containing STOP as substring", () => {
    // "STOP" as standalone word only
    expect(isOptOutMessage("Please don't stop texting")).toBe(false);
  });
  it("handles whitespace", () => { expect(isOptOutMessage("  STOP  ")).toBe(true); });
});
