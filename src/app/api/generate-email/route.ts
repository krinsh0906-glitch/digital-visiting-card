import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

// ============================================
// GEMINI
// ============================================

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
// POST
// GENERATE FOLLOW-UP EMAIL
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
    // READ BODY
    // ========================================

    const body =
      await request.json();

    const leadId =
      typeof body.leadId === "string"
        ? body.leadId.trim()
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
          email,
          created_at,
          meeting_id,
          meeting_sessions (
            id,
            title,
            location,
            session_date,
            session_code,
            is_active
          )
          `
        )
        .eq("id", leadId)
        .maybeSingle();

    if (leadError) {
      console.error(
        "GET LEAD FOR AI ERROR:",
        leadError
      );

      return jsonResponse(
        {
          success: false,
          error:
            leadError.message ||
            "Unable to load lead.",
          code: leadError.code,
          details: leadError.details,
          hint: leadError.hint,
        },
        500
      );
    }

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
    // GET CONVERSATION
    // ========================================

    const {
      data: conversationData,
      error: conversationError,
    } =
      await supabaseAdmin
        .from("lead_conversations")
        .select(
          `
          conversation
          `
        )
        .eq(
          "lead_id",
          leadId
        )
        .maybeSingle();

    if (conversationError) {
      console.error(
        "GET CONVERSATION FOR AI ERROR:",
        conversationError
      );

      return jsonResponse(
        {
          success: false,
          error:
            conversationError.message ||
            "Unable to load conversation.",
          code:
            conversationError.code,
          details:
            conversationError.details,
          hint:
            conversationError.hint,
        },
        500
      );
    }

    const conversation =
      conversationData?.conversation
        ?.trim() || "";

    // ========================================
    // CONVERSATION REQUIRED
    // ========================================

    if (!conversation) {
      return jsonResponse(
        {
          success: false,
          error:
            "Please save the conversation before generating the email.",
        },
        400
      );
    }

    // ========================================
    // GET MEETING
    // ========================================

    const meetingData =
      lead.meeting_sessions;

    const meeting =
      Array.isArray(meetingData)
        ? meetingData[0]
        : meetingData;

    // ========================================
    // CHECK GEMINI KEY
    // ========================================

    if (!process.env.GEMINI_API_KEY) {
      console.error(
        "GEMINI_API_KEY is missing."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Gemini API key is not configured.",
        },
        500
      );
    }

    // ========================================
    // AI PROMPT
    // ========================================

    const prompt = `
You are writing a professional follow-up email for Krinsh Panchal after a business networking meeting.

The email must feel:

- Personal
- Natural
- Professional
- Warm
- Concise
- Human-written

Do NOT make it sound like a generic AI sales email.

Do NOT invent information that is not provided.

Do NOT claim that the recipient agreed to something unless the conversation notes explicitly say so.

Use the conversation notes to understand what was discussed and what the appropriate next step should be.

--------------------------------
LEAD
--------------------------------

Name:
${lead.name}

Email:
${lead.email}

--------------------------------
MEETING
--------------------------------

Event:
${meeting?.title || "Networking meeting"}

Location:
${meeting?.location || "Not specified"}

Meeting date:
${meeting?.session_date || "Not specified"}

--------------------------------
CONVERSATION NOTES
--------------------------------

${conversation}

--------------------------------
EMAIL REQUIREMENTS
--------------------------------

Write:

1. A natural subject line.
2. A short personalized email.
3. Mention the meeting/event naturally.
4. Reference the actual conversation.
5. Mention the relevant next step if one exists.
6. End professionally from Krinsh Panchal.

The email should generally be around 100–180 words.

Return ONLY this format:

SUBJECT:
<subject>

BODY:
<email body>
`;

    // ========================================
    // GENERATE WITH GEMINI
    // ========================================

    const response =
      await gemini.models.generateContent({
        model:
          "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

    const output =
      response.text?.trim() || "";

    // ========================================
    // CHECK RESULT
    // ========================================

    if (!output) {
      console.error(
        "GEMINI EMPTY RESPONSE:",
        response
      );

      return jsonResponse(
        {
          success: false,
          error:
            "AI did not generate an email.",
        },
        500
      );
    }

    // ========================================
    // PARSE SUBJECT + BODY
    // ========================================

    const subjectMatch =
      output.match(
        /SUBJECT:\s*([\s\S]*?)(?:\n\s*BODY:|$)/i
      );

    const bodyMatch =
      output.match(
        /BODY:\s*([\s\S]*)$/i
      );

    const subject =
      subjectMatch?.[1]
        ?.trim() || "";

    const emailBody =
      bodyMatch?.[1]
        ?.trim() || "";

    // ========================================
    // FALLBACK
    // ========================================

    if (!subject || !emailBody) {
      console.error(
        "GEMINI EMAIL PARSING FAILED:",
        output
      );

      return jsonResponse(
        {
          success: false,
          error:
            "AI generated an invalid email format.",
        },
        500
      );
    }

    // ========================================
    // SUCCESS
    // ========================================

    return jsonResponse({
      success: true,

      email: {
        subject,
        body: emailBody,

        recipient: {
          name: lead.name,
          email: lead.email,
        },
      },
    });
  } catch (error) {
    console.error(
      "GENERATE EMAIL ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate email.",
      },
      500
    );
  }
}