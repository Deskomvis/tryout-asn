import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { splitTextIntoChunks } from "@/lib/adminUtils";
import type { ChunkStatus, Material } from "@/types/admin";

export function useExtractChunks(materials: Material[]) {
  const [extractPanelId, setExtractPanelId] = useState<string | null>(null);
  const [extractExamId, setExtractExamId] = useState("");
  const [extractChunks, setExtractChunks] = useState<Record<string, ChunkStatus[]>>({});
  const [extractRunning, setExtractRunning] = useState(false);
  const [materialQuestionCounts, setMaterialQuestionCounts] = useState<Record<string, number>>({});

  // Restore extract chunk progress from localStorage (survives tab switches)
  useEffect(() => {
    const saved = localStorage.getItem("admin-extract-chunks-v1");
    if (saved) {
      try { setExtractChunks(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Persist extract chunks to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(extractChunks).length > 0) {
      localStorage.setItem("admin-extract-chunks-v1", JSON.stringify(extractChunks));
    }
  }, [extractChunks]);

  // Fetch actual question counts from DB per material (ground truth for old sessions)
  useEffect(() => {
    if (materials.length === 0) return;
    Promise.all(
      materials.map(async (m) => {
        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("material_id", m.id);
        return [m.id, count ?? 0] as [string, number];
      })
    ).then((results) => {
      setMaterialQuestionCounts(Object.fromEntries(results));
    });
  }, [materials]);

  const initExtractChunks = (material: Material) => {
    const chunks = splitTextIntoChunks(material.extracted_text);
    setExtractChunks((prev) => ({
      ...prev,
      [material.id]: chunks.map((c, i) => ({ index: i, charCount: c.length, status: "idle", count: 0 })),
    }));
  };

  const resetExtractChunks = (material: Material) => {
    const chunks = splitTextIntoChunks(material.extracted_text);
    setExtractChunks((prev) => ({
      ...prev,
      [material.id]: chunks.map((c, i) => ({ index: i, charCount: c.length, status: "idle", count: 0 })),
    }));
  };

  const doExtractQuestions = async (
    material: Material,
    onlyIdle: boolean,
    currentExtractExamId: string,
    onDone: () => void
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return toast.error("Sesi tidak ditemukan");

    const chunks = splitTextIntoChunks(material.extracted_text);
    const current = extractChunks[material.id] ?? chunks.map((c, i) => ({ index: i, charCount: c.length, status: "idle" as const, count: 0 }));
    const toProcess = onlyIdle
      ? current.filter((cs) => cs.status === "idle" || cs.status === "error")
      : current;

    if (toProcess.length === 0) {
      toast.info("Semua bagian sudah selesai diproses.");
      return;
    }

    setExtractRunning(true);

    for (const cs of toProcess) {
      setExtractChunks((prev) => ({
        ...prev,
        [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "processing" } : c),
      }));
      try {
        const { data, error } = await supabase.functions.invoke("extract-questions", {
          body: { text_chunk: chunks[cs.index], exam_id: currentExtractExamId || undefined, material_id: material.id, category: material.category, topic: material.topic ?? undefined },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error || data?.error) {
          const msg = data?.error ?? error?.message ?? "Gagal";
          setExtractChunks((prev) => ({
            ...prev,
            [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: msg } : c),
          }));
        } else {
          setExtractChunks((prev) => ({
            ...prev,
            [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "done", count: data.count ?? 0, svgCount: data.with_svg ?? 0, errorMsg: undefined } : c),
          }));
        }
      } catch (e: any) {
        const msg = e.message ?? "Error";
        setExtractChunks((prev) => ({
          ...prev,
          [material.id]: prev[material.id].map((c) => c.index === cs.index ? { ...c, status: "error", errorMsg: msg } : c),
        }));
      }
    }

    setExtractRunning(false);
    onDone();
  };

  return {
    extractPanelId, setExtractPanelId,
    extractExamId, setExtractExamId,
    extractChunks, setExtractChunks,
    extractRunning, setExtractRunning,
    materialQuestionCounts, setMaterialQuestionCounts,
    initExtractChunks,
    resetExtractChunks,
    doExtractQuestions,
  };
}
