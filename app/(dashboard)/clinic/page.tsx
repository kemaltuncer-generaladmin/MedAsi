"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Bed,
  Beaker,
  Pill,
  FileCheck,
  Search,
  Filter,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "react-hot-toast";
import {
  PatientCard,
  PatientForm,
  LabRequestForm,
  PrescriptionForm,
  DischargeForm,
  NoteEditor,
  ServiceForm,
  ServiceBoard,
  ConfirmModal,
} from "@/components/clinic";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  complaint: string;
  diagnosis?: string;
  status: "active" | "discharged";
  createdAt: string;
};

type Tab =
  | "patients"
  | "labs"
  | "service"
  | "prescriptions"
  | "discharge"
  | "notes";

export default function ClinicPage() {
  const [tab, setTab] = useState<Tab>("patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "discharged"
  >("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      const res = await fetch("/api/clinic/patients");
      const json = await res.json();
      const rows = json?.data || [];
      setPatients(rows);
      const firstId = rows[0]?.id;
      if (firstId) {
        setSelectedPatientId((prev) => prev || firstId);
      }
    };

    void loadPatients();
  }, [refreshKey]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = search.toLowerCase();
      const searchOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.complaint.toLowerCase().includes(q) ||
        (p.diagnosis || "").toLowerCase().includes(q);
      const statusOk = statusFilter === "all" || p.status === statusFilter;
      return searchOk && statusOk;
    });
  }, [patients, search, statusFilter]);

  const deletePatient = (id: string) => {
    setDeleteTarget(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePatient = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/clinic/patients?id=${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Silme başarısız");
        return;
      }
      if (selectedPatientId === deleteTarget) setSelectedPatientId("");
      setRefreshKey((x) => x + 1);
      toast.success("Hasta silindi");
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, selectedPatientId]);

  const printPatient = (patient: Patient) => {
    const doc = `
      <html><head><title>${patient.name}</title></head><body>
      <h2>${patient.name}</h2>
      <p>Yaş: ${patient.age}</p>
      <p>Cinsiyet: ${patient.gender}</p>
      <p>Şikayet: ${patient.complaint}</p>
      <p>Tanı: ${patient.diagnosis || "-"}</p>
      <p>Durum: ${patient.status}</p>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(doc);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <Card variant="bordered" className="rounded-xl p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--color-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Klinik Yönetimi
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tab === "patients" ? "primary" : "ghost"}
              className="h-11"
              onClick={() => setTab("patients")}
            >
              <UserPlus size={16} />
              Hastalar
            </Button>
            <Button
              variant={tab === "labs" ? "primary" : "ghost"}
              className="h-11"
              onClick={() => setTab("labs")}
            >
              <Beaker size={16} />
              Lab
            </Button>
            <Button
              variant={tab === "service" ? "primary" : "ghost"}
              className="h-11"
              onClick={() => setTab("service")}
            >
              <Bed size={16} />
              Servis
            </Button>
            <Button
              variant={tab === "prescriptions" ? "primary" : "ghost"}
              className="h-11"
              onClick={() => setTab("prescriptions")}
            >
              <Pill size={16} />
              Reçete
            </Button>
            <Button
              variant={tab === "discharge" ? "primary" : "ghost"}
              className="h-11"
              onClick={() => setTab("discharge")}
            >
              <FileCheck size={16} />
              Taburcu
            </Button>
            <Button
              variant={tab === "notes" ? "primary" : "ghost"}
              className="h-11"
              onClick={() => setTab("notes")}
            >
              Notlar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              placeholder="Hasta ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
          <div className="relative">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <select
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-3 text-[var(--color-text-primary)]"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "discharged",
                )
              }
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="discharged">Taburcu</option>
            </select>
          </div>
        </div>
      </Card>

      {tab === "patients" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <PatientForm onSaved={() => setRefreshKey((x) => x + 1)} />
          <Card variant="bordered" className="rounded-xl p-6">
            {!filteredPatients.length ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
                Hasta kaydı bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <PatientCard
                      patient={patient}
                      onEdit={(p) => setSelectedPatientId(p.id)}
                      onDelete={deletePatient}
                      onPrint={printPatient}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "labs" ? (
        selectedPatientId ? (
          <LabRequestForm patientId={selectedPatientId} />
        ) : (
          <Card
            variant="bordered"
            className="rounded-xl p-8 text-sm text-[var(--color-text-secondary)]"
          >
            Önce hasta seç.
          </Card>
        )
      ) : null}

      {tab === "service" ? (
        selectedPatientId ? (
          <div className="space-y-6">
            <ServiceForm patientId={selectedPatientId} />
            <ServiceBoard patientId={selectedPatientId} />
          </div>
        ) : (
          <Card
            variant="bordered"
            className="rounded-xl p-8 text-sm text-[var(--color-text-secondary)]"
          >
            Önce hasta seç.
          </Card>
        )
      ) : null}

      {tab === "prescriptions" ? (
        selectedPatientId ? (
          <PrescriptionForm patientId={selectedPatientId} />
        ) : (
          <Card
            variant="bordered"
            className="rounded-xl p-8 text-sm text-[var(--color-text-secondary)]"
          >
            Önce hasta seç.
          </Card>
        )
      ) : null}

      {tab === "discharge" ? (
        selectedPatientId ? (
          <DischargeForm patientId={selectedPatientId} />
        ) : (
          <Card
            variant="bordered"
            className="rounded-xl p-8 text-sm text-[var(--color-text-secondary)]"
          >
            Önce hasta seç.
          </Card>
        )
      ) : null}

      {tab === "notes" ? (
        selectedPatientId ? (
          <NoteEditor patientId={selectedPatientId} />
        ) : (
          <Card
            variant="bordered"
            className="rounded-xl p-8 text-sm text-[var(--color-text-secondary)]"
          >
            Önce hasta seç.
          </Card>
        )
      ) : null}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Silme Onayı"
        description="Hastayı silmek istediğine emin misin? Bu işlem geri alınamaz."
        variant="destructive"
        confirmLabel="Sil"
        onConfirm={confirmDeletePatient}
      />
    </div>
  );
}
