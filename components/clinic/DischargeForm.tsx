"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileCheck, Loader2, Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "react-hot-toast";
import { Button, Card, Input } from "@/components/ui";
import {
  dischargeSchema,
  type DischargeInput,
} from "@/lib/schemas/clinic/shared";

interface DischargeFormProps {
  patientId: string;
  onSaved?: () => void;
}

export function DischargeForm({ patientId, onSaved }: DischargeFormProps) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DischargeInput>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: {
      patientId,
      summary: "",
      followUp: "",
    },
  });

  const doPrint = () => window.print();

  const doExport = () => {
    const v = getValues();
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Taburcu Özeti", 14, 16);
    doc.setFontSize(11);
    doc.text(`Özet: ${v.summary}`, 14, 28, { maxWidth: 180 });
    if (v.followUp)
      doc.text(`Kontrol: ${v.followUp}`, 14, 56, { maxWidth: 180 });
    doc.save(`discharge-${patientId}.pdf`);
  };

  const submit = async (values: DischargeInput) => {
    try {
      const res = await fetch("/api/clinic/discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error || "İşlem başarısız");
        return;
      }
      toast.success("Taburcu kaydı oluşturuldu");
      reset({ patientId, summary: "", followUp: "" });
      onSaved?.();
    } catch {
      toast.error("Bağlantı hatası");
    }
  };

  return (
    <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck size={18} className="text-[var(--color-primary)]" />
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Taburcu
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={doPrint}
          >
            <Printer size={16} />
            Yazdır
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={doExport}
          >
            <Download size={16} />
            PDF
          </Button>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <Input
          label="Taburcu Özeti"
          className="h-11"
          error={errors.summary?.message}
          {...register("summary")}
        />
        <Input
          label="Kontrol Planı"
          className="h-11"
          error={errors.followUp?.message}
          {...register("followUp")}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-11 rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            Kaydet
          </Button>
        </div>
      </form>
    </Card>
  );
}
