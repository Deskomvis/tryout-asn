import { cn } from "@/lib/utils";

interface AdminTabBarProps {
  bankView: string;
  setBankView: (view: string) => void;
}

const BANK_VIEW_ITEMS = [
  { value: "list", label: "Daftar Soal" },
  { value: "materi", label: "Materi & Ekstrak" },
  { value: "exam", label: "Per Tryout" },
];

export function AdminTabBar({ bankView, setBankView }: AdminTabBarProps) {
  return (
    <div className="flex gap-1 border-b pb-0">
      {BANK_VIEW_ITEMS.map((item) => (
        <button
          key={item.value}
          onClick={() => setBankView(item.value)}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
            bankView === item.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
