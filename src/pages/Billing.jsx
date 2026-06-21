import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Receipt, IndianRupee, Clock, Target } from "lucide-react";
import ProjectSelect from "@/components/selects/ProjectSelect";
import { enrichRecordRelations, toProjectFields } from "@/lib/firestoreQueries";
import { sendEmailViaEmailJS, logEmailMessage } from "@/lib/emailService";

// Milestone Completion email sender
const triggerMilestoneCompletionEmail = async (
  milestone,
  projects,
  clients,
) => {
  try {
    const project = projects.find((p) => p.id === milestone.project_id);
    if (!project) {
      console.warn("Project not found for milestone completion email.");
      return;
    }

    const client = clients.find((c) => c.id === project.client_id);
    if (!client || !client.email) {
      console.warn(
        "Client email not found, skipping milestone completion email.",
      );
      return;
    }

    const subject = `Milestone Completed: ${milestone.title}`;
    const body = `Dear ${client.name || client.company || "Client"},\n\nWe are pleased to inform you that the milestone "${milestone.title}" for the project "${project.name || "Project"}" has been successfully completed! We have updated the project timeline accordingly.\n\nBest regards,\nCrownridge LLP`;

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
    console.error("Milestone completed email failed:", err);
    try {
      const project = projects.find((p) => p.id === milestone.project_id);
      const client = project
        ? clients.find((c) => c.id === project.client_id)
        : null;
      if (client?.email) {
        await logEmailMessage({
          to_email: client.email,
          subject: `Milestone Completed: ${milestone.title}`,
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

export default function Billing() {
  const [milestones, setMilestones] = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("milestones");
  const [msDialog, setMsDialog] = useState(false);
  const [rtDialog, setRtDialog] = useState(false);
  const [msForm, setMsForm] = useState({
    project_id: "",
    project_name: "",
    title: "",
    description: "",
    amount: "",
    due_date: "",
    status: "Pending",
    completion_percentage: 0,
    payment_trigger: "",
  });
  const [rtForm, setRtForm] = useState({
    project_id: "",
    project_name: "",
    monthly_amount: "",
    start_date: "",
    end_date: "",
    status: "Active",
    notes: "",
  });
  const [editingMsId, setEditingMsId] = useState(null);
  const [editingRtId, setEditingRtId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [msSnap, rtSnap, projSnap, clientSnap] = await Promise.all([
        getDocs(collection(db, "milestones")),
        getDocs(collection(db, "retainers")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "clients")),
      ]);

      const msData = msSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const rtData = rtSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const projData = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const clientData = clientSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setMilestones(
        msData.map((m) => enrichRecordRelations(m, { projects: projData })),
      );
      setRetainers(
        rtData.map((r) => enrichRecordRelations(r, { projects: projData })),
      );
      setProjects(projData);
      setClients(clientData);
    } catch (error) {
      console.error("loadData:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMilestone = async () => {
    try {
      setSaving(true);
      const payload = {
        ...msForm,
        amount: Number(msForm.amount) || 0,
        completion_percentage: Number(msForm.completion_percentage) || 0,
        updatedAt: serverTimestamp(),
      };

      const oldMilestone = editingMsId
        ? milestones.find((m) => m.id === editingMsId)
        : null;
      const statusChanged =
        !oldMilestone || oldMilestone.status !== payload.status;

      if (editingMsId) {
        await updateDoc(doc(db, "milestones", editingMsId), payload);
        toast({ title: "Milestone updated" });
      } else {
        await addDoc(collection(db, "milestones"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Milestone created" });
      }

      // If status changed to Completed, trigger email
      if (statusChanged && payload.status === "Completed") {
        triggerMilestoneCompletionEmail(payload, projects, clients);
      }

      setMsDialog(false);
      setEditingMsId(null);
      setMsForm({
        project_id: "",
        project_name: "",
        title: "",
        description: "",
        amount: "",
        due_date: "",
        status: "Pending",
        completion_percentage: 0,
        payment_trigger: "",
      });

      await loadData();
    } catch (error) {
      console.error("handleSaveMilestone:", error);
      toast({ title: "Failed to save milestone", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRetainer = async () => {
    try {
      setSaving(true);
      const payload = {
        ...rtForm,
        monthly_amount: Number(rtForm.monthly_amount) || 0,
        updatedAt: serverTimestamp(),
      };

      if (editingRtId) {
        await updateDoc(doc(db, "retainers", editingRtId), payload);
        toast({ title: "Retainer updated" });
      } else {
        await addDoc(collection(db, "retainers"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Retainer created" });
      }

      setRtDialog(false);
      setEditingRtId(null);
      setRtForm({
        project_id: "",
        project_name: "",
        monthly_amount: "",
        start_date: "",
        end_date: "",
        status: "Active",
        notes: "",
      });

      await loadData();
    } catch (error) {
      console.error("handleSaveRetainer:", error);
      toast({ title: "Failed to save retainer", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = async (id) => {
    try {
      await deleteDoc(doc(db, "milestones", id));
      toast({ title: "Milestone deleted" });
      await loadData();
    } catch (error) {
      console.error("handleDeleteMilestone:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteRetainer = async (id) => {
    try {
      await deleteDoc(doc(db, "retainers", id));
      toast({ title: "Retainer deleted" });
      await loadData();
    } catch (error) {
      console.error("handleDeleteRetainer:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const createInvoiceFromMilestone = async (ms) => {
    try {
      const project = projects.find((p) => p.id === ms.project_id);
      const client = project
        ? clients.find((c) => c.id === project.client_id)
        : null;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const taxRate = 18;
      const taxAmount = (ms.amount || 0) * (taxRate / 100);
      const invoicePayload = {
        invoice_number: invoiceNumber,
        client_id: client?.id || "",
        client_name: client?.name || "",
        project_id: ms.project_id,
        project_name: ms.project_name,
        billing_type: "Fixed Milestone",
        amount: Number(ms.amount) || 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: (Number(ms.amount) || 0) + taxAmount,
        status: "Draft",
        due_date: ms.due_date || null,
        milestone_id: ms.id,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "invoices"), invoicePayload);
      await updateDoc(doc(db, "milestones", ms.id), {
        status: "Invoiced",
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Invoice created from milestone" });
      await loadData();
    } catch (error) {
      console.error("createInvoiceFromMilestone:", error);
      toast({ title: "Failed to create invoice", variant: "destructive" });
    }
  };

  const totalMilestoneValue = milestones.reduce(
    (s, m) => s + (m.amount || 0),
    0,
  );
  const totalRetainerValue = retainers
    .filter((r) => r.status === "Active")
    .reduce((s, r) => s + (r.monthly_amount || 0), 0);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Management"
        description="Manage milestones, retainers, and hourly billing"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Milestone Billing"
          value={`₹${totalMilestoneValue.toLocaleString("en-IN")}`}
          icon={Target}
        />
        <StatCard
          title="Monthly Retainers"
          value={`₹${totalRetainerValue.toLocaleString("en-IN")}/mo`}
          icon={IndianRupee}
        />
        <StatCard
          title="Total Milestones"
          value={milestones.length}
          icon={Receipt}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="retainers">Retainers</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setMsForm({
                  project_id: "",
                  project_name: "",
                  title: "",
                  description: "",
                  amount: "",
                  due_date: "",
                  status: "Pending",
                  completion_percentage: 0,
                  payment_trigger: "",
                });
                setEditingMsId(null);
                setMsDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>

          {milestones.length === 0 ? (
            <EmptyState icon={Target} title="No milestones yet" />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Milestone
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                        Project
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                        Due Date
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((ms) => (
                      <tr
                        key={ms.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{ms.title}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">
                          {ms.project_name}
                        </td>
                        <td className="p-3">
                          ₹{(ms.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">
                          {ms.due_date || "—"}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={ms.status} />
                        </td>
                        <td className="p-3 text-right">
                          {ms.status === "Completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => createInvoiceFromMilestone(ms)}
                              className="mr-1"
                            >
                              Invoice
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const { project_id, project_name } =
                                toProjectFields(ms, projects);
                              setMsForm({
                                project_id,
                                project_name,
                                title: ms.title || "",
                                description: ms.description || "",
                                amount: ms.amount || "",
                                due_date: ms.due_date || "",
                                status: ms.status || "Pending",
                                completion_percentage:
                                  ms.completion_percentage || 0,
                                payment_trigger: ms.payment_trigger || "",
                              });
                              setEditingMsId(ms.id);
                              setMsDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1"
                            onClick={() => handleDeleteMilestone(ms.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="retainers" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setRtForm({
                  project_id: "",
                  project_name: "",
                  monthly_amount: "",
                  start_date: "",
                  end_date: "",
                  status: "Active",
                  notes: "",
                });
                setEditingRtId(null);
                setRtDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Retainer
            </Button>
          </div>

          {retainers.length === 0 ? (
            <EmptyState icon={Clock} title="No retainers yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {retainers.map((rt) => (
                <div
                  key={rt.id}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold text-sm">
                        {rt.project_name || "Retainer"}
                      </h3>
                    </div>
                    <StatusBadge status={rt.status} />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-lg">
                      ₹{(rt.monthly_amount || 0).toLocaleString("en-IN")}
                      <span className="text-xs text-muted-foreground font-normal">
                        /month
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rt.start_date} → {rt.end_date}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { project_id, project_name } = toProjectFields(
                          rt,
                          projects,
                        );
                        setRtForm({
                          project_id,
                          project_name,
                          monthly_amount: rt.monthly_amount || "",
                          start_date: rt.start_date || "",
                          end_date: rt.end_date || "",
                          status: rt.status || "Active",
                          notes: rt.notes || "",
                        });
                        setEditingRtId(rt.id);
                        setRtDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRetainer(rt.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={msDialog} onOpenChange={setMsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMsId ? "Edit Milestone" : "New Milestone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ProjectSelect
              projects={projects}
              value={msForm.project_id}
              displayName={msForm.project_name}
              onValueChange={({ project_id, project_name }) =>
                setMsForm({ ...msForm, project_id, project_name })
              }
              required
            />
            <div>
              <Label>Title *</Label>
              <Input
                value={msForm.title}
                onChange={(e) =>
                  setMsForm({ ...msForm, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={msForm.amount}
                  onChange={(e) =>
                    setMsForm({ ...msForm, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={msForm.due_date}
                  onChange={(e) =>
                    setMsForm({ ...msForm, due_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={msForm.status}
                  onValueChange={(v) => setMsForm({ ...msForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Pending",
                      "In Progress",
                      "Completed",
                      "Invoiced",
                      "Paid",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Completion %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={msForm.completion_percentage}
                  onChange={(e) =>
                    setMsForm({
                      ...msForm,
                      completion_percentage: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Payment Trigger</Label>
              <Input
                value={msForm.payment_trigger}
                onChange={(e) =>
                  setMsForm({ ...msForm, payment_trigger: e.target.value })
                }
                placeholder="e.g., On design approval"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={msForm.description}
                onChange={(e) =>
                  setMsForm({ ...msForm, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSaveMilestone}
              disabled={
                saving || !msForm.title || !msForm.amount || !msForm.project_id
              }
            >
              {saving ? "Saving..." : editingMsId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rtDialog} onOpenChange={setRtDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRtId ? "Edit Retainer" : "New Retainer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ProjectSelect
              projects={projects}
              value={rtForm.project_id}
              displayName={rtForm.project_name}
              onValueChange={({ project_id, project_name }) =>
                setRtForm({ ...rtForm, project_id, project_name })
              }
              required
            />

            <div>
              <Label>Monthly Amount *</Label>
              <Input
                type="number"
                value={rtForm.monthly_amount}
                onChange={(e) =>
                  setRtForm({ ...rtForm, monthly_amount: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={rtForm.start_date}
                  onChange={(e) =>
                    setRtForm({ ...rtForm, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={rtForm.end_date}
                  onChange={(e) =>
                    setRtForm({ ...rtForm, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={rtForm.status}
                onValueChange={(v) => setRtForm({ ...rtForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Active", "Paused", "Expired", "Cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={rtForm.notes}
                onChange={(e) =>
                  setRtForm({ ...rtForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSaveRetainer}
              disabled={saving || !rtForm.monthly_amount || !rtForm.project_id}
            >
              {saving ? "Saving..." : editingRtId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
