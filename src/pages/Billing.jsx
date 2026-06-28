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
import { Plus, Receipt, IndianRupee, Clock, Target, Search, FileDown } from "lucide-react";
import ProjectSelect from "@/components/selects/ProjectSelect";
import { enrichRecordRelations, toProjectFields, getClientLabel, getProjectLabel } from "@/lib/firestoreQueries";
import { sendEmailViaEmailJS, logEmailMessage } from "@/lib/emailService";
import moment from "moment";
import { jsPDF } from "jspdf";

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

const seedHourlyLogsIfEmpty = async (projData, clientData) => {
  const demoClients = [
    { name: "Vikram Mehta", company: "Mehta Group", email: "vikram@mehtagroup.in", phone: "+91 98765 43210", industry: "Real Estate", address: "Cyber Tower, Sector 62, Noida, UP", status: "Active", total_revenue: 75000 },
    { name: "Nisha Patel", company: "Patel Exports", email: "nisha@patelexports.in", phone: "+91 99887 76655", address: "Infotech Park, Hinjewadi, Pune", industry: "Manufacturing", status: "Active", total_revenue: 55000 },
    { name: "Sarah Jenkins", company: "TechNova Solutions", email: "sarah@technova.com", phone: "+1 555-0101", industry: "Technology", address: "100 Tech Venture Way, Boston, MA", status: "Active", total_revenue: 125000 },
    { name: "Marcus Brody", company: "BlueWave Systems", email: "mbrody@bluewave.com", phone: "+1 555-0102", industry: "Healthcare", address: "42 Ocean Breeze Blvd, Miami, FL", status: "Active", total_revenue: 95000 },
    { name: "Elena Rostova", company: "Nexa Digital", email: "elena@nexadigital.com", phone: "+1 555-0103", industry: "Finance", address: "77 Financial Plaza, New York, NY", status: "Active", total_revenue: 142000 },
    { name: "Dr. David Vance", company: "Quantum Labs", email: "david@quantumlabs.com", phone: "+1 555-0104", industry: "Manufacturing", address: "205 Innovation Park, Austin, TX", status: "Active", total_revenue: 88000 },
    { name: "Linda Zhao", company: "CloudSync Technologies", email: "linda.zhao@cloudsync.io", phone: "+1 555-0105", industry: "Technology", address: "800 Cloud Vista Dr, San Francisco, CA", status: "Active", total_revenue: 160000 },
    { name: "Robert Taylor", company: "PrimeSoft Solutions", email: "robert@primesoft.com", phone: "+1 555-0107", industry: "Retail", address: "12 Retail Corridor, Chicago, IL", status: "Active", total_revenue: 110000 },
  ];

  const demoProjects = [
    { name: "Luxury Villa Interior", clientCompany: "Mehta Group", desc: "Premium interior styling and furnishing for a luxury duplex villa.", category: "Interior Design" },
    { name: "Modular Kitchen Design", clientCompany: "Patel Exports", desc: "Contemporary modular kitchen layout design with integrated appliances.", category: "Kitchen Design" },
    { name: "Corporate Office Renovation", clientCompany: "TechNova Solutions", desc: "Complete renovation of a 5000 sq ft software development facility.", category: "Commercial Renovation" },
    { name: "Restaurant Interior", clientCompany: "BlueWave Systems", desc: "Theme-based seating and lighting setup for a multi-cuisine restaurant.", category: "Hospitality Design" },
    { name: "Apartment False Ceiling", clientCompany: "Nexa Digital", desc: "Gypsum false ceiling layout with cove lighting for a penthouse.", category: "Residential Renovation" },
    { name: "Premium Bedroom Design", clientCompany: "Quantum Labs", desc: "Master bedroom design including custom bed wardrobe and lighting design.", category: "Interior Design" },
    { name: "Office Furniture Installation", clientCompany: "CloudSync Technologies", desc: "Ergonomic furniture setup and layout optimization for workstations.", category: "Commercial Renovation" },
    { name: "Hotel Lobby Design", clientCompany: "Mehta Group", desc: "Grand entrance lobby space planning and design layout for a boutique hotel.", category: "Hospitality Design" },
    { name: "Café Interior Project", clientCompany: "Patel Exports", desc: "Cozy café seating plan layout and theme implementation.", category: "Hospitality Design" },
    { name: "Retail Store Renovation", clientCompany: "PrimeSoft Solutions", desc: "Visual merchandising styling layout for a premium clothing store.", category: "Commercial Renovation" },
  ];

  const demoLogs = [
    { projectName: "Luxury Villa Interior", clientCompany: "Mehta Group", member: "Rahul Sharma", hours: 4, rate: 1500, status: "Captured", desc: "Initial client consultation and space planning layout discussion" },
    { projectName: "Modular Kitchen Design", clientCompany: "Patel Exports", member: "Priya Nair", hours: 6, rate: 1200, status: "Captured", desc: "Site measurement and material catalog review with client" },
    { projectName: "Corporate Office Renovation", clientCompany: "TechNova Solutions", member: "Karthik Rao", hours: 8, rate: 2500, status: "Invoiced", desc: "3D rendering design development and workspace partition plans" },
    { projectName: "Restaurant Interior", clientCompany: "BlueWave Systems", member: "Sneha Reddy", hours: 5, rate: 1800, status: "Captured", desc: "Floor plan revision based on structural and electrical feedback" },
    { projectName: "Apartment False Ceiling", clientCompany: "Nexa Digital", member: "Arjun Mehta", hours: 3.5, rate: 1000, status: "Captured", desc: "Furniture selection and layout styling recommendations" },
    { projectName: "Premium Bedroom Design", clientCompany: "Quantum Labs", member: "Rahul Sharma", hours: 5.5, rate: 1500, status: "Captured", desc: "Lighting design layout and false ceiling detailing plan" },
    { projectName: "Office Furniture Installation", clientCompany: "CloudSync Technologies", member: "Priya Nair", hours: 7, rate: 1200, status: "Invoiced", desc: "Material estimation and bill of quantities prep for procurement" },
    { projectName: "Hotel Lobby Design", clientCompany: "Mehta Group", member: "Karthik Rao", hours: 4, rate: 3000, status: "Captured", desc: "Client meeting and theme presentation with sample board" },
    { projectName: "Café Interior Project", clientCompany: "Patel Exports", member: "Sneha Reddy", hours: 5, rate: 1600, status: "Captured", desc: "Electrical layout planning and plumbing outlet positioning" },
    { projectName: "Retail Store Renovation", clientCompany: "PrimeSoft Solutions", member: "Arjun Mehta", hours: 6, rate: 2200, status: "Captured", desc: "Final design presentation and project schedule sign-off" },
  ];

  const clientMap = {};
  const projectMap = {};

  clientData.forEach(c => {
    clientMap[c.company || c.name] = c.id;
  });
  projData.forEach(p => {
    projectMap[p.name] = p.id;
  });

  // Create clients if they don't exist
  for (const client of demoClients) {
    const key = client.company;
    if (!clientMap[key]) {
      const docRef = await addDoc(collection(db, "clients"), {
        ...client,
        createdAt: serverTimestamp(),
      });
      clientMap[key] = docRef.id;
      clientData.push({ id: docRef.id, ...client });
    }
  }

  // Create projects if they don't exist
  for (const project of demoProjects) {
    if (!projectMap[project.name]) {
      const clientId = clientMap[project.clientCompany] || "";
      const docRef = await addDoc(collection(db, "projects"), {
        name: project.name,
        client_id: clientId,
        client_name: project.clientCompany,
        description: project.desc,
        status: "In Progress",
        priority: "High",
        billing_type: "Hourly",
        budget: 50000,
        progress: 30,
        start_date: moment().subtract(1, "months").format("YYYY-MM-DD"),
        end_date: moment().add(3, "months").format("YYYY-MM-DD"),
        category: project.category,
        createdAt: serverTimestamp(),
      });
      projectMap[project.name] = docRef.id;
      projData.push({ id: docRef.id, name: project.name, client_id: clientId, client_name: project.clientCompany, billing_type: "Hourly" });
    }
  }

  // Create hourly logs
  const seededLogs = [];
  let dayOffset = 1;
  for (const log of demoLogs) {
    const projectId = projectMap[log.projectName] || "";
    const clientId = clientMap[log.clientCompany] || "";
    const rate = log.rate;
    const hours = log.hours;
    const amount = hours * rate;

    const payload = {
      projectId,
      projectName: log.projectName,
      clientId,
      clientName: log.clientCompany,
      member: log.member,
      date: moment().subtract(dayOffset, "days").format("YYYY-MM-DD"),
      description: log.desc,
      hours,
      rate,
      amount,
      status: log.status,
      notes: "Realistic Indian business demo data seeded automatically.",
      invoiceId: "",
    };

    const docRef = await addDoc(collection(db, "hourlyLogs"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    seededLogs.push({ id: docRef.id, ...payload });
    dayOffset += 2;
  }
  return seededLogs;
};

export default function Billing() {
  const [milestones, setMilestones] = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [hourlyLogs, setHourlyLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("milestones");
  const [msDialog, setMsDialog] = useState(false);
  const [rtDialog, setRtDialog] = useState(false);
  const [hlDialog, setHlDialog] = useState(false);
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
  const [hlForm, setHlForm] = useState({
    date: new Date().toISOString().split("T")[0],
    project_id: "",
    project_name: "",
    client_id: "",
    client_name: "",
    member_id: "",
    member_name: "",
    description: "",
    hours: "",
    rate: "",
    notes: "",
    status: "Captured"
  });
  const [editingMsId, setEditingMsId] = useState(null);
  const [editingRtId, setEditingRtId] = useState(null);
  const [editingHlId, setEditingHlId] = useState(null);
  const [selectedHlIds, setSelectedHlIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [filterClient, setFilterClient] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewHlDialog, setViewHlDialog] = useState(false);
  const [selectedHlLog, setSelectedHlLog] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [msSnap, rtSnap, projSnap, clientSnap, hlSnap, userSnap] = await Promise.all([
        getDocs(collection(db, "milestones")),
        getDocs(collection(db, "retainers")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "hourlyLogs")),
        getDocs(collection(db, "users")),
      ]);

      const msData = msSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const rtData = rtSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const projData = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const clientData = clientSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      let hlData = hlSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const userData = userSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (hlData.length === 0) {
        console.log("No hourly logs found, seeding 10 demo logs...");
        hlData = await seedHourlyLogsIfEmpty(projData, clientData);
      }

      setMilestones(
        msData.map((m) => enrichRecordRelations(m, { projects: projData })),
      );
      setRetainers(
        rtData.map((r) => enrichRecordRelations(r, { projects: projData })),
      );
      setProjects(projData);
      setClients(clientData);
      setHourlyLogs(
        hlData.map((hl) => {
          const enriched = enrichRecordRelations(hl, { projects: projData });
          return {
            ...enriched,
            projectId: hl.projectId || hl.project_id || "",
            projectName: hl.projectName || hl.project_name || "",
            clientId: hl.clientId || hl.client_id || "",
            clientName: hl.clientName || hl.client_name || "",
            member: hl.member || hl.member_name || "",
            invoiceId: hl.invoiceId || hl.invoice_id || "",
          };
        })
      );
      setUsers(userData);
    } catch (error) {
      console.error("loadData:", error);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort hourly logs
  const sortedAndFilteredHourlyLogs = hourlyLogs.filter((log) => {
    // Client filter
    if (filterClient !== "all" && log.clientId !== filterClient) return false;
    // Project filter
    if (filterProject !== "all" && log.projectId !== filterProject) return false;
    // Member filter
    if (filterMember !== "all" && log.member !== filterMember) return false;
    // Status filter
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    // Date Range
    if (startDate && log.date < startDate) return false;
    if (endDate && log.date > endDate) return false;
    // Keyword search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const match =
        (log.projectName || "").toLowerCase().includes(query) ||
        (log.clientName || "").toLowerCase().includes(query) ||
        (log.member || "").toLowerCase().includes(query) ||
        (log.description || "").toLowerCase().includes(query) ||
        (log.notes || "").toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "date") {
      comparison = new Date(a.date) - new Date(b.date);
    } else if (sortBy === "amount") {
      comparison = (a.amount || 0) - (b.amount || 0);
    } else if (sortBy === "hours") {
      comparison = (a.hours || 0) - (b.hours || 0);
    } else if (sortBy === "rate") {
      comparison = (a.rate || 0) - (b.rate || 0);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleExport = (type) => {
    const filename = `hourly_billing_export_${moment().format("YYYY-MM-DD")}`;
    const dataToExport = sortedAndFilteredHourlyLogs;
    
    if (type === "csv") {
      const headers = ["Date", "Project", "Client", "Team Member", "Description", "Hours", "Rate (₹/hr)", "Amount (₹)", "Status", "Notes"];
      const rows = dataToExport.map(log => [
        log.date || "",
        log.projectName || log.project_name || "",
        log.clientName || log.client_name || "",
        log.member || log.member_name || "",
        log.description || "",
        log.hours || 0,
        log.rate || 0,
        log.amount || 0,
        log.status || "",
        log.notes || "",
      ]);
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "CSV Export Successful" });

    } else if (type === "excel") {
      let content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
      content += `<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Hourly Logs</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta charset="utf-8"></head><body>`;
      content += `<table><thead><tr>`;
      content += `<th>Date</th><th>Project</th><th>Client</th><th>Team Member</th><th>Description</th><th>Hours</th><th>Rate (₹/hr)</th><th>Amount</th><th>Status</th><th>Notes</th>`;
      content += `</tr></thead><tbody>`;
      
      dataToExport.forEach(log => {
        content += `<tr>`;
        content += `<td>${log.date || ""}</td>`;
        content += `<td>${log.projectName || log.project_name || ""}</td>`;
        content += `<td>${log.clientName || log.client_name || ""}</td>`;
        content += `<td>${log.member || log.member_name || ""}</td>`;
        content += `<td>${log.description || ""}</td>`;
        content += `<td>${log.hours || 0}</td>`;
        content += `<td>${log.rate || 0}</td>`;
        content += `<td>${log.amount || 0}</td>`;
        content += `<td>${log.status || ""}</td>`;
        content += `<td>${log.notes || ""}</td>`;
        content += `</tr>`;
      });
      content += `</tbody></table></body></html>`;

      const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Excel Export Successful" });

    } else if (type === "pdf") {
      const doc = new jsPDF("p", "pt", "a4");
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 595, 80, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Crownridge LLP", 40, 46);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Hourly Billing Logs Export", 40, 62);
      doc.text(`Generated: ${moment().format("lll")}`, 410, 46);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Hourly Billing Logs", 40, 115);

      let startY = 135;
      doc.setFillColor(241, 245, 249);
      doc.rect(40, startY, 515, 20, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Date", 45, startY + 13);
      doc.text("Project", 100, startY + 13);
      doc.text("Client", 195, startY + 13);
      doc.text("Member", 290, startY + 13);
      doc.text("Hours", 375, startY + 13);
      doc.text("Rate (₹)", 415, startY + 13);
      doc.text("Amount (₹)", 465, startY + 13);
      doc.text("Status", 515, startY + 13);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      startY += 25;

      dataToExport.forEach((log) => {
        if (startY > 780) {
          doc.addPage();
          startY = 40;
        }
        doc.text(log.date || "", 45, startY + 10);
        doc.text((log.projectName || log.project_name || "").substring(0, 18), 100, startY + 10);
        doc.text((log.clientName || log.client_name || "").substring(0, 18), 195, startY + 10);
        doc.text((log.member || log.member_name || "").substring(0, 16), 290, startY + 10);
        doc.text(String(log.hours || 0), 375, startY + 10);
        doc.text(String(log.rate || 0), 415, startY + 10);
        doc.text(String(log.amount || 0), 465, startY + 10);
        doc.text(log.status || "", 515, startY + 10);

        doc.setDrawColor(241, 245, 249);
        doc.line(40, startY + 15, 555, startY + 15);
        startY += 20;
      });

      doc.save(`${filename}.pdf`);
      toast({ title: "PDF Export Successful" });
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

  const handleSaveHourlyLog = async () => {
    try {
      setSaving(true);
      const hoursNum = Number(hlForm.hours) || 0;
      const rateNum = Number(hlForm.rate) || 0;

      // Validation
      if (hoursNum <= 0) {
        toast({ title: "Validation Error", description: "Hours must be greater than 0", variant: "destructive" });
        setSaving(false);
        return;
      }
      if (rateNum <= 0) {
        toast({ title: "Validation Error", description: "Rate must be greater than 0", variant: "destructive" });
        setSaving(false);
        return;
      }

      const payload = {
        projectId: hlForm.project_id || "",
        projectName: hlForm.project_name || "",
        clientId: hlForm.client_id || "",
        clientName: hlForm.client_name || "",
        member: hlForm.member_name || "",
        date: hlForm.date || "",
        description: hlForm.description || "",
        hours: hoursNum,
        rate: rateNum,
        amount: hoursNum * rateNum,
        status: hlForm.status || "Captured",
        notes: hlForm.notes || "",
        invoiceId: hlForm.invoice_id || "",
        updatedAt: serverTimestamp(),
      };

      if (editingHlId) {
        await updateDoc(doc(db, "hourlyLogs", editingHlId), payload);
        toast({ title: "Hourly log updated" });
      } else {
        await addDoc(collection(db, "hourlyLogs"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Hourly log created" });
      }

      setHlDialog(false);
      setEditingHlId(null);
      setHlForm({
        date: new Date().toISOString().split("T")[0],
        project_id: "",
        project_name: "",
        client_id: "",
        client_name: "",
        member_id: "",
        member_name: "",
        description: "",
        hours: "",
        rate: "",
        notes: "",
        status: "Captured"
      });

      await loadData();
    } catch (error) {
      console.error("handleSaveHourlyLog:", error);
      toast({ title: "Failed to save hourly log", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHourlyLog = async (id) => {
    try {
      await deleteDoc(doc(db, "hourlyLogs", id));
      toast({ title: "Hourly log deleted" });
      await loadData();
    } catch (error) {
      console.error("handleDeleteHourlyLog:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const createInvoiceFromSingleHourly = async (log) => {
    try {
      const project = projects.find((p) => p.id === log.project_id);
      const client = project ? clients.find((c) => c.id === project.client_id) : null;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const taxRate = 18;
      const taxAmount = (log.amount || 0) * (taxRate / 100);
      const finalAmount = (log.amount || 0) + taxAmount;

      const invoicePayload = {
        invoice_number: invoiceNumber,
        client_id: client?.id || "",
        client_name: client?.name || client?.company || "",
        project_id: log.project_id,
        project_name: log.project_name,
        billing_type: "Hourly",
        amount: Number(log.amount) || 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: finalAmount,
        status: "Draft",
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: `Invoice generated for hourly log:\n- ${log.date}: ${log.description || "Hourly work"} (${log.hours} hrs @ ₹${log.rate}/hr)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const invoiceRef = await addDoc(collection(db, "invoices"), invoicePayload);
      await updateDoc(doc(db, "hourlyLogs", log.id), {
        status: "Invoiced",
        invoiceId: invoiceRef.id,
        updatedAt: serverTimestamp(),
      });

      toast({ title: `Invoice ${invoiceNumber} created!` });
      await loadData();
    } catch (error) {
      console.error("createInvoiceFromSingleHourly:", error);
      toast({ title: "Failed to create invoice", variant: "destructive" });
    }
  };

  const handleCreateInvoiceFromHourly = async () => {
    if (selectedHlIds.length === 0) {
      toast({
        title: "No logs selected",
        description: "Please select at least one hourly log to create an invoice.",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedLogs = hourlyLogs.filter((log) => selectedHlIds.includes(log.id));
      
      const firstProjectId = selectedLogs[0].project_id;
      const sameProject = selectedLogs.every((log) => log.project_id === firstProjectId);
      if (!sameProject) {
        toast({
          title: "Multiple projects selected",
          description: "All selected hourly logs must belong to the same project.",
          variant: "destructive",
        });
        return;
      }

      const totalAmount = selectedLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
      const project = projects.find((p) => p.id === firstProjectId);
      const client = project ? clients.find((c) => c.id === project.client_id) : null;
      
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const taxRate = 18;
      const taxAmount = totalAmount * (taxRate / 100);
      const finalAmount = totalAmount + taxAmount;

      const logSummaries = selectedLogs
        .map((l) => `- ${l.date}: ${l.description || "Hourly work"} (${l.hours} hrs @ ₹${l.rate}/hr)`)
        .join("\n");

      const invoicePayload = {
        invoice_number: invoiceNumber,
        client_id: client?.id || "",
        client_name: client?.name || client?.company || "",
        project_id: firstProjectId,
        project_name: project?.name || "",
        billing_type: "Hourly",
        amount: totalAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: finalAmount,
        status: "Draft",
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: `Invoice generated for hourly logs:\n${logSummaries}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const invoiceRef = await addDoc(collection(db, "invoices"), invoicePayload);
      
      await Promise.all(
        selectedLogs.map((log) =>
          updateDoc(doc(db, "hourlyLogs", log.id), {
            status: "Invoiced",
            invoiceId: invoiceRef.id,
            updatedAt: serverTimestamp(),
          })
        )
      );

      toast({ title: `Invoice ${invoiceNumber} created successfully!` });
      setSelectedHlIds([]);
      await loadData();
    } catch (error) {
      console.error("handleCreateInvoiceFromHourly:", error);
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalMilestoneValue = milestones.reduce(
    (s, m) => s + (m.amount || 0),
    0,
  );
  const totalRetainerValue = retainers
    .filter((r) => r.status === "Active")
    .reduce((s, r) => s + (r.monthly_amount || 0), 0);

  const totalBillableHours = hourlyLogs.reduce((s, h) => s + (h.hours || 0), 0);
  const totalHourlyAmount = hourlyLogs.reduce((s, h) => s + (h.amount || 0), 0);
  const averageRate = totalBillableHours ? (totalHourlyAmount / totalBillableHours) : 0;
  const billedHourlyAmount = hourlyLogs
    .filter((h) => h.status === "Invoiced" || h.status === "Billed")
    .reduce((s, h) => s + (h.amount || 0), 0);
  const pendingHourlyAmount = hourlyLogs
    .filter((h) => h.status === "Captured")
    .reduce((s, h) => s + (h.amount || 0), 0);

  const activeMembers = users.filter((u) => u.role !== "client" && u.status === "active");
  const memberOptions = activeMembers.length > 0 ? activeMembers : [
    { id: "fallback-pm", name: "Admin PM", role: "project_manager" },
    { id: "fallback-rs", name: "Rahul Sharma", role: "developer" },
    { id: "fallback-js", name: "Jane Smith", role: "developer" },
    { id: "fallback-jd", name: "John Doe", role: "developer" },
    { id: "fallback-ap", name: "Amit Patel", role: "developer" }
  ];

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

      {tab === "hourly" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Billable Hours"
            value={totalBillableHours}
            icon={Clock}
          />
          <StatCard
            title="Average Hourly Rate"
            value={`₹${Math.round(averageRate).toLocaleString("en-IN")}/hr`}
            icon={IndianRupee}
          />
          <StatCard
            title="Total Amount"
            value={`₹${totalHourlyAmount.toLocaleString("en-IN")}`}
            icon={Receipt}
          />
          <StatCard
            title="Billed Amount"
            value={`₹${billedHourlyAmount.toLocaleString("en-IN")}`}
            icon={Target}
          />
          <StatCard
            title="Pending Amount"
            value={`₹${pendingHourlyAmount.toLocaleString("en-IN")}`}
            icon={IndianRupee}
          />
        </div>
      ) : (
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
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="retainers">Retainers</TabsTrigger>
          <TabsTrigger value="hourly">Hourly</TabsTrigger>
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

        <TabsContent value="hourly" className="space-y-4 mt-4">
          {/* Search, Filters & Export Panel */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Keyword Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Client Filter */}
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Project Filter */}
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Team Member Filter */}
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger>
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {Array.from(new Set(hourlyLogs.map((l) => l.member).filter(Boolean))).map((mName) => (
                    <SelectItem key={mName} value={mName}>
                      {mName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {["Captured", "Billed", "Invoiced"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Dropdown */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="rate">Rate</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="px-2 border-border"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? "▲" : "▼"}
                </Button>
              </div>
            </div>

            {/* Date Range & Exports Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-muted-foreground">Date Range:</span>
                <Input
                  type="date"
                  className="w-full sm:w-36 h-9"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="w-full sm:w-36 h-9"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                {(startDate || endDate || filterClient !== "all" || filterProject !== "all" || filterMember !== "all" || filterStatus !== "all" || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setFilterClient("all");
                      setFilterProject("all");
                      setFilterMember("all");
                      setFilterStatus("all");
                      setSearchQuery("");
                    }}
                    className="text-xs text-primary"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  className="text-xs border-border"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("excel")}
                  className="text-xs border-border"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  className="text-xs border-border"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div>
              {selectedHlIds.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleCreateInvoiceFromHourly}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Create Invoice ({selectedHlIds.length})
                </Button>
              )}
            </div>
            <Button
              onClick={() => {
                setHlForm({
                  date: new Date().toISOString().split("T")[0],
                  project_id: "",
                  project_name: "",
                  client_id: "",
                  client_name: "",
                  member_id: "",
                  member_name: "",
                  description: "",
                  hours: "",
                  rate: "",
                  notes: "",
                  status: "Captured"
                });
                setEditingHlId(null);
                setHlDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Hourly Log
            </Button>
          </div>

          {sortedAndFilteredHourlyLogs.length === 0 ? (
            <EmptyState icon={Clock} title="No hourly logs match the filters" />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-border bg-card text-primary focus:ring-primary w-4 h-4"
                          checked={
                            sortedAndFilteredHourlyLogs.filter((l) => l.status === "Captured").length > 0 &&
                            sortedAndFilteredHourlyLogs
                              .filter((l) => l.status === "Captured")
                              .every((l) => selectedHlIds.includes(l.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const captured = sortedAndFilteredHourlyLogs
                                .filter((l) => l.status === "Captured")
                                .map((l) => l.id);
                              setSelectedHlIds(captured);
                            } else {
                              setSelectedHlIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Team Member</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Hours</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Rate (₹/hr)</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredHourlyLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-border bg-card text-primary focus:ring-primary w-4 h-4"
                            checked={selectedHlIds.includes(log.id)}
                            disabled={log.status !== "Captured"}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedHlIds([...selectedHlIds, log.id]);
                              } else {
                                setSelectedHlIds(selectedHlIds.filter((id) => id !== log.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 font-medium">{log.date}</td>
                        <td className="p-3 text-muted-foreground">{log.projectName || log.project_name}</td>
                        <td className="p-3 text-muted-foreground">{log.clientName || log.client_name}</td>
                        <td className="p-3">{log.member || log.member_name}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate" title={log.description}>
                          {log.description}
                        </td>
                        <td className="p-3">{log.hours}</td>
                        <td className="p-3">₹{(log.rate || 0).toLocaleString("en-IN")}</td>
                        <td className="p-3 font-medium">₹{(log.amount || 0).toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedHlLog(log);
                                setViewHlDialog(true);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHlForm({
                                  date: log.date || "",
                                  project_id: log.projectId || log.project_id || "",
                                  project_name: log.projectName || log.project_name || "",
                                  client_id: log.clientId || log.client_id || "",
                                  client_name: log.clientName || log.client_name || "",
                                  member_id: log.member_id || "",
                                  member_name: log.member || log.member_name || "",
                                  description: log.description || "",
                                  hours: log.hours || "",
                                  rate: log.rate || "",
                                  notes: log.notes || "",
                                  status: log.status || "Captured",
                                });
                                setEditingHlId(log.id);
                                setHlDialog(true);
                              }}
                            >
                              Edit
                            </Button>
                            {log.status === "Captured" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => createInvoiceFromSingleHourly(log)}
                              >
                                Invoice
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteHourlyLog(log.id)}
                            >
                              Delete
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

      <Dialog open={hlDialog} onOpenChange={setHlDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingHlId ? "Edit Hourly Log" : "New Hourly Log"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client Dropdown */}
            <div>
              <Label>Client *</Label>
              <Select
                value={hlForm.client_id}
                onValueChange={(val) => {
                  const matchedClient = clients.find((c) => c.id === val);
                  setHlForm({
                    ...hlForm,
                    client_id: val,
                    client_name: matchedClient ? matchedClient.company || matchedClient.name : "",
                    project_id: "",
                    project_name: "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Dropdown */}
            <div>
              <Label>Project *</Label>
              <Select
                value={hlForm.project_id}
                onValueChange={(val) => {
                  const matchedProj = projects.find((p) => p.id === val);
                  if (matchedProj) {
                    const cId = matchedProj.client_id || matchedProj.clientId || "";
                    const matchedClient = clients.find((c) => c.id === cId);
                    setHlForm({
                      ...hlForm,
                      project_id: val,
                      project_name: matchedProj.name || "",
                      client_id: cId,
                      client_name: matchedClient ? matchedClient.company || matchedClient.name : "",
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((p) => !hlForm.client_id || p.client_id === hlForm.client_id || p.clientId === hlForm.client_id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Member *</Label>
                <Select
                  value={hlForm.member_id}
                  onValueChange={(val) => {
                    const matchedUser = memberOptions.find((u) => u.id === val);
                    setHlForm({
                      ...hlForm,
                      member_id: val,
                      member_name: matchedUser ? matchedUser.name : ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Member" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={hlForm.date}
                  onChange={(e) => setHlForm({ ...hlForm, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={hlForm.hours}
                  onChange={(e) => setHlForm({ ...hlForm, hours: e.target.value })}
                />
              </div>
              <div>
                <Label>Rate (₹/hr) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={hlForm.rate}
                  onChange={(e) => setHlForm({ ...hlForm, rate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Amount (calculated)</Label>
              <div className="p-3 bg-muted rounded-md text-foreground font-semibold">
                ₹{((Number(hlForm.hours) || 0) * (Number(hlForm.rate) || 0)).toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Input
                value={hlForm.description}
                onChange={(e) => setHlForm({ ...hlForm, description: e.target.value })}
                placeholder="Brief summary of work done"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={hlForm.notes}
                onChange={(e) => setHlForm({ ...hlForm, notes: e.target.value })}
                placeholder="Additional details (optional)"
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSaveHourlyLog}
              disabled={
                saving ||
                !hlForm.date ||
                !hlForm.project_id ||
                !hlForm.member_id ||
                !hlForm.hours ||
                !hlForm.rate ||
                !hlForm.description
              }
            >
              {saving ? "Saving..." : editingHlId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Hourly Log Details Dialog */}
      <Dialog open={viewHlDialog} onOpenChange={setViewHlDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hourly Log Details</DialogTitle>
          </DialogHeader>
          {selectedHlLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold">{selectedHlLog.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={selectedHlLog.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-semibold">{selectedHlLog.projectName || selectedHlLog.project_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-semibold">{selectedHlLog.clientName || selectedHlLog.client_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Team Member</p>
                  <p className="font-semibold">{selectedHlLog.member || selectedHlLog.member_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hourly Rate</p>
                  <p className="font-semibold">₹{(selectedHlLog.rate || 0).toLocaleString("en-IN")}/hr</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Hours Logged</p>
                  <p className="font-semibold">{selectedHlLog.hours} hrs</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-primary">₹{(selectedHlLog.amount || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 p-2 bg-muted rounded-md text-sm">{selectedHlLog.description}</p>
              </div>
              {selectedHlLog.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="mt-1 p-2 bg-muted rounded-md text-sm whitespace-pre-wrap">{selectedHlLog.notes}</p>
                </div>
              )}
              {selectedHlLog.invoiceId && (
                <div>
                  <p className="text-xs text-muted-foreground">Invoice ID</p>
                  <p className="font-semibold text-xs text-muted-foreground">{selectedHlLog.invoiceId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
