import { Briefcase, Globe, MonitorSmartphone, ClipboardList, Luggage, UserPlus, HeartHandshake, BookOpen } from "lucide-react";

const categories = [
  { icon: Briefcase, label: "CPNS" },
  { icon: Globe, label: "BUMN" },
  { icon: MonitorSmartphone, label: "PPPK Guru/Dosen" },
  { icon: ClipboardList, label: "Sekolah Kedinasan" },
  { icon: Luggage, label: "PPPK Teknis" },
  { icon: UserPlus, label: "Paket SKB" },
  { icon: HeartHandshake, label: "PPPK Kesehatan" },
  { icon: BookOpen, label: "Ebook Soal" },
];

export const Categories = () => {
  return (
    <section id="kategori" className="border-y border-border bg-secondary/40 py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Kategori Tryout
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Semua Jenis Ujian.{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Satu Platform.
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pilih kategori sesuai targetmu — soal disusun dari arsip ujian resmi bertahun-tahun.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {categories.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <span className="w-full rounded-lg bg-primary px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
