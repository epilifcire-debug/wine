import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedAvatar } from "@/lib/queries";
import { maskTelefone, erroTelefone } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "time" | "number" | "email" | "select" | "image";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  mask?: "telefone";
};

export function RecordDialog({
  title,
  fields,
  initial,
  trigger,
  submitLabel = "Salvar",
  onSubmit,
}: {
  title: string;
  fields: FieldSpec[];
  initial?: Record<string, any>;
  trigger: ReactNode;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(initial ?? {});
  const [busy, setBusy] = useState(false);

  function set(name: string, value: any) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const telField = fields.find((f) => f.mask === "telefone");
    if (telField) {
      const erro = erroTelefone(values[telField.name]);
      if (erro) {
        toast.error(erro);
        return;
      }
    }
    setBusy(true);
    try {
      await onSubmit(values);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValues(initial ?? {});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  required={f.required}
                  maxLength={f.maxLength ?? 4000}
                  placeholder={f.placeholder}
                  rows={3}
                />
              ) : f.type === "select" ? (
                <select
                  id={f.name}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  required={f.required}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Selecione…</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "image" ? (
                <ImageField value={values[f.name]} onChange={(v) => set(f.name, v)} />
              ) : (
                <Input
                  id={f.name}
                  type={f.type ?? "text"}
                  value={values[f.name] ?? ""}
                  onChange={(e) =>
                    set(
                      f.name,
                      f.type === "number"
                        ? Number(e.target.value)
                        : f.mask === "telefone"
                          ? maskTelefone(e.target.value)
                          : e.target.value,
                    )
                  }
                  required={f.required}
                  maxLength={f.mask === "telefone" ? 14 : (f.maxLength ?? 255)}
                  inputMode={f.mask === "telefone" ? "numeric" : undefined}
                  placeholder={f.mask === "telefone" ? "(99)99999-9999" : f.placeholder}
                  aria-invalid={f.mask === "telefone" && Boolean(erroTelefone(values[f.name]))}
                />
              )}
              {f.mask === "telefone" && erroTelefone(values[f.name]) ? (
                <p className="text-[11px] leading-snug text-destructive">
                  {erroTelefone(values[f.name])}
                </p>
              ) : null}
            </div>
          ))}

          <DialogFooter>
            <Button type="submit" disabled={busy} className="w-full">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImageField({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ativo = true;
    signedAvatar(value).then((url) => {
      if (ativo) setPreview(url);
    });
    return () => {
      ativo = false;
    };
  }, [value]);

  async function enviar(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `alunos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar a foto.");
      return;
    }
    onChange(path);
    toast.success("Foto enviada.");
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-surface-2">
        {preview ? (
          <img src={preview} alt="Foto do aluno" className="size-full object-cover" />
        ) : (
          <Camera className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Enviando…" : preview ? "Trocar foto" : "Enviar foto"}
        </Button>
        {preview ? (
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline"
            onClick={() => onChange("")}
          >
            Remover
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
