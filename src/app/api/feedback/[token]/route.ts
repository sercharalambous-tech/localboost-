import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { scheduleReviewJob } from "@/lib/scheduler";
import { sendEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";

const SubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// GET /api/feedback/[token] — serve feedback form
export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const feedback = await prisma.feedback.findUnique({
    where: { token: params.token },
    include: { business: { select: { name: true } }, customer: { select: { fullName: true } } },
  });

  if (!feedback) {
    return new Response(feedbackPage({ error: "Link not found or expired." }), {
      headers: { "Content-Type": "text/html" }, status: 404,
    });
  }

  if (feedback.submittedAt) {
    return new Response(feedbackPage({ alreadySubmitted: true, businessName: feedback.business.name }), {
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    feedbackPage({ token: params.token, businessName: feedback.business.name, customerName: feedback.customer.fullName }),
    { headers: { "Content-Type": "text/html" } }
  );
}

// POST /api/feedback/[token] — submit rating
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const { rating, comment } = SubmitSchema.parse(body);

    const feedback = await prisma.feedback.findUnique({
      where: { token: params.token },
      include: {
        business: { select: { id: true, name: true, googleReviewUrl: true, owner: { select: { email: true } } } },
        customer: { select: { id: true, fullName: true, email: true } },
        appointment: { select: { id: true } },
      },
    });

    if (!feedback) return Response.json({ error: "Invalid token" }, { status: 404 });
    if (feedback.submittedAt) return Response.json({ error: "Already submitted" }, { status: 409 });

    await prisma.feedback.update({
      where: { id: feedback.id },
      data: { rating, comment, submittedAt: new Date() },
    });

    await createAuditLog({
      businessId: feedback.businessId,
      action: "feedback_submitted",
      entity: "feedback",
      entityId: feedback.id,
      metadata: { rating },
    });

    if (rating >= 4) {
      // Schedule Google Review job
      scheduleReviewJob(feedback.appointmentId, feedback.businessId, feedback.customerId).catch(console.error);

      return Response.json({
        success: true,
        nextStep: "review",
        reviewUrl: feedback.business.googleReviewUrl,
      });
    } else {
      // Notify business owner about low rating privately
      if (feedback.business.owner.email) {
        await sendEmail({
          to: feedback.business.owner.email,
          subject: `⚠️ Private feedback received (${rating}/5) – ${feedback.business.name}`,
          htmlBody: `
<p>A customer left private feedback for <strong>${feedback.business.name}</strong>.</p>
<p><strong>Rating:</strong> ${rating}/5</p>
${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ""}
<p><strong>Customer:</strong> ${feedback.customer.fullName}</p>
<p>This feedback is private and has NOT been published anywhere. Please follow up directly.</p>`,
          tag: "private-feedback",
        }).catch(console.error);
      }

      return Response.json({ success: true, nextStep: "done" });
    }
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.errors[0].message }, { status: 422 });
    console.error("[feedback]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// ── HTML feedback form ────────────────────────────────────
interface PageOptions {
  token?: string;
  businessName?: string;
  customerName?: string;
  error?: string;
  alreadySubmitted?: boolean;
}

function feedbackPage(opts: PageOptions): string {
  if (opts.error) {
    return simplePage("Not Found", opts.error, "❌");
  }
  if (opts.alreadySubmitted) {
    return simplePage("Already submitted", `Thank you! Your feedback for ${opts.businessName} has already been recorded.`, "✅");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>How was your visit?</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#f0f4ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px}
    .card{background:#fff;border-radius:16px;padding:36px 32px;max-width:460px;width:100%;box-shadow:0 4px 32px rgba(37,99,235,.12)}
    h1{font-size:22px;color:#1e40af;margin:0 0 6px}
    p.sub{color:#6b7280;margin:0 0 24px;font-size:15px}
    .stars{display:flex;gap:8px;justify-content:center;margin-bottom:24px}
    .star{font-size:44px;cursor:pointer;opacity:.3;transition:opacity .15s,transform .15s;user-select:none}
    .star.active{opacity:1;transform:scale(1.12)}
    textarea{width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:12px;font-size:15px;resize:vertical;min-height:80px;font-family:inherit;outline:none;transition:border-color .2s}
    textarea:focus{border-color:#2563eb}
    button{background:#2563eb;color:#fff;border:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;width:100%;margin-top:16px;transition:background .2s}
    button:hover{background:#1d4ed8}
    button:disabled{background:#93c5fd;cursor:not-allowed}
    .success{text-align:center;display:none}
  </style>
</head>
<body>
<div class="card" id="form-card">
  <h1>How was your visit?</h1>
  <p class="sub">${opts.businessName} would love to hear from you, ${opts.customerName}!</p>
  <div class="stars">
    <span class="star" data-v="1">⭐</span>
    <span class="star" data-v="2">⭐</span>
    <span class="star" data-v="3">⭐</span>
    <span class="star" data-v="4">⭐</span>
    <span class="star" data-v="5">⭐</span>
  </div>
  <textarea id="comment" placeholder="Any comments? (optional)"></textarea>
  <button id="submit-btn" disabled>Submit Feedback</button>
</div>
<div class="card success" id="success-card">
  <div style="text-align:center">
    <div style="font-size:56px;margin-bottom:12px">🙏</div>
    <h2 style="color:#1e40af">Thank you!</h2>
    <p id="success-msg" style="color:#374151"></p>
    <a id="review-link" href="#" target="_blank" style="display:none;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:16px">⭐ Leave a Google Review</a>
  </div>
</div>
<script>
let rating = 0;
const stars = document.querySelectorAll('.star');
stars.forEach(s => {
  s.addEventListener('click', () => {
    rating = +s.dataset.v;
    stars.forEach((st, i) => st.classList.toggle('active', i < rating));
    document.getElementById('submit-btn').disabled = false;
  });
});
document.getElementById('submit-btn').addEventListener('click', async () => {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  const comment = document.getElementById('comment').value;
  const res = await fetch(location.href, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({rating,comment}) });
  const data = await res.json();
  if (data.success) {
    document.getElementById('form-card').style.display='none';
    const sc = document.getElementById('success-card');
    sc.style.display='block';
    if (data.nextStep === 'review' && data.reviewUrl) {
      document.getElementById('success-msg').textContent = 'We are so glad you had a great experience!';
      const rl = document.getElementById('review-link');
      rl.href = data.reviewUrl; rl.style.display = 'inline-block';
    } else {
      document.getElementById('success-msg').textContent = 'Your feedback has been received privately. Thank you for helping us improve!';
    }
  } else {
    btn.disabled = false; btn.textContent = 'Submit Feedback';
    alert(data.error || 'Something went wrong. Please try again.');
  }
});
</script>
</body></html>`;
}

function simplePage(title: string, msg: string, icon: string): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f4ff;margin:0}
.card{background:#fff;border-radius:16px;padding:40px;max-width:440px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h1{color:#1e40af;font-size:22px;margin:0 0 12px}p{color:#374151;line-height:1.6}</style>
</head><body><div class="card">
<div style="font-size:48px;margin-bottom:12px">${icon}</div>
<h1>${title}</h1><p>${msg}</p>
</div></body></html>`;
}
