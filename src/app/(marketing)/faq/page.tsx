import type { Metadata } from "next";
export const metadata: Metadata = { title: "FAQ" };

const faqs = [
  { q: "Do I need to install any software?", a: "No. LocalBoost is a web app that runs in your browser. There is nothing to install. You can even use it on your phone." },
  { q: "How does the SMS reminder work?", a: "When you create an appointment, LocalBoost automatically schedules an SMS to be sent to your customer 24 hours and (optionally) 2 hours before their appointment. The message includes a Confirm and a Cancel link." },
  { q: "What happens when a customer clicks Cancel?", a: "The appointment is automatically updated to 'Cancelled' status in your dashboard, and all pending reminder messages for that appointment are cancelled. You are not charged for any unsent messages." },
  { q: "How does the Google Review automation work?", a: "After you mark an appointment as 'Completed', LocalBoost sends the customer a feedback request (1–5 stars). If they rate you 4 or 5 stars, a follow-up message is sent with a direct link to leave a Google Review. If they rate 3 stars or below, their feedback is captured privately and you receive a notification — the customer is NOT sent to a public platform." },
  { q: "Can I use LocalBoost in Greek?", a: "Yes! LocalBoost includes default message templates in both English and Greek (Cyprus-friendly). You can customise any template from your dashboard." },
  { q: "How do customers opt out of messages?", a: "For SMS: customers simply reply STOP to any message. LocalBoost automatically processes the opt-out and no further messages are sent. For email: every message includes an unsubscribe link. Both actions are logged for compliance." },
  { q: "Is LocalBoost GDPR compliant?", a: "LocalBoost is built with privacy-by-design principles. It stores consent timestamps and sources, processes opt-outs automatically, supports customer data deletion, and maintains an audit log. Please note that as the business owner you are the data controller; LocalBoost is the processor. Review our Privacy Policy for full details." },
  { q: "Can I import my existing customers?", a: "Yes. You can import customers from a CSV file. The required columns are: full_name, phone, email, consent_sms (true/false), consent_email (true/false)." },
  { q: "What SMS provider does LocalBoost use?", a: "LocalBoost uses Twilio for SMS. Twilio supports Cyprus (+357) numbers and provides reliable global delivery." },
  { q: "Can I cancel my subscription?", a: "Yes, at any time from your Billing page. You will retain access until the end of your current billing period." },
  { q: "Do you plan to support WhatsApp?", a: "WhatsApp is on our Phase 2 roadmap. Sign up and you will be notified when it is available." },
  { q: "What if I have multiple locations?", a: "The Pro plan supports up to 3 locations and the Premium plan supports up to 10. Each location can have its own staff and appointment schedule." },
];

export default function FAQPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-500 text-lg">Can't find your answer? <a href="/contact" className="text-brand-600 hover:underline">Contact us →</a></p>
        </div>

        <div className="space-y-4">
          {faqs.map(({ q, a }) => (
            <details key={q} className="card p-6 group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-gray-900 list-none">
                {q}
                <span className="text-brand-500 ml-4 text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-gray-600 mt-4 leading-relaxed text-sm">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
