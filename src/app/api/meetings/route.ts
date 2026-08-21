import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

// ============================================
// TYPES
// ============================================

type AdminAuthResult =
  | {
      authorized: true;
      user: User;
      response: null;
    }
  | {
      authorized: false;
      user: User | null;
      response: NextResponse;
    };

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
// ADMIN AUTHENTICATION
// ============================================

async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  // ----------------------------------------
  // NOT AUTHENTICATED
  // ----------------------------------------

  if (error || !user) {
    return {
      authorized: false,
      user: null,
      response: jsonResponse(
        {
          success: false,
          error:
            "Unauthorized. Please sign in.",
        },
        401
      ),
    };
  }

  // ----------------------------------------
  // OPTIONAL ADMIN EMAIL RESTRICTION
  //
  // Add to .env.local:
  //
  // ADMIN_EMAIL=your-admin-email@example.com
  //
  // If ADMIN_EMAIL is not configured,
  // any authenticated Supabase user is allowed.
  // ----------------------------------------

  const adminEmail =
    process.env.ADMIN_EMAIL?.trim();

  if (
    adminEmail &&
    user.email?.toLowerCase() !==
      adminEmail.toLowerCase()
  ) {
    return {
      authorized: false,
      user,
      response: jsonResponse(
        {
          success: false,
          error:
            "Access denied. Admin account required.",
        },
        403
      ),
    };
  }

  // ----------------------------------------
  // AUTHORIZED
  // ----------------------------------------

  return {
    authorized: true,
    user,
    response: null,
  };
}

// ============================================
// GENERATE SESSION CODE
// ============================================

function generateSessionCode() {
  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `MEET-${random}`;
}

// ============================================
// DATE HELPER
// ============================================

function getTodayDate() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Kolkata",
      }
    );

  return formatter.format(
    new Date()
  );
}

// ============================================
// CHECK DATE
// ============================================

function isMeetingDateExpired(
  sessionDate: string | null
) {
  if (!sessionDate) {
    return false;
  }

  const today =
    getTodayDate();

  return sessionDate < today;
}

// ============================================
// GET ALL MEETINGS
// ============================================

export async function GET() {
  try {
    // ----------------------------------------
    // AUTHENTICATION
    // ----------------------------------------

    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // ----------------------------------------
    // LOAD MEETINGS
    // ----------------------------------------

    const {
      data,
      error,
    } =
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
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

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

    // ----------------------------------------
    // AUTOMATIC EXPIRY
    // ----------------------------------------

    const meetings =
      (data || []).map(
        (meeting) => {
          const expired =
            isMeetingDateExpired(
              meeting.session_date
            );

          return {
            ...meeting,
            is_active:
              expired
                ? false
                : meeting.is_active,
          };
        }
      );

    return jsonResponse({
      success: true,
      meetings,
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
    // ----------------------------------------
    // AUTHENTICATION
    // ----------------------------------------

    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
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
      typeof body.location ===
      "string"
        ? body.location.trim()
        : "";

    const sessionDate =
      typeof body.sessionDate ===
      "string"
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
      !datePattern.test(
        sessionDate
      )
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
    // GENERATE SESSION CODE
    // ----------------------------------------

    const sessionCode =
      generateSessionCode();

    // ----------------------------------------
    // INSERT
    // ----------------------------------------

    const {
      data,
      error,
    } =
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
    // AUTHENTICATION
    // ----------------------------------------

    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // ----------------------------------------
    // GET ID
    // ----------------------------------------

    const url =
      new URL(request.url);

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
      typeof body.location ===
      "string"
        ? body.location.trim()
        : "";

    const sessionDate =
      typeof body.sessionDate ===
      "string"
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
      !datePattern.test(
        sessionDate
      )
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
    // CHECK EXISTS
    // ----------------------------------------

    const {
      data: existingMeeting,
      error: findError,
    } =
      await supabaseAdmin
        .from("meeting_sessions")
        .select(
          "id, is_active"
        )
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
          code:
            findError.code,
          details:
            findError.details,
          hint:
            findError.hint,
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

    const {
      data,
      error,
    } =
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
          details:
            error.details,
          hint:
            error.hint,
        },
        500
      );
    }

    // ----------------------------------------
    // RETURN UPDATED STATUS
    // ----------------------------------------

    const updatedMeeting =
      {
        ...data,
        is_active:
          isMeetingDateExpired(
            data.session_date
          )
            ? false
            : data.is_active,
      };

    return jsonResponse({
      success: true,
      message:
        "Meeting updated successfully.",
      meeting:
        updatedMeeting,
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
    // AUTHENTICATION
    // ----------------------------------------

    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    // ----------------------------------------
    // GET ID
    // ----------------------------------------

    const url =
      new URL(request.url);

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
    // FIND MEETING
    // ----------------------------------------

    const {
      data: existingMeeting,
      error: findError,
    } =
      await supabaseAdmin
        .from("meeting_sessions")
        .select(
          `
          id,
          title,
          session_date,
          is_active
          `
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
          code:
            findError.code,
          details:
            findError.details,
          hint:
            findError.hint,
        },
        500
      );
    }

    // ----------------------------------------
    // MEETING NOT FOUND
    // ----------------------------------------

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
    // CHECK CLOSED STATUS
    // ----------------------------------------

    const isExpired =
      isMeetingDateExpired(
        existingMeeting.session_date
      );

    const isClosed =
      !existingMeeting.is_active ||
      isExpired;

    if (isClosed) {
      return jsonResponse(
        {
          success: false,
          error:
            "Closed meetings cannot be deleted.",
        },
        403
      );
    }

    // ----------------------------------------
    // DELETE ACTIVE MEETING
    // ----------------------------------------

    const { error } =
      await supabaseAdmin
        .from("meeting_sessions")
        .delete()
        .eq("id", id)
        .eq("is_active", true);

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
          details:
            error.details,
          hint:
            error.hint,
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