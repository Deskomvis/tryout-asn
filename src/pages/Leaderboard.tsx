import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type Row = { id: string; score: number; user_id: string; profiles: { full_name: string | null } | null; exams: { title: string } | null };

const Leaderboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase.from("user_scores")
      .select("id, score, user_id, profiles(full_name), exams(title)")
      .order("score", { ascending: false }).limit(50)
      .then(({ data }) => setRows((data as any) ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader />
      <main className="container max-w-3xl py-10">
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>
        <Card><CardContent className="pt-6">
          {rows.length === 0 ? <p className="text-muted-foreground">Belum ada skor.</p> : (
            <ol className="divide-y divide-border">
              {rows.map((r, i) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{i + 1}</span>
                    <div>
                      <p className="font-medium">{r.profiles?.full_name ?? "Anonim"}</p>
                      <p className="text-xs text-muted-foreground">{r.exams?.title}</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">{r.score}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent></Card>
      </main>
    </div>
  );
};

export default Leaderboard;
