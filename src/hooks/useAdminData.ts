import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Exam, Question, Score, Topup, UserBalance, Purchase, GlobalBankQ, Material, LynkPackage } from "@/types/admin";

export function useAdminData() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");

  const [globalBank, setGlobalBank] = useState<GlobalBankQ[]>([]);
  const [globalBankLoading, setGlobalBankLoading] = useState(false);

  const refresh = async (
    currentSelectedExam: string,
    setMaterials: (mats: Material[]) => void,
    setLynkPackages: (pkgs: LynkPackage[]) => void
  ) => {
    const { data: e } = await supabase.from("exams")
      .select("id,title,total_questions,description,duration,price,original_price,bundle_size,category,subcategory,exam_type,passing_score,cta_link,cover_image_url")
      .order("created_at");
    setExams((e as Exam[]) ?? []);

    const { data: lp } = await supabase.from("lynk_packages")
      .select("*, exams(title)").order("created_at");
    setLynkPackages((lp as LynkPackage[]) ?? []);

    const { data: mat } = await supabase.from("materials")
      .select("id,title,description,file_name,category,topic,char_count,created_at,extracted_text")
      .order("created_at", { ascending: false });
    setMaterials((mat as Material[]) ?? []);

    if (currentSelectedExam) {
      // Auto-migrate: if no assignments yet, create them from exam_id
      const { count: aCount } = await (supabase as any)
        .from("exam_question_assignments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", currentSelectedExam);
      if ((aCount ?? 0) === 0) {
        const { data: oldQs } = await supabase.from("questions").select("id").eq("exam_id", currentSelectedExam).order("created_at");
        if (oldQs && oldQs.length > 0) {
          await (supabase as any).from("exam_question_assignments").insert(
            oldQs.map((q: any, i: number) => ({ exam_id: currentSelectedExam, question_id: q.id, position: i + 1 }))
          );
        }
      }
      // Load questions via junction table
      const { data: asgn } = await (supabase as any)
        .from("exam_question_assignments")
        .select("position, questions(id, exam_id, question_text, options, correct_answer, subtest, option_points, explanation, image_url, svg_content, topic, source)")
        .eq("exam_id", currentSelectedExam)
        .order("position");
      setQuestions(((asgn ?? []).map((d: any) => d.questions).filter(Boolean)) as Question[]);
    }

    const { data: s } = await supabase.from("user_scores")
      .select("id,score,completed_at,profiles(username,email),exams(title)")
      .order("completed_at", { ascending: false }).limit(500);
    setScores((s as Score[]) ?? []);

    const { data: t } = await supabase.from("topup_requests")
      .select("id,user_id,amount,status,created_at")
      .order("created_at", { ascending: false }).limit(200);

    const { data: purch } = await supabase.from("exam_purchases")
      .select("id,created_at,user_id,exam_id,profiles(username,email),exams(title)")
      .order("created_at", { ascending: false }).limit(500);
    setPurchases((purch as Purchase[]) ?? []);

    // Fetch ALL profiles for Saldo User (not just those with balances)
    const { data: allProfiles } = await supabase.from("profiles").select("id,username,email").order("created_at");
    const { data: balanceRows } = await supabase.from("user_balances").select("user_id,balance");

    const balanceMap: Record<string, number> = Object.fromEntries((balanceRows ?? []).map((b: any) => [b.user_id, b.balance]));
    const profileMap: Record<string, { username: string | null; email: string | null }> = Object.fromEntries(
      (allProfiles ?? []).map((p: any) => [p.id, { username: p.username, email: p.email }])
    );

    setTopups(((t ?? []) as any[]).map((x) => ({ ...x, profiles: profileMap[x.user_id] ?? null })));
    // Show all users with balance (default 0)
    const allBalances = (allProfiles ?? []).map((p: any) => ({
      user_id: p.id,
      balance: balanceMap[p.id] ?? 0,
      profiles: { username: p.username, email: p.email },
    }));
    allBalances.sort((a, b) => b.balance - a.balance);
    setBalances(allBalances);
  };

  const loadGlobalBank = async () => {
    setGlobalBankLoading(true);
    // Fetch all questions
    const { data: qs } = await supabase
      .from("questions")
      .select("id, question_text, subtest, topic, source, exam_id")
      .order("created_at", { ascending: false });

    // Fetch assignment counts per question
    const { data: asgns } = await (supabase as any)
      .from("exam_question_assignments")
      .select("question_id");

    const countMap: Record<string, number> = {};
    (asgns ?? []).forEach((a: any) => {
      countMap[a.question_id] = (countMap[a.question_id] ?? 0) + 1;
    });

    const result: GlobalBankQ[] = (qs ?? []).map((q: any) => ({
      ...q,
      assign_count: countMap[q.id] ?? 0,
    }));
    setGlobalBank(result);
    setGlobalBankLoading(false);
  };

  return {
    exams, setExams,
    questions, setQuestions,
    scores, setScores,
    topups, setTopups,
    balances, setBalances,
    purchases, setPurchases,
    selectedExam, setSelectedExam,
    globalBank, setGlobalBank,
    globalBankLoading, setGlobalBankLoading,
    refresh,
    loadGlobalBank,
  };
}
