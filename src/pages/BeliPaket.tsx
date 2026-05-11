import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Layers } from "lucide-react";
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

const categories = [
  { id: "cpns", label: "CPNS", image: "/tryout-cpns.png" },
  { id: "pppk", label: "PPPK", image: "/tryout-pppk.png" },
];

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

  const activeCategory = categories.find((c) => c.id === step.categoryId);

  const subcategories = useMemo(() => {
    if (!step.categoryId) return [];
    const list = exams.filter((e) => e.category === step.categoryId);
    const set = new Set<string>();
    list.forEach((e) => { if (e.subcategory) set.add(e.subcategory); });
    return Array.from(set).sort();
  }, [exams, step.categoryId]);

  const filteredExams = useMemo(() => {
    if (!step.categoryId) return [];
    let list = exams.filter((e) => e.category === step.categoryId);
    if (step.subcategory) list = list.filter((e) => e.subcategory === step.subcategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q));
    }
    return list;
  }, [exams, step, search]);

  useEffect(() => {
    if (filteredExams.length > 0) {
      fbq.viewContent({
        content_name: `Paket ${step.subcategory ?? step.categoryId ?? "Tryout"}`,
        content_ids: filteredExams.map((e) => e.id),
      });
    }
  }, [filteredExams.length, step.subcategory, step.categoryId]);

  // Step 1: pick category
  if (!step.categoryId) {
    return (
      <AppLayout>
        <PageHeader title="Pilih Kategori" breadcrumbs={[{ label: "Beli Paket" }]} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {categories.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => setStep({ categoryId: c.id })}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="group relative overflow-hidden rounded-2xl shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={c.image}
                alt={`Tryout ${c.label}`}
                className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
              />
            </motion.button>
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
          title={`Pilih ${activeCategory?.label ?? ""}`}
          breadcrumbs={[
            { label: "Beli Paket", to: "#" },
            { label: activeCategory?.label ?? "" },
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
        title={`Pilih ${step.subcategory ?? activeCategory?.label ?? "Paket"}`}
        breadcrumbs={[
          { label: "Beli Paket", to: "#" },
          ...(activeCategory ? [{ label: activeCategory.label }] : []),
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
