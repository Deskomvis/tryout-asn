import { supabase } from "@/integrations/supabase/client";

export const purchaseExam = async (examId: string) => {
  const { data, error } = await supabase.rpc("purchase_exam", { _exam_id: examId });
  if (error) throw new Error(error.message);

  // Grant access to all child sub-packages automatically (children have price=0)
  const { data: children } = await (supabase.from("exams") as any)
    .select("id")
    .eq("parent_exam_id", examId);

  if (children && (children as { id: string }[]).length > 0) {
    await Promise.all(
      (children as { id: string }[]).map((child) =>
        supabase.rpc("purchase_exam", { _exam_id: child.id })
      )
    );
  }

  return data as string;
};
