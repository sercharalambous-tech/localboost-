import type {
  User,
  Business,
  Location,
  Customer,
  Appointment,
  AutomationRule,
  MessageTemplate,
  MessageJob,
  Feedback,
  Billing,
  AuditLog,
  AppointmentStatus,
  MessageChannel,
  AutomationRuleType,
  BillingPlan,
  BillingStatus,
  UserRole,
  TemplateLanguage,
} from "@prisma/client";

// ── Re-exports for convenience ───────────────────────────
export type {
  User, Business, Location, Customer, Appointment,
  AutomationRule, MessageTemplate, MessageJob, Feedback,
  Billing, AuditLog, AppointmentStatus, MessageChannel,
  AutomationRuleType, BillingPlan, BillingStatus, UserRole,
  TemplateLanguage,
};

// ── Extended / joined types ──────────────────────────────
export type AppointmentWithCustomer = Appointment & {
  customer: Pick<Customer, "id" | "fullName" | "phone" | "email">;
  location: Pick<Location, "id" | "name"> | null;
};

export type CustomerWithStats = Customer & {
  _count: { appointments: number };
};

export type BusinessWithBilling = Business & {
  billing: Billing | null;
  locations: Location[];
};

export type DashboardStats = {
  totalAppointments: number;
  confirmedRate: number;   // percentage
  noShowRate: number;      // percentage
  completedCount: number;
  reviewRequestsSent: number;
  avgRating: number | null;
  feedbackCount: number;
  messagesUsed: number;
  messageLimit: number;
};

// ── API response shape ────────────────────────────────────
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Form input types ──────────────────────────────────────
export interface CreateAppointmentInput {
  customerId: string;
  locationId?: string;
  serviceName: string;
  startAt: string; // ISO string
  endAt?: string;
  notes?: string;
}

export interface CreateCustomerInput {
  fullName: string;
  phone?: string;
  email?: string;
  consentSms: boolean;
  consentEmail: boolean;
  consentSource: string;
}

export interface UpdateBusinessInput {
  name?: string;
  industry?: string;
  timezone?: string;
  googleReviewUrl?: string;
}

export interface CreateTemplateInput {
  channel: MessageChannel;
  language: TemplateLanguage;
  name: string;
  subject?: string;
  body: string;
}

// ── Nav item ─────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}
