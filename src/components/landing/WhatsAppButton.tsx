import { MessageCircle } from "lucide-react";
import { useAdminSettings } from "@/hooks/useAdminSettings";

export const WhatsAppButton = () => {
  const { settings, loading } = useAdminSettings();

  if (loading) return null;

  return (
    <a
      href={`https://wa.me/${settings.wa_number}?text=${encodeURIComponent(settings.wa_text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142_70%_45%)] text-white shadow-lg transition-transform hover:scale-110"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
};
