"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pill, Loader2, Plus, Trash2, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "react-hot-toast";
import { Button, Card, Input } from "@/components/ui";
import {
  prescriptionSchema,
  type PrescriptionInput,
} from "@/lib/schemas/clinic/shared";

interface PrescriptionFormProps {
  patientId: string;
  onSaved?: () => void;
}

export function PrescriptionForm({
  patientId,
  onSaved,
}: PrescriptionFormProps) {
  const {
    control,
    register,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
    reset,
  } = useForm<PrescriptionInput>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientId,
      medications: [{ name: "", dosage: "", frequency: "", duration: "" }],
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medications",
  });

  const doPrint = () => window.print();

  const doExport = () => {
    const values = getValues();
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Reçete", 14, 16);
    let y = 28;
    values.medications.forEach((m, i) => {
      doc.setFontSize(11);
      doc.text(
        `${i + 1}. ${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration}`,
        14,
        y,
      );
      y += 8;
    });
    if (values.note) doc.text(`Not: ${values.note}`, 14, y + 4);
    doc.save(`prescription-${patientId}.pdf`);
  };

  const submit = async (values: PrescriptionInput) => {
    try {
      const cleaned = {
        ...values,
        medications: values.medications.filter(
          (m) => m.name && m.dosage && m.frequency && m.duration,
        ),
      };
      const res = await fetch("/api/clinic/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error || "Kayıt başarısız");
        return;
      }
      toast.success("Reçete kaydedildi");
      reset({
        patientId,
        medications: [{ name: "", dosage: "", frequency: "", duration: "" }],
        note: "",
      });
      onSaved?.();
    } catch {
      toast.error("Bağlantı hatası");
    }
  };

  return (
    <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill size={18} className="text-[var(--color-primary)]" />
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Reçete
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
        {fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Input
              className="h-11"
              placeholder="İlaç"
              {...register(`medications.${i}.name` as const)}
            />
            <Input
              className="h-11"
              placeholder="Doz"
              {...register(`medications.${i}.dosage` as const)}
            />
            <Input
              className="h-11"
              placeholder="Sıklık"
              {...register(`medications.${i}.frequency` as const)}
            />
            <div className="flex gap-2">
              <Input
                className="h-11"
                placeholder="Süre"
                {...register(`medications.${i}.duration` as const)}
              />
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => remove(i)}
                disabled={fields.length === 1}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={() =>
            append({ name: "", dosage: "", frequency: "", duration: "" })
          }
        >
          <Plus size={16} />
          İlaç Ekle
        </Button>

        <Input className="h-11" placeholder="Not" {...register("note")} />

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
