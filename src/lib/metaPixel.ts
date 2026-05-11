declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

let _pixelId: string | null = null;

export function initMetaPixel(pixelId: string) {
  if (!pixelId || typeof window === "undefined") return;
  if (_pixelId === pixelId) return;
  _pixelId = pixelId;

  if (window.fbq) {
    window.fbq("init", pixelId);
    return;
  }

  const n: any = function (...args: any[]) {
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  };
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq("init", pixelId);
}

function call(method: "track" | "trackCustom", event: string, data?: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(method, event, data);
  }
}

export const fbq = {
  pageView: () => call("track", "PageView"),
  viewContent: (data?: { content_name?: string; content_ids?: string[]; value?: number; currency?: string }) =>
    call("track", "ViewContent", data),
  initiateCheckout: (data?: { content_ids?: string[]; value?: number; currency?: string; num_items?: number }) =>
    call("track", "InitiateCheckout", data),
  purchase: (data: { value: number; currency: string; content_ids?: string[]; content_name?: string }) =>
    call("track", "Purchase", data),
  lead: (data?: { content_name?: string }) => call("track", "Lead", data),
  completeRegistration: (data?: { content_name?: string; status?: boolean }) =>
    call("track", "CompleteRegistration", data),
  search: (data?: { search_string?: string }) => call("track", "Search", data),
  custom: (event: string, data?: Record<string, any>) => call("trackCustom", event, data),
};
