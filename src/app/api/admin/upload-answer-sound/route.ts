import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_GRADES = ["correct", "half-correct", "incorrect"] as const;
// Feedback clips are tiny; cap uploads so an over-large file can't slip in.
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Admin-only: upload a replacement answer-feedback sound for one grade. Stores
 * the file in the `audio` bucket and points the matching
 * `answer_feedback_sounds` row at its public URL.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const grade = formData.get("grade") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!grade || !VALID_GRADES.includes(grade as (typeof VALID_GRADES)[number])) {
      return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
    }
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be 2 MB or smaller" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const filePath = `answer-feedback/${grade}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminSupabase = createAdminClient();
    const { data: uploaded, error: uploadError } = await adminSupabase.storage
      .from("audio")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Answer sound upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from("audio").getPublicUrl(uploaded.path);

    const { error: updateError } = await adminSupabase
      .from("answer_feedback_sounds")
      .update({ audio_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("grade", grade);

    if (updateError) {
      console.error("Answer sound row update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Answer sound upload route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
