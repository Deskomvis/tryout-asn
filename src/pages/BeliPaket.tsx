import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ExamCard } from "@/components/ExamCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExams } from "@/hooks/useExams";
import { fbq } from "@/lib/metaPixel";
import { SKD_PASSING, SKD_QUESTIONS, SKD_MAX } from "@/lib/skdScoring";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { ExamCategory } from "@/components/admin/ExamCategoryManager";

type Step = { categoryId?: string; subcategory?: string };

const SubcategoryCard = ({ label, onClick, index }: { label: string; onClick: () => void; index: number }) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.04 }}
    whileHover={{ y: -2 }}
    className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-accent/40 p-5 text-left transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Layers className="h-5 w-5" aria-hidden="true" />
    </div>
    <span className="text-base font-semibold text-foreground">{label}</span>
    <span className="absolute right-0 top-0 grid h-12 w-12 place-items-end rounded-bl-3xl bg-primary/90 p-2 text-primary-foreground">
      <ArrowUpRight className="h-4 w-4" />
    </span>
  </motion.button>
);

const BeliPaket = () => {
  const { exams } = useExams();
  const [step, setStep] = useState<Step>({});
  const [search, setSearch] = useState("");
  const [dynamicCategories, setDynamicCategories] = useState<ExamCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get("category") || searchParams.get("cat");

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "exam_categories").maybeSingle();
      if (data?.value) {
        try {
          const ORDER = ['cpns', 'pppk', 'tni-polri', 'kedinasan', 'bumn', 'koperasi'];
          const parsed: ExamCategory[] = JSON.parse(data.value);
          parsed.sort((a, b) => {
            const ai = ORDER.indexOf(a.id.toLowerCase());
            const bi = ORDER.indexOf(b.id.toLowerCase());
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });
          setDynamicCategories(parsed);
        } catch (e) {
          console.error("Failed to parse categories", e);
        }
      }
      setLoadingCats(false);
    };
    fetchCats();
  }, []);

  useEffect(() => {
    if (categoryParam && dynamicCategories.length > 0) {
      const target = categoryParam.toLowerCase();
      const found = dynamicCategories.find(
        (c) =>
          c.name.toLowerCase() === target ||
          c.id.toLowerCase() === target ||
          c.name.toLowerCase().replace("/", "") === target.replace("/", "")
      );
      if (found) {
        setStep({ categoryId: found.id });
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("category");
        newParams.delete("cat");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [categoryParam, dynamicCategories, searchParams, setSearchParams]);

  const activeCategory = dynamicCategories.find((c) => c.id === step.categoryId);

  const matchCategory = (examCategory: string | undefined) => {
    if (!activeCategory || !examCategory) return false;
    const cat = examCategory.toLowerCase();
    return cat === activeCategory.name.toLowerCase() || cat === activeCategory.id.toLowerCase();
  };

  const subcategories = useMemo(() => {
    if (!step.categoryId || !activeCategory) return [];
    const list = exams.filter((e) => matchCategory(e.category));
    const set = new Set<string>();
    list.forEach((e) => { if (e.subcategory) set.add(e.subcategory); });
    return Array.from(set).sort();
  }, [exams, activeCategory]);

  const filteredExams = useMemo(() => {
    if (!step.categoryId || !activeCategory) return [];
    let list = exams.filter((e) => matchCategory(e.category));
    if (step.subcategory) list = list.filter((e) => e.subcategory === step.subcategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  }, [exams, activeCategory, step.subcategory, search]);

  useEffect(() => {
    if (filteredExams.length > 0) {
      fbq.viewContent({
        content_name: `Paket ${step.subcategory ?? activeCategory?.name ?? "Tryout"}`,
        content_ids: filteredExams.map((e) => e.id),
      });
    }
  }, [filteredExams.length, step.subcategory, activeCategory]);

  // Step 1: pick category
  if (!step.categoryId) {
    return (
      <AppLayout>
        <PageHeader title="Pilih Kategori" breadcrumbs={[{ label: "Beli Paket" }]} />
        
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {dynamicCategories.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => setStep({ categoryId: c.id })}
                  className="group w-full text-left bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {/* Image — full, no crop */}
                  <div className="w-full bg-slate-100 overflow-hidden">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full flex items-center justify-center bg-primary/5 text-primary/20 font-bold text-4xl">
                        {c.name[0]}
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-4 border-t border-border">
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description || "Lihat paket tersedia"}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                      Pilih Paket <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
        </div>
      </AppLayout>
    );
  }

  // Step 2: pick subcategory (if available and not yet selected)
  if (!step.subcategory && subcategories.length > 0) {
    return (
      <AppLayout>
        <PageHeader
          title={`Pilih ${activeCategory?.name ?? ""}`}
          breadcrumbs={[
            { label: "Beli Paket", to: "#" },
            { label: activeCategory?.name ?? "" },
          ]}
        />
        <button
          type="button"
          onClick={() => setStep({})}
          className="mb-4 text-sm text-primary hover:underline"
        >
          ← Kembali ke kategori
        </button>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subcategories.map((s, i) => (
            <SubcategoryCard key={s} label={s} index={i} onClick={() => setStep({ ...step, subcategory: s })} />
          ))}
        </div>
      </AppLayout>
    );
  }

  // Step 3: list packages
  return (
    <AppLayout>
      <PageHeader
        title={`Pilih ${step.subcategory ?? activeCategory?.name ?? "Paket"}`}
        breadcrumbs={[
          { label: "Beli Paket", to: "#" },
          ...(activeCategory ? [{ label: activeCategory.name }] : []),
          ...(step.subcategory ? [{ label: step.subcategory }] : []),
        ]}
        actions={
          <Input
            placeholder="Cari"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs rounded-full"
          />
        }
      />
      <button
        type="button"
        onClick={() => (step.subcategory ? setStep({ categoryId: step.categoryId }) : setStep({}))}
        className="mb-4 text-sm text-primary hover:underline"
      >
        ← Kembali
      </button>
      {step.subcategory?.toUpperCase().includes("SKD") && (
        <Alert className="mb-4 border-blue-300 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <span className="font-semibold">Syarat Kelulusan SKD 2026 — </span>
            {SKD_QUESTIONS.total} soal · {Math.floor(6000 / 60)} menit
            <span className="ml-2 text-blue-700">|</span>
            <span className="ml-2">TWK ≥{SKD_PASSING.twk}</span>
            <span className="mx-1 text-blue-400">/</span>
            <span>{SKD_MAX.twk} ({SKD_QUESTIONS.twk} soal)</span>
            <span className="ml-2 text-blue-700">·</span>
            <span className="ml-2">TIU ≥{SKD_PASSING.tiu}</span>
            <span className="mx-1 text-blue-400">/</span>
            <span>{SKD_MAX.tiu} ({SKD_QUESTIONS.tiu} soal)</span>
            <span className="ml-2 text-blue-700">·</span>
            <span className="ml-2">TKP ≥{SKD_PASSING.tkp}</span>
            <span className="mx-1 text-blue-400">/</span>
            <span>{SKD_MAX.tkp} ({SKD_QUESTIONS.tkp} soal)</span>
            <span className="ml-2 text-blue-700">·</span>
            <span className="ml-2 font-medium">Semua subtes harus memenuhi nilai minimal</span>
          </AlertDescription>
        </Alert>
      )}
      {filteredExams.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Belum ada paket pada kategori ini.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((e, i) => <ExamCard key={e.id} exam={e} index={i} mode="buy" />)}
        </div>
      )}
    </AppLayout>
  );
};

export default BeliPaket;
