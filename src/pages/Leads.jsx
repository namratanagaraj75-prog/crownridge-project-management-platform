import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
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
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, Target, UserPlus, Pencil, Trash2 } from "lucide-react";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Real Estate",
  "Media",
  "Government",
  "Other",
];
const SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Call",
  "Email Campaign",
  "Event",
  "Partner",
  "Other",
];
const STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];
const URGENCIES = ["Low", "Medium", "High", "Critical"];

const emptyLead = {
  name: "",
  email: "",
  phone: "",
  company: "",
  industry: "",
  source: "",
  status: "New",
  score: 0,
  budget: "",
  urgency: "Medium",
  opportunity_value: "",
  notes: "",
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyLead);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadLeads = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "leads"));
      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setLeads(data);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadLeads();
  }, []);
  const handleSave = async () => {
    console.log("FORM DATA:", form);
    try {
      setSaving(true);

      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : 0,
        opportunity_value: form.opportunity_value
          ? Number(form.opportunity_value)
          : 0,
        score: Number(form.score) || 0,
        updatedAt: new Date(),
      };

      if (editingId) {
        await updateDoc(doc(db, "leads", editingId), payload);

        toast({
          title: "Lead updated",
        });
      } else {
        await addDoc(collection(db, "leads"), {
          ...payload,
          converted: false,
          createdAt: new Date(),
        });

        toast({
          title: "Lead created",
        });
      }

      setDialogOpen(false);
      setForm(emptyLead);
      setEditingId(null);

      await loadLeads();
    } catch (error) {
      console.error(error);

      toast({
        title: "Failed to save lead",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead) => {
    setForm({
      ...lead,
      budget: lead.budget || "",
      opportunity_value: lead.opportunity_value || "",
    });
    setEditingId(lead.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "leads", id));

      toast({
        title: "Lead deleted",
      });

      await loadLeads();
    } catch (error) {
      console.error(error);

      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };
  const handleConvert = async (lead) => {
    try {
      const clientRef = await addDoc(collection(db, "clients"), {
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        status: "Active",
        total_revenue: 0,
        createdAt: new Date(),
      });

      await updateDoc(doc(db, "leads", lead.id), {
        converted: true,
        converted_client_id: clientRef.id,
        status: "Won",
        updatedAt: new Date(),
      });

      toast({
        title: "Lead converted to client",
      });

      await loadLeads();
    } catch (error) {
      console.error(error);

      toast({
        title: "Conversion failed",
        variant: "destructive",
      });
    }
  };

  const filtered = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (
      search &&
      !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !l.company.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Management"
        description="Track and qualify leads"
        actions={
          <Button
            onClick={() => {
              setForm(emptyLead);
              setEditingId(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
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
        <EmptyState
          icon={Target}
          title="No leads found"
          description="Create your first lead to get started"
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                    Company
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Source
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Score
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
                    Value
                  </th>
                  <th className="text-right p-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.email}
                      </p>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {lead.company}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {lead.source}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${lead.score || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {lead.score || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {lead.opportunity_value
                        ? `₹${lead.opportunity_value.toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!lead.converted && lead.status !== "Lost" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvert(lead)}
                            title="Convert to client"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(lead)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
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
            <DialogTitle>{editingId ? "Edit Lead" : "New Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Company *</Label>
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Industry</Label>
                <Select
                  value={form.industry}
                  onValueChange={(v) => setForm({ ...form, industry: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
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
                <Label>Urgency</Label>
                <Select
                  value={form.urgency}
                  onValueChange={(v) => setForm({ ...form, urgency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCIES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget</Label>
                <Input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div>
                <Label>Opportunity Value</Label>
                <Input
                  type="number"
                  value={form.opportunity_value}
                  onChange={(e) =>
                    setForm({ ...form, opportunity_value: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !form.name || !form.email || !form.company}
            >
              {saving ? "Saving..." : editingId ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
