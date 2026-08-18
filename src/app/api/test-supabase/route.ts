import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("meeting_sessions")
      .select("id")
      .limit(1);

    if (error) {
      console.error("SUPABASE TEST ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection working.",
      data,
    });
  } catch (error) {
    console.error("SUPABASE CONNECTION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to Supabase.",
      },
      { status: 500 }
    );
  }
}