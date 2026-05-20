import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

// Import premium category banners
import cpnsImg from "@/assets/CPNS.png";
import tniPolriImg from "@/assets/TNI POLRI.png";
import pppkImg from "@/assets/PPPK.png";
import kedinasanImg from "@/assets/KEDINASAN.png";
import bumnImg from "@/assets/BUMN.png";

const categories = [
  {
    name: "CPNS",
    image: cpnsImg,
    description: "Simulasi CAT terupdate dengan bank soal terlengkap untuk persiapan seleksi Calon Pegawai Negeri Sipil.",
    tag: "Terpopuler",
    tagColor: "bg-blue-50 text-blue-600 border-blue-100",
    hoverBorder: "hover:border-blue-500/50 hover:shadow-blue-500/5",
    btnColor: "bg-blue-600 hover:bg-blue-700",
    param: "CPNS"
  },
  {
    name: "TNI / POLRI",
    image: tniPolriImg,
    description: "Latihan intensif menghadapi seleksi Taruna AKMIL, AKPOL, Bintara, & Tamtama.",
    tag: "Terbaru",
    tagColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
    hoverBorder: "hover:border-emerald-500/50 hover:shadow-emerald-500/5",
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
    param: "TNI/POLRI"
  },
  {
    name: "PPPK",
    image: pppkImg,
    description: "Paket soal khusus seleksi PPPK Guru, Tenaga Kesehatan, serta Tenaga Teknis.",
    tag: "Rekomendasi",
    tagColor: "bg-teal-50 text-teal-600 border-teal-100",
    hoverBorder: "hover:border-teal-500/50 hover:shadow-teal-500/5",
    btnColor: "bg-teal-600 hover:bg-teal-700",
    param: "PPPK"
  },
  {
    name: "KEDINASAN",
    image: kedinasanImg,
    description: "Sukses seleksi masuk STAN, IPDN, STIS, POLTEKIP, STIN, dan sekolah kedinasan favorit.",
    tag: "Favorit",
    tagColor: "bg-amber-550/10 text-amber-600 border-amber-100",
    hoverBorder: "hover:border-amber-500/50 hover:shadow-amber-500/5",
    btnColor: "bg-amber-600 hover:bg-amber-700",
    param: "KEDINASAN"
  },
  {
    name: "BUMN",
    image: bumnImg,
    description: "Kuasai materi TKD, Tes Akhlak, dan Bahasa Inggris untuk Rekrutmen Bersama BUMN.",
    tag: "Karir BUMN",
    tagColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
    hoverBorder: "hover:border-indigo-500/50 hover:shadow-indigo-500/5",
    btnColor: "bg-indigo-600 hover:bg-indigo-700",
    param: "BUMN"
  }
];

export const Categories = () => {
  return (
    <section id="kategori" className="border-y border-border bg-secondary/40 py-20">
      <div className="container px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground tracking-wide uppercase">
            Kategori Tryout
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Semua Jenis Ujian.{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Satu Platform.
            </span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-muted-foreground">
            Pilih kategori sesuai target impianmu — materi dan soal disusun berdasarkan arsip resmi terpercaya.
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              whileHover={{ y: -6 }}
              className={`group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 ${cat.hoverBorder}`}
            >
              <Link to={`/beli-paket?category=${encodeURIComponent(cat.param)}`} className="flex flex-col h-full justify-between">
                <div>
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 border-b border-border">
                    <img
                      src={cat.image}
                      alt={`Tryout ${cat.name}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Dark gradient overlay for modern photo blending */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
                    
                    {/* Badge */}
                    <span className={`absolute left-3.5 top-3.5 inline-flex items-center gap-1 rounded-full border bg-white/95 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${cat.tagColor}`}>
                      <Sparkles className="h-2.5 w-2.5" />
                      {cat.tag}
                    </span>
                  </div>

                  {/* Content Section */}
                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-black tracking-tight text-foreground transition-colors group-hover:text-primary leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* CTA / Footer Section */}
                <div className="px-5 pb-5 pt-2 flex items-center justify-between text-xs font-bold text-primary">
                  <span className="group-hover:underline">Pilih Paket</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-1 shadow-sm">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
