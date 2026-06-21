import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
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
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  FileText,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  Pencil,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import ClientSelect from "@/components/selects/ClientSelect";
import ProjectSelect from "@/components/selects/ProjectSelect";
import {
  enrichRecordRelations,
  toClientFields,
  toProjectFields,
} from "@/lib/firestoreQueries";
import { sendEmailViaEmailJS, logEmailMessage } from "@/lib/emailService";

const STATUSES = [
  "Draft",
  "Sent",
  "Paid",
  "Partially Paid",
  "Overdue",
  "Cancelled",
];

const BILLING_TYPES = ["Fixed Milestone", "Monthly Retainer", "Hourly"];

const INVOICES_COLLECTION = "invoices";
const CLIENTS_COLLECTION = "clients";
const PROJECTS_COLLECTION = "projects";

const emptyInvoice = {
  invoice_number: "",
  client_id: "",
  client_name: "",
  project_id: "",
  project_name: "",
  billing_type: "Fixed Milestone",
  amount: "",
  tax_rate: 18,
  tax_amount: 0,
  total_amount: "",
  status: "Draft",
  due_date: "",
  paid_amount: 0,
  notes: "",
};

// Real invoice email sender helper
const triggerInvoiceStatusEmail = async (invoice, clients) => {
  try {
    const client = clients.find((c) => c.id === invoice.client_id);
    if (!client || !client.email) {
      console.warn("Skipping email: Client email not found.");
      return;
    }

    let subject = "";
    let body = "";

    if (invoice.status === "Sent") {
      subject = `Invoice Generated — ${invoice.invoice_number}`;
      body = `Dear ${client.name || client.company || "Client"},\n\nWe have generated invoice ${invoice.invoice_number} for the project "${invoice.project_name || "Project"}" in the amount of ${formatCurrency(invoice.total_amount || invoice.amount || 0)} (including applicable taxes). The payment due date is ${invoice.due_date || "due date"}. Please find the invoice details in your dashboard.\n\nBest regards,\nCrownridge LLP`;
    } else if (invoice.status === "Paid") {
      subject = `Payment Confirmation: Invoice ${invoice.invoice_number}`;
      body = `Dear ${client.name || client.company || "Client"},\n\nWe have received your payment of ${formatCurrency(invoice.paid_amount || invoice.total_amount || invoice.amount || 0)} for invoice ${invoice.invoice_number} associated with project "${invoice.project_name || "Project"}". Thank you for your business!\n\nBest regards,\nCrownridge LLP`;
    } else {
      return; // Only notify on Sent or Paid
    }

    await sendEmailViaEmailJS({
      to_email: client.email,
      subject,
      message: body,
    });

    await logEmailMessage({
      to_email: client.email,
      subject,
      message: body,
      status: "Sent",
    });
  } catch (err) {
    console.error("Invoice email delivery failed:", err);
    try {
      const client = clients.find((c) => c.id === invoice.client_id);
      if (client?.email) {
        await logEmailMessage({
          to_email: client.email,
          subject:
            invoice.status === "Sent"
              ? `Invoice Generated — ${invoice.invoice_number}`
              : `Payment Confirmation: Invoice ${invoice.invoice_number}`,
          message: `Delivery failed: ${err.message}`,
          status: "Failed",
          errorMsg: err.message,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
};

export default function Invoices() {
  const { userProfile, role } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyInvoice);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const clientId = userProfile?.client_id || userProfile?.clientId || "";
      const invoiceQuery =
        role === "client" && clientId
          ? query(
              collection(db, INVOICES_COLLECTION),
              where("client_id", "==", clientId),
            )
          : collection(db, INVOICES_COLLECTION);
      const clientQuery =
        role === "client" && clientId
          ? query(
              collection(db, CLIENTS_COLLECTION),
              where(documentId(), "==", clientId),
            )
          : collection(db, CLIENTS_COLLECTION);
      const projectQuery =
        role === "client" && clientId
          ? query(
              collection(db, PROJECTS_COLLECTION),
              where("client_id", "==", clientId),
            )
          : collection(db, PROJECTS_COLLECTION);
      const [invoiceSnap, clientSnap, projectSnap] = await Promise.all([
        getDocs(invoiceQuery),
        getDocs(clientQuery),
        getDocs(projectQuery),
      ]);

      const inv = invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const c = clientSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const p = projectSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setClients(c);
      setProjects(p);
      setInvoices(
        inv.map((item) =>
          enrichRecordRelations(item, { projects: p, clients: c }),
        ),
      );
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Failed to load data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const computeTotals = (f) => {
    const amount = Number(f.amount) || 0;
    const taxRate = Number(f.tax_rate) || 0;
    const taxAmount = amount * (taxRate / 100);
    return { ...f, tax_amount: taxAmount, total_amount: amount + taxAmount };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = computeTotals(form);
      payload.amount = Number(payload.amount);
      payload.tax_rate = Number(payload.tax_rate) || 0;
      payload.paid_amount = Number(payload.paid_amount) || 0;
      if (!payload.invoice_number)
        payload.invoice_number = `INV-${Date.now().toString().slice(-6)}`;

      const oldInvoice = editingId
        ? invoices.find((i) => i.id === editingId)
        : null;
      const statusChanged = !oldInvoice || oldInvoice.status !== payload.status;

      if (editingId) {
        const invoiceRef = doc(db, INVOICES_COLLECTION, editingId);
        await updateDoc(invoiceRef, {
          ...payload,
          updated_at: serverTimestamp(),
        });
        toast({ title: "Invoice updated" });
      } else {
        await addDoc(collection(db, INVOICES_COLLECTION), {
          ...payload,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        toast({ title: "Invoice created" });
      }

      // If status changed to Sent or Paid, deliver actual email notification
      if (statusChanged && ["Sent", "Paid"].includes(payload.status)) {
        triggerInvoiceStatusEmail(payload, clients);
      }

      setDialogOpen(false);
      setForm(emptyInvoice);
      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Failed to save invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Resolve client_id if role is client
  let resolvedClientId = userProfile?.client_id;
  if (role === "client" && !resolvedClientId && clients.length > 0) {
    const matchedClient = clients.find((c) => c.email === userProfile?.email);
    if (matchedClient) {
      resolvedClientId = matchedClient.id;
    }
  }

  const filtered = invoices.filter((inv) => {
    if (role === "client" && inv.client_id !== resolvedClientId) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (
      search &&
      !(inv.invoice_number || "")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      !(inv.client_name || "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const totalPaid = invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPending = invoices
    .filter((i) => ["Sent", "Partially Paid"].includes(i.status))
    .reduce((s, i) => s + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Generate and track invoices"
        actions={
          role === "admin" || role === "project_manager" ? (
            <Button
              onClick={() => {
                setForm({
                  ...emptyInvoice,
                  invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                });
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Collected"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(totalPending)}
          icon={IndianRupee}
        />
        <StatCard
          title="Overdue Invoices"
          value={overdueCount}
          icon={AlertTriangle}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Invoice #
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Client
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Project
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Due Date
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  {(role === "admin" || role === "project_manager") && (
                    <th className="text-right p-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3 font-medium font-mono text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {inv.client_name || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {inv.project_name || "—"}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">
                        {formatCurrency(inv.total_amount || 0)}
                      </p>
                      {inv.paid_amount > 0 &&
                        inv.paid_amount < inv.total_amount && (
                          <p className="text-xs text-muted-foreground">
                            Paid: {formatCurrency(inv.paid_amount)}
                          </p>
                        )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {inv.due_date || "—"}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    {(role === "admin" || role === "project_manager") && (
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const clientFields = toClientFields(inv, clients);
                            const projectFields = toProjectFields(
                              inv,
                              projects,
                            );
                            setForm({
                              ...emptyInvoice,
                              ...inv,
                              ...clientFields,
                              ...projectFields,
                              amount: inv.amount || "",
                            });
                            setEditingId(inv.id);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Invoice" : "New Invoice"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={form.invoice_number}
                onChange={(e) =>
                  setForm({ ...form, invoice_number: e.target.value })
                }
              />
            </div>
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
                <Label>Billing Type</Label>
                <Select
                  value={form.billing_type}
                  onValueChange={(v) => setForm({ ...form, billing_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_TYPES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Tax Rate %</Label>
                <Input
                  type="number"
                  value={form.tax_rate}
                  onChange={(e) =>
                    setForm({ ...form, tax_rate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Total</Label>
                <Input
                  type="number"
                  disabled
                  value={
                    (Number(form.amount) || 0) +
                    ((Number(form.amount) || 0) *
                      (Number(form.tax_rate) || 0)) /
                      100
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm({ ...form, due_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Paid Amount</Label>
                <Input
                  type="number"
                  value={form.paid_amount}
                  onChange={(e) =>
                    setForm({ ...form, paid_amount: e.target.value })
                  }
                />
              </div>
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
                saving || !form.amount || !form.client_id || !form.project_id
              }
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Invoice"
                  : "Create Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
