import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export interface CheckoutSessionOrigin {
  lessonId: string | null;
  lessonTitle: string | null;
  courseId: string | null;
}

/**
 * Retrieve origin lesson info from a Stripe checkout session.
 * Returns null if session can't be retrieved or has no origin.
 */
export async function getCheckoutSessionOrigin(
  sessionId: string
): Promise<CheckoutSessionOrigin | null> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const originLessonId = session.metadata?.origin_lesson_id;
    if (!originLessonId) {
      return null;
    }

    // Look up lesson title and course
    const supabase = await createClient();
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, course_id")
      .eq("id", originLessonId)
      .single();

    if (!lesson) {
      return null;
    }

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId: lesson.course_id,
    };
  } catch {
    return null;
  }
}
