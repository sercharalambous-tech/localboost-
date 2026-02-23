/**
 * Template variable substitution engine.
 * Replaces {variable_name} placeholders in template bodies.
 */

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export interface TemplateVars {
  customer_name?: string;
  business_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  service_name?: string;
  confirm_url?: string;
  cancel_url?: string;
  review_url?: string;
  feedback_url?: string;
  unsubscribe_url?: string;
}

/**
 * Substitute all {variable} placeholders in a template string.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value ?? "");
  }
  return result;
}

/**
 * Build standard template variables for a given appointment.
 */
export function buildAppointmentVars({
  customerName,
  businessName,
  serviceName,
  startAt,
  timezone,
  appointmentId,
  confirmToken,
  cancelToken,
  feedbackToken,
  googleReviewUrl,
  emailUnsubscribeToken,
}: {
  customerName: string;
  businessName: string;
  serviceName: string;
  startAt: Date;
  timezone: string;
  appointmentId: string;
  confirmToken?: string;
  cancelToken?: string;
  feedbackToken?: string;
  googleReviewUrl?: string | null;
  emailUnsubscribeToken?: string;
}): TemplateVars {
  const zoned = toZonedTime(startAt, timezone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localboost.app";

  return {
    customer_name: customerName,
    business_name: businessName,
    service_name: serviceName,
    appointment_date: format(zoned, "dd/MM/yyyy"),
    appointment_time: format(zoned, "HH:mm"),
    confirm_url: confirmToken
      ? `${appUrl}/api/appointments/confirm/${confirmToken}`
      : undefined,
    cancel_url: cancelToken
      ? `${appUrl}/api/appointments/cancel/${cancelToken}`
      : undefined,
    feedback_url: feedbackToken
      ? `${appUrl}/feedback/${feedbackToken}`
      : undefined,
    review_url: googleReviewUrl ?? undefined,
    unsubscribe_url: emailUnsubscribeToken
      ? `${appUrl}/api/webhooks/email-unsubscribe/${emailUnsubscribeToken}`
      : undefined,
  };
}
