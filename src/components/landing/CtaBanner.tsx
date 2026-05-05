import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CtaBanner = () => {
  return (
    <section className="container py-16">
      <div
        className="overflow-hidden rounded-2xl px-8 py-14 text-center text-primary-foreground md:px-16"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Siap memulai persiapan ujianmu?</h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
          Bergabung dengan 10.000+ siswa yang sudah merasakan manfaatnya. Daftar gratis sekarang.
        </p>
        <Button size="lg" variant="secondary" className="mt-6" asChild>
          <a href="#paket">
            Daftar Sekarang <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
};
