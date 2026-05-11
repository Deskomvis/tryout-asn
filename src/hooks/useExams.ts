import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ExamLite } from "@/components/ExamCard";

export const useExams = () => {
  const [exams, setExams] = useState<ExamLite[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase
      .from("exams") as any)
      .select("id,title,description,duration,total_questions,price,category,subcategory,original_price,bundle_size,cover_image_url,cta_link")
      .is("parent_exam_id", null)
      .order("created_at")
      .then(({ data }: { data: any }) => {
        setExams((data as ExamLite[]) ?? []);
        setLoading(false);
      });
  }, []);
  return { exams, loading };
};
