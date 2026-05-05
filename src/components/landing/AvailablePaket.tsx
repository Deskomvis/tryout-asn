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
    <section id="available-paket" className="py-20">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
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
        </div>

        <ul className="flex flex-col">
          {pakets.map((p) => (
            <li
              key={p.num}
              className="group flex items-start gap-4 border-b border-border py-5 transition hover:border-primary"
            >
              <span className="font-mono text-2xl font-bold text-primary/40 transition group-hover:text-primary">
                {p.num}
              </span>
              <div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
