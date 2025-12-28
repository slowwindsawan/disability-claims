import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysis, formData } = body;

    const supabase = await createClient();

    // Get the current user's case
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the case ID from the user's current case
    const { data: caseData } = await supabase
      .from("cases")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!caseData) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    // Update the case with the form 7801 analysis
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        "7801_form": analysis,
        form_7801_status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseData.id);

    if (updateError) {
      console.error("Error updating case:", updateError);
      return Response.json(
        { error: "Failed to submit form" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      caseId: caseData.id,
      message: "Form 7801 submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    return Response.json(
      { error: "Failed to submit form" },
      { status: 500 }
    );
  }
}
