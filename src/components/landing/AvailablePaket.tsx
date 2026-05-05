import { motion } from "framer-motion";

const pakets = [
  { num: "01", title: "SKD CPNS", desc: "TWK, TIU, TKP — sesuai kisi-kisi resmi BKN terbaru" },
  { num: "02", title: "BUMN", desc: "TKD, TBI, AKHLAK — soal dari rekrutmen BUMN bertahun-tahun" },
  { num: "03", title: "SKB / PPPK Teknis", desc: "Kompetensi teknis spesifik per formasi jabatan" },
  { num: "04", title: "SKB / PPPK Kesehatan", desc: "Soal khusus tenaga kesehatan: dokter, perawat, bidan, dll" },
  { num: "05", title: "Sekolah Kedinasan", desc: "STAN, IPDN, Poltekim, Poltekip — full materi tes" },
  { num: "06", title: "Ebook & Materi", desc: "Rangkuman, tips lulus, dan pembahasan soal lengkap" },
];

export const AvailablePaket = () => {
  return (
    <section id="available-paket" className="py-16 md:py-24">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Available Paket
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Paket Lengkap.{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Hasil Maksimal.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Setiap paket dirancang berdasarkan analisis pola soal ujian 10 tahun terakhir. Kamu tidak sekadar latihan — kamu berlatih dengan strategi yang sudah terbukti meluluskan ribuan peserta.
          </p>
        </motion.div>

        <ul className="flex flex-col">
          {pakets.map((p, i) => (
            <motion.li
              key={p.num}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group flex items-start gap-4 border-b border-border py-5 transition hover:border-primary"
            >
              <span className="font-mono text-2xl font-bold text-primary/40 transition group-hover:text-primary">
                {p.num}
              </span>
              <div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
};

