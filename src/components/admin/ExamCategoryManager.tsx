import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Loader2, Check, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExamCategory = {
  id: string;
  name: string;          // e.g. "CPNS", "PPPK"
  image_url: string;     // public URL
  description: string;
};

const DEFAULT_CATEGORIES: ExamCategory[] = [
  {
    id: "cpns",
    name: "CPNS",
    image_url: "/CPNS.png",
    description: "Calon Pegawai Negeri Sipil",
  },
  {
    id: "tni-polri",
    name: "TNI/POLRI",
    image_url: "/TNI_POLRI.png",
    description: "Taruna, Bintara & Tamtama",
  },
  {
    id: "pppk",
    name: "PPPK",
    image_url: "/PPPK.png",
    description: "Pegawai Pemerintah dengan Perjanjian Kerja",
  },
  {
    id: "kedinasan",
    name: "KEDINASAN",
    image_url: "/KEDINASAN.png",
    description: "Sekolah Kedinasan (STAN, IPDN, STIS, dll)",
  },
  {
    id: "bumn",
    name: "BUMN",
    image_url: "/BUMN.png",
    description: "Rekrutmen Bersama BUMN",
  },
];

const SETTING_KEY = "exam_categories";

type Props = {
  onSelectCategory: (categoryName: string) => void;
  selectedCategory: string | null;
};

export const ExamCategoryManager = ({ onSelectCategory, selectedCategory }: Props) => {
  const [categories, setCategories] = useState<ExamCategory[]>(DEFAULT_CATEGORIES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExamCategory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCat, setNewCat] = useState<Omit<ExamCategory, "id">>({ name: "", image_url: "", description: "" });
  const [addingImg, setAddingImg] = useState(false);
  const editImgRef = useRef<HTMLInputElement>(null);
  const addImgRef = useRef<HTMLInputElement>(null);

  // Load from DB
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
      if (data?.value) {
        try { setCategories(JSON.parse(data.value)); } catch { /* use defaults */ }
      }
    })();
  }, []);

  const persist = async (cats: ExamCategory[]) => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").upsert({ key: SETTING_KEY, value: JSON.stringify(cats) }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error("Gagal simpan: " + error.message); return false; }
    return true;
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `category-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) { toast.error("Gagal upload: " + error.message); return null; }
    const { data } = supabase.storage.from("question-images").getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Edit ──
  const startEdit = (cat: ExamCategory) => { setEditingId(cat.id); setEditForm({ ...cat }); };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !editForm) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) setEditForm({ ...editForm, image_url: url });
  };

  const saveEdit = async () => {
    if (!editForm || !editForm.name.trim()) return toast.error("Nama kategori wajib diisi");
    const updated = categories.map(c => c.id === editingId ? editForm : c);
    const ok = await persist(updated);
    if (ok) { setCategories(updated); cancelEdit(); toast.success("Kategori diperbarui"); }
  };

  // ── Add ──
  const handleAddImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAddingImg(true);
    const url = await uploadImage(file);
    setAddingImg(false);
    if (url) setNewCat(prev => ({ ...prev, image_url: url }));
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) return toast.error("Nama kategori wajib diisi");
    const cat: ExamCategory = {
      id: Date.now().toString(),
      name: newCat.name.trim(),
      image_url: newCat.image_url,
      description: newCat.description,
    };
    const updated = [...categories, cat];
    const ok = await persist(updated);
    if (ok) {
      setCategories(updated);
      setNewCat({ name: "", image_url: "", description: "" });
      setShowAddForm(false);
      toast.success("Kategori ditambahkan");
    }
  };

  // ── Delete ──
  const deleteCategory = async (id: string) => {
    if (!confirm("Hapus kategori ini? Paket tryout di dalamnya tidak akan terhapus.")) return;
    const updated = categories.filter(c => c.id !== id);
    const ok = await persist(updated);
    if (ok) { setCategories(updated); toast.success("Kategori dihapus"); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Kategori Paket Tryout</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Klik kategori untuk menampilkan paket di bawahnya</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm ? "Batal" : "Tambah Kategori"}
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {categories.map(cat => (
          editingId === cat.id ? (
            // ── Edit mode card ──
            <div key={cat.id} className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 rounded-xl border border-primary bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Edit Kategori: {cat.name}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nama Kategori *</Label>
                  <Input value={editForm?.name ?? ""} onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Deskripsi</Label>
                  <Input value={editForm?.description ?? ""} onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Gambar Kategori</Label>
                <div className="flex items-center gap-3">
                  {editForm?.image_url && (
                    <img src={editForm.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border" />
                  )}
                  <div>
                    <input type="file" accept="image/*" ref={editImgRef} className="hidden" onChange={handleEditImageUpload} />
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => editImgRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      {uploading ? "Mengupload..." : "Upload Gambar"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1">JPG/PNG/WEBP — maks. 2MB</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={cancelEdit}>Batal</Button>
              </div>
            </div>
          ) : (
            // ── Display card ──
            <div
              key={cat.id}
              className={cn(
                "relative group rounded-xl border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                selectedCategory === cat.name && "border-primary ring-2 ring-primary/30 bg-primary/5"
              )}
              onClick={() => onSelectCategory(selectedCategory === cat.name ? "" : cat.name)}
            >
              {/* Image */}
              <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-accent overflow-hidden">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-black text-primary/20">{cat.name[0]}</div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="font-bold text-sm leading-tight">{cat.name}</p>
                {cat.description && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{cat.description}</p>}
              </div>
              {/* Selected badge */}
              {selectedCategory === cat.name && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                  Dipilih
                </div>
              )}
              {/* Action buttons — appear on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-accent transition-colors"
                  onClick={() => startEdit(cat)}
                  title="Edit kategori"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-red-600 shadow hover:bg-red-50 transition-colors"
                  onClick={() => deleteCategory(cat.id)}
                  title="Hapus kategori"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Selected category indicator */}
      {selectedCategory && (
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <ChevronRight className="h-4 w-4" />
          Menampilkan paket kategori: <span className="bg-primary/10 px-2 py-0.5 rounded-full">{selectedCategory}</span>
          <button className="text-muted-foreground hover:text-foreground text-xs ml-auto" onClick={() => onSelectCategory("")}>Lihat semua paket</button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Tambah Kategori Baru</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nama Kategori *</Label>
              <Input placeholder="cth: BUMN, POLRI..." value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi</Label>
              <Input placeholder="cth: Badan Usaha Milik Negara" value={newCat.description} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Gambar Kategori</Label>
            <div className="flex items-center gap-3">
              {newCat.image_url && (
                <img src={newCat.image_url} alt="" className="h-16 w-16 rounded-lg object-cover border" />
              )}
              <div>
                <input type="file" accept="image/*" ref={addImgRef} className="hidden" onChange={handleAddImageUpload} />
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => addImgRef.current?.click()} disabled={addingImg}>
                  {addingImg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {addingImg ? "Mengupload..." : "Upload Gambar"}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">Opsional — JPG/PNG/WEBP</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={addCategory} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {saving ? "Menyimpan..." : "Tambah Kategori"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAddForm(false); setNewCat({ name: "", image_url: "", description: "" }); }}>Batal</Button>
          </div>
        </div>
      )}
    </div>
  );
};
