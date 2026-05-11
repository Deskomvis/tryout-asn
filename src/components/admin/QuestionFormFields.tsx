import { useRef } from "react";
import { Image, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type QuestionFormValue = {
  question_text: string;
  a: string; b: string; c: string; d: string; e: string;
  correct: string;
  subtest: string;
  pa: number; pb: number; pc: number; pd: number; pe: number;
  explanation: string;
  image_url: string;
  topic: string;
};

interface QuestionFormFieldsProps {
  value: QuestionFormValue;
  onChange: (patch: Partial<QuestionFormValue>) => void;
  imageFile: File | null;
  onImageFileChange: (f: File | null) => void;
  /** show topic field */
  showTopic?: boolean;
  /** show image upload section */
  showImage?: boolean;
  /** full subtest label (e.g. "TWK — Tes Wawasan Kebangsaan") vs short ("TWK") */
  longSubtestLabel?: boolean;
}

export function QuestionFormFields({
  value,
  onChange,
  imageFile,
  onImageFileChange,
  showTopic = true,
  showImage = true,
  longSubtestLabel = false,
}: QuestionFormFieldsProps) {
  const imgRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div>
        <Label>Subtes</Label>
        <Select value={value.subtest} onValueChange={(v) => onChange({ subtest: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="twk">{longSubtestLabel ? "TWK — Tes Wawasan Kebangsaan" : "TWK"}</SelectItem>
            <SelectItem value="tiu">{longSubtestLabel ? "TIU — Tes Intelegensia Umum" : "TIU"}</SelectItem>
            <SelectItem value="tkp">{longSubtestLabel ? "TKP — Tes Karakteristik Pribadi (poin 1–5)" : "TKP"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showTopic && (
        <div>
          <Label>Topik <span className="text-muted-foreground text-xs">(opsional)</span></Label>
          <Input
            value={value.topic}
            onChange={(e) => onChange({ topic: e.target.value })}
            placeholder="cth: Pancasila, Analogi Verbal, Pelayanan Publik..."
          />
        </div>
      )}

      {showImage && (
        <div className="rounded border border-dashed border-border p-3 space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Image className="h-4 w-4" /> Gambar Soal (Opsional)
          </Label>
          <input
            ref={imgRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageFileChange(f); }}
          />
          <div className="flex gap-2 items-center flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {imageFile ? imageFile.name : "Upload Gambar"}
            </Button>
            {(imageFile || value.image_url) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { onImageFileChange(null); onChange({ image_url: "" }); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Hapus
              </Button>
            )}
          </div>
          {imageFile && (
            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="max-h-32 rounded border object-contain" />
          )}
          {!imageFile && value.image_url && (
            <img src={value.image_url} alt="Gambar saat ini" className="max-h-32 rounded border object-contain" />
          )}
        </div>
      )}

      <div>
        <Label>Pertanyaan</Label>
        <Textarea value={value.question_text} onChange={(e) => onChange({ question_text: e.target.value })} rows={3} />
      </div>

      {(["a", "b", "c", "d", "e"] as const).map((k) => (
        <div key={k} className="grid grid-cols-[1fr_80px] gap-2 items-end">
          <div>
            <Label>Opsi {k.toUpperCase()}{k === "e" ? " (opsional)" : ""}</Label>
            <Input value={(value as any)[k]} onChange={(e) => onChange({ [k]: e.target.value } as any)} />
          </div>
          {value.subtest === "tkp" && (
            <div>
              <Label>Poin</Label>
              <Input
                type="number" min={1} max={5}
                value={(value as any)["p" + k]}
                onChange={(e) => onChange({ ["p" + k]: Math.max(1, Math.min(5, +e.target.value)) } as any)}
              />
            </div>
          )}
        </div>
      ))}

      {value.subtest !== "tkp" && (
        <div>
          <Label>Jawaban Benar (ketik persis sama dengan opsi)</Label>
          <Input value={value.correct} onChange={(e) => onChange({ correct: e.target.value })} />
        </div>
      )}

      <div>
        <Label>Pembahasan / Penjelasan Jawaban</Label>
        <Textarea
          value={value.explanation}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Tuliskan penjelasan singkat mengapa jawaban tersebut benar..."
          rows={2}
        />
      </div>
    </>
  );
}
