// Configuration for admin contact and platform-wide constants.
// Ganti nomor WhatsApp dengan nomor admin Anda (format internasional tanpa +).
export const ADMIN_WHATSAPP = "6289611777177";

export const buildTopupWhatsAppUrl = (params: {
  amount: number;
  userName: string;
  userEmail: string;
  requestId: string;
  waNumber?: string;
}) => {
  const text =
    `Halo Admin Ruang CASN,\n\n` +
    `Saya ingin topup saldo point:\n` +
    `• Nama: ${params.userName}\n` +
    `• Email: ${params.userEmail}\n` +
    `• Nominal: ${params.amount.toLocaleString("id-ID")} point (Rp ${params.amount.toLocaleString("id-ID")})\n` +
    `• ID Permintaan: ${params.requestId}\n\n` +
    `Mohon konfirmasi rekening pembayaran. Terima kasih.`;
  return `https://wa.me/${params.waNumber || ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
};
