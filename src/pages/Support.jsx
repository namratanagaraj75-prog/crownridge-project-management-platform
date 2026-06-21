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
  Ticket,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pencil,
} from "lucide-react";
import ClientSelect from "@/components/selects/ClientSelect";
import ProjectSelect from "@/components/selects/ProjectSelect";
import {
  enrichRecordRelations,
  toClientFields,
  toProjectFields,
} from "@/lib/firestoreQueries";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = [
  "Open",
  "In Progress",
  "Waiting on Client",
  "Resolved",
  "Closed",
];
const CATEGORIES = [
  "Bug",
  "Feature Request",
  "Support",
  "Question",
  "Incident",
];
const emptyTicket = {
  title: "",
  description: "",
  client_id: "",
  client_name: "",
  project_id: "",
  project_name: "",
  priority: "Medium",
  status: "Open",
  assigned_to_name: "",
  category: "Support",
  resolution: "",
  sla_due_date: "",
};

export default function Support() {
  const { userProfile, role } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyTicket);
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
      const ticketQuery =
        role === "client" && clientId
          ? query(collection(db, "supportTickets"), where("client_id", "==", clientId))
          : collection(db, "supportTickets");
      const canLoadClients = ["admin", "project_manager", "support"].includes(role);
      const canLoadProjects = ["admin", "project_manager"].includes(role);
      const [ticketsSnap, clientsSnap, projectsSnap] = await Promise.all([
        getDocs(ticketQuery),
        canLoadClients ? getDocs(collection(db, "clients")) : Promise.resolve({ docs: [] }),
        canLoadProjects ? getDocs(collection(db, "projects")) : Promise.resolve({ docs: [] }),
      ]);

      const clientData = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const projectData = projectsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setClients(clientData);
      setProjects(projectData);
      setTickets(
        ticketsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .map((t) =>
            enrichRecordRelations(t, {
              projects: projectData,
              clients: clientData,
            }),
          ),
      );
    } catch (error) {
      console.error("Error loading support data:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    if (!payload.ticket_number)
      payload.ticket_number = `TKT-${Date.now().toString().slice(-6)}`;
    if (editingId) {
      await updateDoc(doc(db, "supportTickets", editingId), payload);
    } else {
      await addDoc(collection(db, "supportTickets"), payload);
    }
    toast({ title: editingId ? "Ticket updated" : "Ticket created" });
    setDialogOpen(false);
    setForm(emptyTicket);
    setEditingId(null);
    setSaving(false);
    loadData();
  };

  // Resolve client_id if role is client
  let resolvedClientId = userProfile?.client_id;
  if (role === "client" && !resolvedClientId && clients.length > 0) {
    const matchedClient = clients.find((c) => c.email === userProfile?.email);
    if (matchedClient) {
      resolvedClientId = matchedClient.id;
    }
  }

  const filtered = tickets.filter((t) => {
    if (role === "client" && t.client_id !== resolvedClientId) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (
      search &&
      !t.title.toLowerCase().includes(search.toLowerCase()) &&
      !(t.ticket_number || "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "In Progress",
  ).length;
  const resolvedCount = tickets.filter((t) =>
    ["Resolved", "Closed"].includes(t.status),
  ).length;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        description="Manage support requests and incidents"
        actions={
          role !== "client" ? (
            <Button
              onClick={() => {
                setForm(emptyTicket);
                setEditingId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Open Tickets" value={openCount} icon={AlertTriangle} />
        <StatCard title="In Progress" value={inProgressCount} icon={Clock} />
        <StatCard title="Resolved" value={resolvedCount} icon={CheckCircle} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All" />
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Ticket} title="No tickets found" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Ticket
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Client
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Project
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  {role !== "client" && (
                    <th className="text-right p-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3">
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ticket.ticket_number}
                      </p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ticket.client_name || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ticket.project_name || "—"}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={ticket.priority} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    {role !== "client" && (
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const clientFields = toClientFields(ticket, clients);
                            const projectFields = toProjectFields(
                              ticket,
                              projects,
                            );
                            setForm({
                              ...emptyTicket,
                              ...ticket,
                              ...clientFields,
                              ...projectFields,
                            });
                            setEditingId(ticket.id);
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
              {editingId ? "Edit Ticket" : "New Ticket"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
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
            <div className="grid grid-cols-3 gap-4">
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
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assignee</Label>
                <Input
                  value={form.assigned_to_name}
                  onChange={(e) =>
                    setForm({ ...form, assigned_to_name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>SLA Due Date</Label>
                <Input
                  type="date"
                  value={form.sla_due_date}
                  onChange={(e) =>
                    setForm({ ...form, sla_due_date: e.target.value })
                  }
                />
              </div>
            </div>
            {editingId && (
              <div>
                <Label>Resolution</Label>
                <Textarea
                  value={form.resolution}
                  onChange={(e) =>
                    setForm({ ...form, resolution: e.target.value })
                  }
                  rows={2}
                />
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={
                saving ||
                !form.title ||
                !form.description ||
                !form.client_id ||
                !form.project_id
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
