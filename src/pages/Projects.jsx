import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  FolderKanban,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import ClientSelect from "@/components/selects/ClientSelect";
import { fetchProjectsForUser, toClientFields } from "@/lib/firestoreQueries";
import { sendEmailViaEmailJS, logEmailMessage } from "@/lib/emailService";

const STATUSES = [
  "Planning",
  "In Progress",
  "Review",
  "Testing",
  "Completed",
  "On Hold",
  "Cancelled",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const BILLING_TYPES = ["Fixed Milestone", "Monthly Retainer", "Hourly"];
const emptyProject = {
  name: "",
  client_id: "",
  client_name: "",
  description: "",
  status: "Planning",
  priority: "Medium",
  billing_type: "Fixed Milestone",
  budget: "",
  start_date: "",
  end_date: "",
  scope: "",
  deliverables: "",
  progress: 0,
};

// Real project update email sender helper
const triggerProjectUpdateEmail = async (project, clients) => {
  try {
    const client = clients.find((c) => c.id === project.client_id);
    if (!client || !client.email) {
      console.warn(
        "Client email not found, skipping project status update email.",
      );
      return;
    }

    const subject = `Status Update: ${project.name}`;
    const body = `Dear ${client.name || client.company || "Client"},\n\nHere is a status update for the project "${project.name}". The current status is: ${project.status} (${project.progress}% Completed).\n\nDetails:\n- Status: ${project.status}\n- Progress: ${project.progress}%\n- Start Date: ${project.start_date || "N/A"}\n- Estimated End Date: ${project.end_date || "N/A"}\n\nBest regards,\nCrownridge LLP`;

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
    console.error("Project status email failed:", err);
    try {
      const client = clients.find((c) => c.id === project.client_id);
      if (client?.email) {
        await logEmailMessage({
          to_email: client.email,
          subject: `Status Update: ${project.name}`,
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

export default function Projects() {
  const { userProfile, role } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const projectData = await fetchProjectsForUser(role, userProfile);

      const clientId = userProfile?.client_id || userProfile?.clientId || "";
      const canLoadClients = ["admin", "project_manager"].includes(role);
      const clientSnapshot = canLoadClients
        ? await getDocs(collection(db, "clients"))
        : role === "client" && clientId
          ? await getDocs(
              query(
                collection(db, "clients"),
                where(documentId(), "==", clientId),
              ),
            )
          : { docs: [] };

      const clientData = clientSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProjects(projectData);
      setClients(clientData);

      console.log("PROJECTS:", projectData);
      console.log("CLIENTS:", clientData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : 0,
        progress: Number(form.progress) || 0,
        updatedAt: new Date(),
      };

      const oldProject = editingId
        ? projects.find((p) => p.id === editingId)
        : null;
      const progressChanged =
        !oldProject ||
        oldProject.progress !== payload.progress ||
        oldProject.status !== payload.status;

      if (editingId) {
        await updateDoc(doc(db, "projects", editingId), payload);

        toast({
          title: "Project updated",
        });
      } else {
        await addDoc(collection(db, "projects"), {
          ...payload,
          createdAt: new Date(),
        });

        toast({
          title: "Project created",
        });
      }

      // If progress or status changed, deliver email
      if (progressChanged) {
        triggerProjectUpdateEmail(payload, clients);
      }

      setDialogOpen(false);
      setForm(emptyProject);
      setEditingId(null);

      await loadData();
    } catch (error) {
      console.error(error);

      toast({
        title: "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = (p) => {
    const clientFields = toClientFields(p, clients);
    setForm({
      name: p.name || "",
      client_id: clientFields.client_id,
      client_name: clientFields.client_name,
      description: p.description || "",
      status: p.status || "Planning",
      priority: p.priority || "Medium",
      billing_type: p.billing_type || "Fixed Milestone",
      budget: p.budget || "",
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      scope: p.scope || "",
      deliverables: p.deliverables || "",
      progress: p.progress || 0,
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "projects", id));

      toast({
        title: "Project deleted",
      });

      await loadData();
    } catch (error) {
      console.error(error);

      toast({
        title: "Delete failed",
        variant: "destructive",
      });
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

  const filtered = projects.filter((p) => {
    if (role === "client" && p.client_id !== resolvedClientId) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !(p.client_name || "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const kanbanColumns = STATUSES.filter((s) => s !== "Cancelled").map(
    (status) => ({
      status,
      projects: filtered.filter((p) => p.status === status),
    }),
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track and manage all projects"
        actions={
          role === "admin" || role === "project_manager" ? (
            <Button
              onClick={() => {
                setForm(emptyProject);
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={setView} className="hidden sm:block">
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "grid" ? (
        filtered.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects found" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold text-sm truncate">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {p.client_name}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <StatusBadge status={p.priority} />
                  <span>·</span>
                  <span>{p.billing_type}</span>
                </div>
                {p.budget && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Budget: ₹{Number(p.budget).toLocaleString("en-IN")}
                  </p>
                )}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{p.progress || 0}%</span>
                  </div>
                  <Progress value={p.progress || 0} className="h-1.5" />
                </div>
                {(p.start_date || p.end_date) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {p.start_date || "—"} → {p.end_date || "—"}
                    </span>
                  </div>
                )}
                {(role === "admin" || role === "project_manager") && (
                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(p)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => (
            <div
              key={col.status}
              className="min-w-[260px] max-w-[300px] flex-shrink-0"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-heading font-semibold">
                  {col.status}
                </h3>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {col.projects.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.projects.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow ${
                      role === "admin" || role === "project_manager"
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                    onClick={() => {
                      if (role === "admin" || role === "project_manager") {
                        handleEdit(p);
                      }
                    }}
                  >
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.client_name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <StatusBadge status={p.priority} />
                      <span className="text-xs text-muted-foreground">
                        {p.progress || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Progress (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div>
              <Label>Scope</Label>
              <Textarea
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Deliverables</Label>
              <Textarea
                value={form.deliverables}
                onChange={(e) =>
                  setForm({ ...form, deliverables: e.target.value })
                }
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !form.name || !form.client_id}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Project"
                  : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
