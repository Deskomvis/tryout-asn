import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    wa_number: "6289611777177",
    wa_text: "Halo Admin, saya ingin konsultasi mengenai Ruang CASN.",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("key, value")
          .in("key", ["wa_number", "wa_text"]);

        if (data && data.length > 0) {
          const newSettings = { ...settings };
          data.forEach((item) => {
            if (item.value) {
              newSettings[item.key] = item.value;
            }
          });
          setSettings(newSettings);
        }
      } catch (error) {
        console.error("Error fetching admin settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};
