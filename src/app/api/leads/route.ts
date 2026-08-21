import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

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
// CHECK ADMIN AUTHENTICATION
// ============================================

async function checkAdmin() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

// ============================================
// GET LEADS
//
// GET /api/leads
// → Returns all leads
//
// GET /api/leads?id=LEAD_ID
// → Returns one specific lead
// ============================================

export async function GET(
  request: Request
) {
  try {
    // ========================================
    // AUTH CHECK
    // ========================================

    const user = await checkAdmin();

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
    // READ ID FROM URL
    // ========================================

    const url = new URL(request.url);

    const id = url.searchParams.get("id");

    // ========================================
    // GET ONE LEAD
    // ========================================

    if (id) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("leads")
        .select(
          `
          id,
          name,
          email,
          meeting_id,
          created_at,
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
        .eq("id", id)
        .maybeSingle();

      // ======================================
      // SUPABASE ERROR
      // ======================================

      if (error) {
        console.error(
          "GET SINGLE LEAD SUPABASE ERROR:",
          error
        );

        return jsonResponse(
          {
            success: false,
            error:
              error.message ||
              "Unable to load lead.",
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          500
        );
      }

      // ======================================
      // LEAD NOT FOUND
      // ======================================

      if (!data) {
        return jsonResponse(
          {
            success: false,
            error: "Lead not found.",
          },
          404
        );
      }

      // ======================================
      // SUCCESS
      // ======================================

      return jsonResponse({
        success: true,
        lead: data,
      });
    }

    // ========================================
    // GET ALL LEADS
    // ========================================

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("leads")
      .select(
        `
        id,
        name,
        email,
        meeting_id,
        created_at,
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
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    // ========================================
    // SUPABASE ERROR
    // ========================================

    if (error) {
      console.error(
        "GET LEADS SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to load leads.",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500
      );
    }

    // ========================================
    // SUCCESS
    // ========================================

    return jsonResponse({
      success: true,
      leads: data || [],
    });
  } catch (error) {
    console.error(
      "GET LEADS ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load leads.",
      },
      500
    );
  }
}

// ============================================
// CREATE LEAD
// ============================================

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const sessionCode =
      typeof body.sessionCode === "string"
        ? body.sessionCode.trim()
        : "";

    // ========================================
    // VALIDATION
    // ========================================

    if (!name) {
      return jsonResponse(
        {
          success: false,
          error: "Name is required.",
        },
        400
      );
    }

    if (!email) {
      return jsonResponse(
        {
          success: false,
          error: "Email is required.",
        },
        400
      );
    }

    if (!email.includes("@")) {
      return jsonResponse(
        {
          success: false,
          error:
            "Please enter a valid email address.",
        },
        400
      );
    }

    if (!sessionCode) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting session is missing. Please scan the meeting QR code.",
        },
        400
      );
    }

    // ========================================
    // FIND MEETING
    // ========================================

    const {
      data: meeting,
      error: meetingError,
    } =
      await supabaseAdmin
        .from("meeting_sessions")
        .select(
          `
          id,
          title,
          session_code,
          is_active
          `
        )
        .eq(
          "session_code",
          sessionCode
        )
        .maybeSingle();

    if (meetingError) {
      console.error(
        "FIND MEETING FOR LEAD ERROR:",
        meetingError
      );

      return jsonResponse(
        {
          success: false,
          error:
            meetingError.message ||
            "Unable to find meeting.",
          code:
            meetingError.code,
          details:
            meetingError.details,
          hint:
            meetingError.hint,
        },
        500
      );
    }

    // ========================================
    // MEETING NOT FOUND
    // ========================================

    if (!meeting) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting not found. Please scan a valid meeting QR code.",
        },
        404
      );
    }

    // ========================================
    // CLOSED MEETING
    // ========================================

    if (!meeting.is_active) {
      return jsonResponse(
        {
          success: false,
          error:
            "This meeting is closed and is no longer accepting leads.",
        },
        400
      );
    }

    // ========================================
    // INSERT LEAD
    // ========================================

    const {
      data: lead,
      error: leadError,
    } =
      await supabaseAdmin
        .from("leads")
        .insert({
          name,
          email,
          meeting_id:
            meeting.id,
        })
        .select(
          `
          id,
          name,
          email,
          meeting_id,
          created_at
          `
        )
        .single();

    // ========================================
    // INSERT ERROR
    // ========================================

    if (leadError) {
      console.error(
        "CREATE LEAD SUPABASE ERROR:",
        leadError
      );

      return jsonResponse(
        {
          success: false,
          error:
            leadError.message ||
            "Unable to save lead.",
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
    // SUCCESS
    // ========================================

    console.log(
      "NEW LEAD SAVED:",
      {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        meetingId:
          lead.meeting_id,
      }
    );

    return jsonResponse(
      {
        success: true,
        message:
          "Lead saved successfully.",
        lead,
      },
      201
    );
  } catch (error) {
    console.error(
      "CREATE LEAD ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save lead.",
      },
      500
    );
  }
}