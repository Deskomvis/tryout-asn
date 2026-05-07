import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const CtaBanner = () => {
  return (
    <section className="container py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-2xl px-6 py-12 text-center text-primary-foreground sm:px-10 md:px-16 md:py-14"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Siap memulai persiapan ujianmu?</h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
          Bergabung dengan 10.000+ alumni yang sudah merasakan manfaatnya. Daftar sekarang.
        </p>
        <Button size="lg" variant="secondary" className="mt-6" asChild>
          <a href="#available-paket">
            Daftar Sekarang <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </motion.div>
    </section>
  );
};
