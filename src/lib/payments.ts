import { supabase } from "@/integrations/supabase/client";

export const purchaseExam = async (examId: string) => {
  const { data, error } = await supabase.rpc("purchase_exam", { _exam_id: examId });
  if (error) throw new Error(error.message);
  return data as string;
};
