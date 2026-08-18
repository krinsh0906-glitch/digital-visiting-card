import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

// ============================================
// GENERATE SESSION CODE
// ============================================

function generateSessionCode() {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `MEET-${random}`;
}

// ============================================
// SAFE JSON RESPONSE
// ============================================

function jsonResponse(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}

// ============================================
// GET ALL MEETINGS
// ============================================

export async function GET() {
  try {
    const { data, error } =
      await supabaseAdmin
        .from("meeting_sessions")
        .select(
          `
          id,
          title,
          location,
          session_date,
          session_code,
          is_active,
          created_at,
          updated_at
        `
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "GET MEETINGS SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to load meetings.",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      meetings: data || [],
    });
  } catch (error) {
    console.error(
      "GET MEETINGS ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load meetings.",
      },
      500
    );
  }
}

// ============================================
// CREATE MEETING
// ============================================

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : "";

    const sessionDate =
      typeof body.sessionDate === "string"
        ? body.sessionDate.trim()
        : "";

    // ----------------------------------------
    // VALIDATION
    // ----------------------------------------

    if (!title) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting or event name is required.",
        },
        400
      );
    }

    if (!location) {
      return jsonResponse(
        {
          success: false,
          error:
            "Location is required.",
        },
        400
      );
    }

    if (!sessionDate) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting date is required.",
        },
        400
      );
    }

    // Basic YYYY-MM-DD validation
    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(sessionDate)
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid meeting date. Use YYYY-MM-DD.",
        },
        400
      );
    }

    // ----------------------------------------
    // GENERATE CODE
    // ----------------------------------------

    const sessionCode =
      generateSessionCode();

    // ----------------------------------------
    // INSERT
    // ----------------------------------------

    const { data, error } =
      await supabaseAdmin
        .from("meeting_sessions")
        .insert({
          title,
          location,
          session_date:
            sessionDate,
          session_code:
            sessionCode,
          is_active: true,
        })
        .select(
          `
          id,
          title,
          location,
          session_date,
          session_code,
          is_active,
          created_at,
          updated_at
        `
        )
        .single();

    if (error) {
      console.error(
        "CREATE MEETING SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to create meeting.",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        message:
          "Meeting created successfully.",
        meeting: data,
      },
      201
    );
  } catch (error) {
    console.error(
      "CREATE MEETING ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create meeting.",
      },
      500
    );
  }
}

// ============================================
// UPDATE MEETING
// ============================================

export async function PUT(
  request: Request
) {
  try {
    // ----------------------------------------
    // GET MEETING ID FROM URL
    // ----------------------------------------

    const url = new URL(
      request.url
    );

    const id =
      url.searchParams.get("id");

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting ID is required.",
        },
        400
      );
    }

    // ----------------------------------------
    // READ BODY
    // ----------------------------------------

    const body =
      await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : "";

    const sessionDate =
      typeof body.sessionDate === "string"
        ? body.sessionDate.trim()
        : "";

    // ----------------------------------------
    // VALIDATION
    // ----------------------------------------

    if (!title) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting or event name is required.",
        },
        400
      );
    }

    if (!location) {
      return jsonResponse(
        {
          success: false,
          error:
            "Location is required.",
        },
        400
      );
    }

    if (!sessionDate) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting date is required.",
        },
        400
      );
    }

    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(sessionDate)
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid meeting date. Use YYYY-MM-DD.",
        },
        400
      );
    }

    // ----------------------------------------
    // CHECK MEETING EXISTS
    // ----------------------------------------

    const {
      data: existingMeeting,
      error: findError,
    } =
      await supabaseAdmin
        .from("meeting_sessions")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      console.error(
        "FIND MEETING ERROR:",
        findError
      );

      return jsonResponse(
        {
          success: false,
          error:
            findError.message ||
            "Unable to find meeting.",
          code: findError.code,
          details:
            findError.details,
          hint: findError.hint,
        },
        500
      );
    }

    if (!existingMeeting) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting not found.",
        },
        404
      );
    }

    // ----------------------------------------
    // UPDATE
    // ----------------------------------------

    const { data, error } =
      await supabaseAdmin
        .from("meeting_sessions")
        .update({
          title,
          location,
          session_date:
            sessionDate,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          id,
          title,
          location,
          session_date,
          session_code,
          is_active,
          created_at,
          updated_at
        `
        )
        .single();

    if (error) {
      console.error(
        "UPDATE MEETING SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to update meeting.",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500
      );
    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return jsonResponse({
      success: true,
      message:
        "Meeting updated successfully.",
      meeting: data,
    });
  } catch (error) {
    console.error(
      "UPDATE MEETING ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update meeting.",
      },
      500
    );
  }
}

// ============================================
// DELETE MEETING
// ============================================

export async function DELETE(
  request: Request
) {
  try {
    // ----------------------------------------
    // GET ID
    // ----------------------------------------

    const url = new URL(
      request.url
    );

    const id =
      url.searchParams.get("id");

    if (!id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting ID is required.",
        },
        400
      );
    }

    // ----------------------------------------
    // CHECK EXISTS
    // ----------------------------------------

    const {
      data: existingMeeting,
      error: findError,
    } =
      await supabaseAdmin
        .from("meeting_sessions")
        .select(
          "id, title"
        )
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      console.error(
        "FIND DELETE MEETING ERROR:",
        findError
      );

      return jsonResponse(
        {
          success: false,
          error:
            findError.message ||
            "Unable to find meeting.",
          code: findError.code,
          details:
            findError.details,
          hint: findError.hint,
        },
        500
      );
    }

    if (!existingMeeting) {
      return jsonResponse(
        {
          success: false,
          error:
            "Meeting not found.",
        },
        404
      );
    }

    // ----------------------------------------
    // DELETE
    // ----------------------------------------

    const { error } =
      await supabaseAdmin
        .from("meeting_sessions")
        .delete()
        .eq("id", id);

    if (error) {
      console.error(
        "DELETE MEETING SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to delete meeting.",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500
      );
    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return jsonResponse({
      success: true,
      message:
        "Meeting deleted successfully.",
      deletedId: id,
    });
  } catch (error) {
    console.error(
      "DELETE MEETING ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete meeting.",
      },
      500
    );
  }
}