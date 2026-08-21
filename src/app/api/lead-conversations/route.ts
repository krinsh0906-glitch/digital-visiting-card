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
// GET CONVERSATION
// ============================================

export async function GET(
  request: Request
) {
  try {
    // ----------------------------------------
    // ADMIN AUTH
    // ----------------------------------------

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

    // ----------------------------------------
    // GET LEAD ID
    // ----------------------------------------

    const url = new URL(
      request.url
    );

    const leadId =
      url.searchParams.get(
        "leadId"
      );

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

    // ----------------------------------------
    // GET CONVERSATION
    // ----------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "lead_conversations"
        )
        .select(
          `
          id,
          lead_id,
          conversation,
          created_at,
          updated_at
          `
        )
        .eq(
          "lead_id",
          leadId
        )
        .maybeSingle();

    if (error) {
      console.error(
        "GET CONVERSATION SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to load conversation.",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500
      );
    }

    // ----------------------------------------
    // NO CONVERSATION YET
    // ----------------------------------------

    return jsonResponse({
      success: true,
      conversation:
        data || null,
    });
  } catch (error) {
    console.error(
      "GET CONVERSATION ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load conversation.",
      },
      500
    );
  }
}

// ============================================
// SAVE / UPDATE CONVERSATION
// ============================================

export async function POST(
  request: Request
) {
  try {
    // ----------------------------------------
    // ADMIN AUTH
    // ----------------------------------------

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

    // ----------------------------------------
    // READ BODY
    // ----------------------------------------

    const body =
      await request.json();

    const leadId =
      typeof body.leadId === "string"
        ? body.leadId.trim()
        : "";

    const conversation =
      typeof body.conversation ===
      "string"
        ? body.conversation.trim()
        : "";

    // ----------------------------------------
    // VALIDATION
    // ----------------------------------------

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

    if (!conversation) {
      return jsonResponse(
        {
          success: false,
          error:
            "Conversation cannot be empty.",
        },
        400
      );
    }

    // ----------------------------------------
    // CHECK LEAD EXISTS
    // ----------------------------------------

    const {
      data: lead,
      error: leadError,
    } =
      await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("id", leadId)
        .maybeSingle();

    if (leadError) {
      console.error(
        "CHECK LEAD ERROR:",
        leadError
      );

      return jsonResponse(
        {
          success: false,
          error:
            leadError.message ||
            "Unable to find lead.",
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

    // ----------------------------------------
    // UPSERT CONVERSATION
    // ----------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "lead_conversations"
        )
        .upsert(
          {
            lead_id: leadId,
            conversation,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "lead_id",
          }
        )
        .select(
          `
          id,
          lead_id,
          conversation,
          created_at,
          updated_at
          `
        )
        .single();

    if (error) {
      console.error(
        "SAVE CONVERSATION SUPABASE ERROR:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error:
            error.message ||
            "Unable to save conversation.",
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
        "Conversation saved successfully.",
      conversation: data,
    });
  } catch (error) {
    console.error(
      "SAVE CONVERSATION ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save conversation.",
      },
      500
    );
  }
}