import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Shield, AlertTriangle, CheckCircle, Pencil } from "lucide-react";
import ClientSelect from "@/components/selects/ClientSelect";
import ProjectSelect from "@/components/selects/ProjectSelect";
import {
  enrichRecordRelations,
  toClientFields,
  toProjectFields,
} from "@/lib/firestoreQueries";

const STATUSES = ["Active", "Expiring Soon", "Expired", "Renewed", "Cancelled"];
const emptyAMC = {
  client_id: "",
  client_name: "",
  project_id: "",
  project_name: "",
  contract_number: "",
  amount: "",
  start_date: "",
  end_date: "",
  status: "Active",
  coverage: "",
  support_hours: "",
  used_hours: 0,
  notes: "",
};

export default function AMC() {
  const { userProfile, role } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyAMC);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const canManageContracts = ["admin", "project_manager"].includes(role);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const clientId = userProfile?.client_id || userProfile?.clientId || "";
      const contractQuery =
        role === "client" && clientId
          ? query(
              collection(db, "amcContracts"),
              where("client_id", "==", clientId),
            )
          : collection(db, "amcContracts");
      const clientQuery =
        role === "client" && clientId
          ? query(
              collection(db, "clients"),
              where(documentId(), "==", clientId),
            )
          : collection(db, "clients");
      const projectQuery =
        role === "client" && clientId
          ? query(
              collection(db, "projects"),
              where("client_id", "==", clientId),
            )
          : collection(db, "projects");
      const [contractsSnap, clientsSnap, projectsSnap] = await Promise.all([
        getDocs(contractQuery),
        getDocs(clientQuery),
        getDocs(projectQuery),
      ]);

      const clientData = clientsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const projectData = projectsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setClients(clientData);
      setProjects(projectData);
      setContracts(
        contractsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .map((c) =>
            enrichRecordRelations(c, {
              projects: projectData,
              clients: clientData,
            }),
          ),
      );
    } catch (error) {
      console.error("Error loading AMC data:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canManageContracts) {
      toast({
        title: "You do not have permission to manage AMC contracts",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      amount: Number(form.amount),
      support_hours: form.support_hours
        ? Number(form.support_hours)
        : undefined,
      used_hours: Number(form.used_hours),
    };
    if (!payload.contract_number)
      payload.contract_number = `AMC-${Date.now().toString().slice(-6)}`;
    if (editingId) {
      await updateDoc(doc(db, "amcContracts", editingId), payload);
    } else {
      await addDoc(collection(db, "amcContracts"), payload);
    }
    toast({ title: editingId ? "Contract updated" : "Contract created" });
    setDialogOpen(false);
    setForm(emptyAMC);
    setEditingId(null);
    setSaving(false);
    loadData();
  };

  const activeCount = contracts.filter((c) => c.status === "Active").length;
  const expiringCount = contracts.filter(
    (c) => c.status === "Expiring Soon",
  ).length;
  const totalValue = contracts
    .filter((c) => c.status === "Active")
    .reduce((s, c) => s + (c.amount || 0), 0);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AMC Contracts"
        description="Manage annual maintenance contracts"
        actions={
          canManageContracts ? (
            <Button
              onClick={() => {
                setForm(emptyAMC);
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Contract
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Contracts"
          value={activeCount}
          icon={CheckCircle}
        />
        <StatCard
          title="Expiring Soon"
          value={expiringCount}
          icon={AlertTriangle}
        />
        <StatCard
          title="Active Value"
          value={`₹${totalValue.toLocaleString("en-IN")}`}
          icon={Shield}
        />
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No AMC contracts"
          description="Create your first annual maintenance contract"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((amc) => {
            const hoursPct = amc.support_hours
              ? Math.round(((amc.used_hours || 0) / amc.support_hours) * 100)
              : 0;
            return (
              <div
                key={amc.id}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-sm">
                      {amc.contract_number}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {amc.client_name} · {amc.project_name}
                    </p>
                  </div>
                  <StatusBadge status={amc.status} />
                </div>
                <p className="text-lg font-bold mb-2">
                  ₹{(amc.amount || 0).toLocaleString("en-IN")}
                </p>
                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                  <p>
                    {amc.start_date} → {amc.end_date}
                  </p>
                  {amc.coverage && <p>Coverage: {amc.coverage}</p>}
                </div>
                {amc.support_hours > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Support Hours
                      </span>
                      <span>
                        {amc.used_hours || 0}/{amc.support_hours}h
                      </span>
                    </div>
                    <Progress value={hoursPct} className="h-1.5" />
                  </div>
                )}
                {canManageContracts && (
                  <div className="flex justify-end pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const clientFields = toClientFields(amc, clients);
                        const projectFields = toProjectFields(amc, projects);
                        setForm({
                          ...emptyAMC,
                          ...amc,
                          ...clientFields,
                          ...projectFields,
                          amount: amc.amount || "",
                          support_hours: amc.support_hours || "",
                        });
                        setEditingId(amc.id);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Contract" : "New AMC Contract"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ClientSelect
                clients={clients}
                value={form.client_id}
                displayName={form.client_name}
                onValueChange={({ client_id, client_name }) =>
                  setForm({ ...form, client_id, client_name })
                }
                required
              />
              <ProjectSelect
                projects={projects}
                value={form.project_id}
                displayName={form.project_name}
                onValueChange={({ project_id, project_name }) =>
                  setForm({ ...form, project_id, project_name })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Number</Label>
                <Input
                  value={form.contract_number}
                  onChange={(e) =>
                    setForm({ ...form, contract_number: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Support Hours</Label>
                <Input
                  type="number"
                  value={form.support_hours}
                  onChange={(e) =>
                    setForm({ ...form, support_hours: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Used Hours</Label>
                <Input
                  type="number"
                  value={form.used_hours}
                  onChange={(e) =>
                    setForm({ ...form, used_hours: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Coverage</Label>
              <Input
                value={form.coverage}
                onChange={(e) => setForm({ ...form, coverage: e.target.value })}
                placeholder="e.g., Bug fixes, security patches"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={
                saving ||
                !form.client_id ||
                !form.project_id ||
                !form.amount ||
                !form.start_date ||
                !form.end_date
              }
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
