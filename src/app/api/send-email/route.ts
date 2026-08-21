import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
} from "@/app/lib/supabase-server";

import {
  supabaseAdmin,
} from "@/app/lib/supabase-admin";

// ============================================
// SAFE JSON RESPONSE
// ============================================

function jsonResponse(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ============================================
// CHECK ADMIN
// ============================================

async function checkAdmin() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  return user;
}

// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(
  value: string
) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================
// POST
// SEND PERSONALIZED EMAIL + CARD PDF
// ============================================

export async function POST(
  request: Request
) {
  try {
    // ========================================
    // ADMIN AUTH
    // ========================================

    const user =
      await checkAdmin();

    if (!user) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    // ========================================
    // RESEND API KEY
    // ========================================

    const resendApiKey =
      process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error(
        "RESEND_API_KEY is missing."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Resend API key is not configured.",
        },
        500
      );
    }

    // ========================================
    // EMAIL FROM
    // ========================================

    const fromEmail =
      process.env.EMAIL_FROM;

    if (!fromEmail) {
      console.error(
        "EMAIL_FROM is missing."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "EMAIL_FROM is not configured.",
        },
        500
      );
    }

    // ========================================
    // READ REQUEST
    // ========================================

    const body =
      await request.json();

    const leadId =
      typeof body.leadId === "string"
        ? body.leadId.trim()
        : "";

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const emailBody =
      typeof body.body === "string"
        ? body.body.trim()
        : "";

    const cardPdf =
      typeof body.cardPdf === "string"
        ? body.cardPdf.trim()
        : "";

    // ========================================
    // VALIDATION
    // ========================================

    if (!leadId) {
      return jsonResponse(
        {
          success: false,
          error:
            "Lead ID is required.",
        },
        400
      );
    }

    if (!subject) {
      return jsonResponse(
        {
          success: false,
          error:
            "Email subject is required.",
        },
        400
      );
    }

    if (!emailBody) {
      return jsonResponse(
        {
          success: false,
          error:
            "Email body is required.",
        },
        400
      );
    }

    if (!cardPdf) {
      return jsonResponse(
        {
          success: false,
          error:
            "Digital card PDF was not generated.",
        },
        400
      );
    }

    // ========================================
    // GET LEAD
    // ========================================

    const {
      data: lead,
      error: leadError,
    } =
      await supabaseAdmin
        .from("leads")
        .select(
          `
          id,
          name,
          email
          `
        )
        .eq(
          "id",
          leadId
        )
        .maybeSingle();

    if (leadError) {
      console.error(
        "GET LEAD FOR EMAIL ERROR:",
        leadError
      );

      return jsonResponse(
        {
          success: false,
          error:
            leadError.message ||
            "Unable to load lead.",
          code:
            leadError.code,
          details:
            leadError.details,
          hint:
            leadError.hint,
        },
        500
      );
    }

    // ========================================
    // LEAD NOT FOUND
    // ========================================

    if (!lead) {
      return jsonResponse(
        {
          success: false,
          error:
            "Lead not found.",
        },
        404
      );
    }

    // ========================================
    // PREPARE EMAIL HTML
    // ========================================

    const safeBody =
      escapeHtml(emailBody);

    const htmlBody =
      safeBody.replace(
        /\n/g,
        "<br />"
      );

    // ========================================
    // SEND EMAIL
    // ========================================

    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${resendApiKey}`,
          },

          body: JSON.stringify({
            from: fromEmail,

            to: [
              lead.email,
            ],

            subject,

            html: `
              <div
                style="
                  font-family: Arial, sans-serif;
                  line-height: 1.7;
                  color: #222;
                  max-width: 680px;
                  margin: 0 auto;
                "
              >
                ${htmlBody}

                <br />
                <br />

                <p
                  style="
                    color: #666;
                    font-size: 13px;
                  "
                >
                  I've also attached my digital
                  visiting card for your reference.
                </p>
              </div>
            `,

            // ==================================
            // TWO-SIDED DIGITAL CARD
            // ==================================

            attachments: [
              {
                filename:
                  "Krinsh-Panchal-Digital-Card.pdf",

                content:
                  cardPdf,

                content_type:
                  "application/pdf",
              },
            ],

            // ==================================
            // RESEND TAGS
            // ==================================

            tags: [
              {
                name: "source",
                value:
                  "digital-visiting-card",
              },

              {
                name: "lead_id",
                value:
                  lead.id,
              },
            ],
          }),
        }
      );

    const resendData =
      await resendResponse.json();

    // ========================================
    // RESEND ERROR
    // ========================================

    if (!resendResponse.ok) {
      console.error(
        "RESEND API ERROR:",
        resendData
      );

      return jsonResponse(
        {
          success: false,
          error:
            resendData?.message ||
            resendData?.error ||
            "Unable to send email.",

          details:
            resendData,
        },
        resendResponse.status
      );
    }

    // ========================================
    // SUCCESS
    // ========================================

    console.log(
      "EMAIL + CARD SENT SUCCESSFULLY:",
      {
        leadId:
          lead.id,

        recipient:
          lead.email,

        resendId:
          resendData?.id,
      }
    );

    return jsonResponse({
      success: true,

      message:
        "Email and digital card sent successfully.",

      email: {
        id:
          resendData?.id ||
          null,

        recipient:
          lead.email,

        subject,

        attachment:
          "Krinsh-Panchal-Digital-Card.pdf",
      },
    });
  } catch (error) {
    console.error(
      "SEND EMAIL ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send email.",
      },
      500
    );
  }
}