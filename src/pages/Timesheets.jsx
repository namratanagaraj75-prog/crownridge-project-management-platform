import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
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
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Clock, CheckCircle, XCircle, Pencil } from "lucide-react";
import ProjectSelect from "@/components/selects/ProjectSelect";
import { fetchProjectsForUser, toProjectFields } from "@/lib/firestoreQueries";

const TIMESHEETS_COLLECTION = "timesheets";

const getTodayString = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  project_id: "",
  project_name: "",
  project: "",
  task_title: "",
  date: getTodayString(),
  hours: "",
  billable: true,
  description: "",
  status: "Draft",
};

// ─── Firestore timestamp helpers ────────────────────────────────────────────

const isFirestoreTimestamp = (value) =>
  value &&
  typeof value === "object" &&
  typeof value.seconds === "number" &&
  typeof value.nanoseconds === "number";

const convertTimestamps = (data) => {
  if (Array.isArray(data)) return data.map(convertTimestamps);

  if (data && typeof data === "object") {
    if (isFirestoreTimestamp(data)) {
      // Return ISO date string for any bare timestamp
      return new Date(data.seconds * 1000).toISOString().split("T")[0];
    }

    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        isFirestoreTimestamp(value)
          ? new Date(value.seconds * 1000).toISOString().split("T")[0]
          : convertTimestamps(value),
      ]),
    );
  }

  return data;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Timesheets() {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [debugRaw, setDebugRaw] = useState([]);
  const { toast } = useToast();


  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userId = user?.uid || user?.id || "";
      const timesheetQuery = collection(db, TIMESHEETS_COLLECTION);
      const [snap, projectList] = await Promise.all([
        getDocs(timesheetQuery),
        fetchProjectsForUser(user?.role, user),
      ]);
      let t = snap.docs.map((d) => ({
        id: d.id,
        ...convertTimestamps(d.data()),
      }));
      console.log('User role:', user?.role);
      console.log('Raw timesheets data:', t);
      if (user?.role === "developer") {
        // No filtering for developers during debugging to show all entries
      } else {
        // Future role‑specific filtering can be added here
      }
      console.log('Loaded timesheets count:', t.length);
      setTimesheets(t);
      setDebugRaw(t);
      setProjects(projectList);
    } catch (error) {
      console.error("Error loading timesheets:", error);
      toast({
        title: "Failed to load timesheets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm({ ...emptyForm, date: getTodayString() });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (ts) => {
    const { project_id, project_name } = toProjectFields(ts, projects);
    setForm({
      project_id,
      project_name,
      project: project_name,
      task_title: ts.task_title || "",
      date: typeof ts.date === "string" ? ts.date : getTodayString(),
      hours: ts.hours != null ? String(ts.hours) : "",
      billable: Boolean(ts.billable),
      description: ts.description || "",
      status: ts.status || "Draft",
    });
    setEditingId(ts.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const hours = parseFloat(form.hours);

      if (!form.project_id) {
        toast({ title: "Project is required", variant: "destructive" });
        return;
      }
      if (isNaN(hours) || hours <= 0) {
        toast({ title: "Enter valid hours", variant: "destructive" });
        return;
      }

      const payload = {
        date: String(form.date),
        project_id: form.project_id,
        project_name: form.project_name,
        project: form.project_name,
        task_title: form.task_title.trim(),
        hours: hours,
        billable: Boolean(form.billable),
        description: form.description.trim(),
        status: form.status,
        user_id: user?.uid || user?.id || "",
        user_name:
          user?.full_name || user?.displayName || user?.email || user?.id || "",
        employee:
          user?.full_name || user?.displayName || user?.email || user?.id || "",
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        if (user?.role === "developer") {
          const existing = timesheets.find((x) => x.id === editingId);
          if (existing && existing.user_id !== (user?.uid || user?.id)) {
            toast({
              title: "Access Denied",
              description: "You can only edit your own timesheets.",
              variant: "destructive",
            });
            setSaving(false);
            return;
          }
        }
        await updateDoc(doc(db, TIMESHEETS_COLLECTION, editingId), payload);
        toast({ title: "Entry updated" });
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, TIMESHEETS_COLLECTION), payload);
        toast({ title: "Time logged" });
      }

      setDialogOpen(false);
      setForm({ ...emptyForm, date: getTodayString() });
      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error("Error saving timesheet:", error);
      toast({
        title: "Failed to save entry",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, TIMESHEETS_COLLECTION, id), {
        status: "Approved",
        approved_by: user?.uid || user?.id || "",
      });
      toast({ title: "Entry approved" });
      await loadData();
    } catch (error) {
      console.error("Error approving:", error);
      toast({
        title: "Failed to approve",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id) => {
    try {
      await updateDoc(doc(db, TIMESHEETS_COLLECTION, id), {
        status: "Rejected",
      });
      toast({ title: "Entry rejected" });
      await loadData();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ─── Derived stats ──────────────────────────────────────────────────────
  const totalHours = timesheets.reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const billableHours = timesheets
    .filter((t) => Boolean(t.billable))
    .reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const billablePct =
    totalHours > 0
      ? ((billableHours / totalHours) * 100).toFixed(1)
      : 0;

  const isManager = ["admin", "project_manager", "tech_lead"].includes(
    user?.role,
  );

  const isSaveDisabled =
    saving ||
    !form.project_id ||
    !form.hours ||
    isNaN(parseFloat(form.hours)) ||
    parseFloat(form.hours) <= 0 ||
    !form.date;

  // ─── Loading spinner ────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description="Log and track working hours"
        actions={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Log Time
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Hours"
          value={totalHours.toFixed(1)}
          icon={Clock}
        />
        <StatCard
          title="Billable Hours"
          value={billableHours.toFixed(1)}
          icon={Clock}
        />
        <StatCard
          title="Billable Percentage"
          value={`${billablePct}%`}
          icon={CheckCircle}
        />
      </div>

      {/* Table */}
      {timesheets.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No time entries"
          description="Start logging your hours"
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                    User
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Project
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Hours
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Billable
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
                {timesheets.map((ts) => (
                  <tr
                    key={ts.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => openEdit(ts)}
                  >
                    <td className="p-3 text-muted-foreground">
                      {ts.date || "—"}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {ts.user_name || ts.employee || "—"}
                    </td>
                    <td className="p-3">
                      {ts.project_name || ts.project || "—"}
                    </td>
                    <td className="p-3 font-semibold">
                      {Number(ts.hours) || 0}h
                    </td>
                    <td className="p-3">
                      {ts.billable ? (
                        <span className="text-emerald-500 text-xs font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          No
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={ts.status || "Draft"} />
                    </td>
                    <td
                      className="p-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={() => openEdit(ts)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isManager && ts.status === "Submitted" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Approve"
                              onClick={() => handleApprove(ts.id)}
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reject"
                              onClick={() => handleReject(ts.id)}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Entry" : "Log Time"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <ProjectSelect
              projects={projects}
              value={form.project_id}
              displayName={form.project_name}
              onValueChange={({ project_id, project_name }) =>
                setForm({
                  ...form,
                  project_id,
                  project_name,
                  project: project_name,
                })
              }
              required
            />

            {/* Date + Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="e.g. 4"
                />
              </div>
            </div>

            {/* Task */}
            <div>
              <Label>Task</Label>
              <Input
                value={form.task_title}
                onChange={(e) =>
                  setForm({ ...form, task_title: e.target.value })
                }
                placeholder="What did you work on?"
              />
            </div>

            {/* Billable toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.billable}
                onCheckedChange={(v) => setForm({ ...form, billable: v })}
              />
              <Label>Billable</Label>
            </div>

            {/* Status */}
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
                  {["Draft", "Submitted"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                placeholder="Optional notes"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={isSaveDisabled}
            >
              {saving ? "Saving…" : editingId ? "Update Entry" : "Log Time"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
