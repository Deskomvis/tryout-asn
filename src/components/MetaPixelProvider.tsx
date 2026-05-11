import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initMetaPixel, fbq } from "@/lib/metaPixel";

export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const initialized = useRef(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "meta_pixel_id")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) initMetaPixel(data.value);
      });
  }, []);

  // Track PageView on every route change (skip the very first — initMetaPixel fires PageView on init)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    fbq.pageView();
  }, [location.pathname]);

  return <>{children}</>;
}
