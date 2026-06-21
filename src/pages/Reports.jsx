import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  FileDown,
  DollarSign,
  Briefcase,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListCollapse,
} from "lucide-react";
import moment from "moment";

const COLORS = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#a855f7",
  "#eab308",
];

export default function Reports() {
  const { userProfile, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("finance");
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [retainers, setRetainers] = useState([]);

  // Stats States
  const [financeStats, setFinanceStats] = useState({});
  const [projectStats, setProjectStats] = useState({});
  const [clientStats, setClientStats] = useState({});

  const [exportType, setExportType] = useState("invoices");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        clientSnap,
        projectSnap,
        invoiceSnap,
        milestoneSnap,
        retainerSnap,
      ] = await Promise.all([
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "invoices")),
        getDocs(collection(db, "milestones")),
        getDocs(collection(db, "retainers")),
      ]);

      const c = clientSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const p = projectSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const inv = invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const ms = milestoneSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const rt = retainerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setClients(c);
      setProjects(p);
      setInvoices(inv);
      setMilestones(ms);
      setRetainers(rt);

      calculateReports(c, p, inv, ms, rt);

      // Log report viewed/generated event
      await addDoc(collection(db, "reports"), {
        type: "financial",
        title: "Reports Summary Rendered",
        message: `System reports dashboard initialized. Financial indicators: ${formatCurrency(
          inv
            .filter((i) => i.status === "Paid")
            .reduce(
              (s, i) => s + (Number(i.total_amount) || Number(i.amount) || 0),
              0,
            ),
        )} collected, ${p.length} total projects reviewed.`,
        recipient: userProfile?.email || "admin",
        status: "Sent",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error loading reports data:", error);
      toast({
        title: "Failed to load reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateReports = (c, p, inv, ms, rt) => {
    // ─── Financial calculations ───
    const paidInvoices = inv.filter((i) => i.status === "Paid");
    const totalRevenue = paidInvoices.reduce(
      (sum, i) => sum + (Number(i.total_amount) || Number(i.amount) || 0),
      0,
    );

    const pendingInvoices = inv.filter((i) =>
      ["Sent", "Partially Paid"].includes(i.status),
    );
    const pendingPayments = pendingInvoices.reduce(
      (sum, i) =>
        sum +
        ((Number(i.total_amount) || Number(i.amount) || 0) -
          (Number(i.paid_amount) || 0)),
      0,
    );

    const retainerRevenue = rt
      .filter((r) => r.status === "Active")
      .reduce((sum, r) => sum + (Number(r.monthly_amount) || 0), 0);

    const invoiceStatusCount = {
      Paid: paidInvoices.length,
      Pending: inv.filter((i) => i.status === "Sent").length,
      Overdue: inv.filter((i) => i.status === "Overdue").length,
      Draft: inv.filter((i) => i.status === "Draft").length,
    };

    const paymentStatusChartData = [
      { name: "Paid Revenue", value: totalRevenue },
      { name: "Pending Invoices", value: pendingPayments },
    ];

    setFinanceStats({
      totalRevenue,
      pendingPayments,
      paidInvoicesCount: paidInvoices.length,
      retainerRevenue,
      invoiceStatusCount,
      paymentStatusChartData,
    });

    // ─── Project calculations ───
    const totalProjects = p.length;
    const activeProjects = p.filter((p) =>
      ["In Progress", "Review", "Testing"].includes(p.status),
    ).length;
    const completedProjects = p.filter((p) => p.status === "Completed").length;

    // Delayed Projects: end_date is in past and not Completed/Cancelled
    const todayStr = moment().format("YYYY-MM-DD");
    const delayedProjects = p.filter((proj) => {
      return (
        proj.end_date &&
        proj.end_date < todayStr &&
        !["Completed", "Cancelled"].includes(proj.status)
      );
    }).length;

    const projectStatusChartData = [
      {
        name: "Planning",
        value: p.filter((proj) => proj.status === "Planning").length,
      },
      {
        name: "In Progress",
        value: p.filter((proj) => proj.status === "In Progress").length,
      },
      {
        name: "Testing/Review",
        value: p.filter((proj) => ["Testing", "Review"].includes(proj.status))
          .length,
      },
      { name: "Completed", value: completedProjects },
    ];

    setProjectStats({
      totalProjects,
      activeProjects,
      completedProjects,
      delayedProjects,
      projectStatusChartData,
    });

    // ─── Client calculations ───
    const totalClients = c.length;
    const activeClients = c.filter((cl) => cl.status === "Active").length;

    // Client Payment Details (Top Clients)
    const clientChartData = c.map((cl) => {
      const clientInvs = inv.filter((i) => i.client_id === cl.id);
      const paid = clientInvs
        .filter((i) => i.status === "Paid")
        .reduce(
          (sum, i) => sum + (Number(i.total_amount) || Number(i.amount) || 0),
          0,
        );
      const pending = clientInvs
        .filter((i) => ["Sent", "Partially Paid", "Overdue"].includes(i.status))
        .reduce(
          (sum, i) =>
            sum +
            ((Number(i.total_amount) || Number(i.amount) || 0) -
              (Number(i.paid_amount) || 0)),
          0,
        );

      return {
        name: cl.name || cl.company || "Unnamed",
        Paid: paid,
        Pending: pending,
      };
    });

    // Sort by total revenue
    clientChartData.sort((a, b) => b.Paid + b.Pending - (a.Paid + a.Pending));

    setClientStats({
      totalClients,
      activeClients,
      clientChartData: clientChartData.slice(0, 8), // Top 8 clients
    });
  };

  // CSV Export script
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let csvContent = "";
      let filename = `crownridge_${exportType}_report_${moment().format("YYYY-MM-DD")}.csv`;

      if (exportType === "invoices") {
        const headers = [
          "Invoice #",
          "Client Name",
          "Project Name",
          "Billing Type",
          "Amount",
          "Total Amount",
          "Paid Amount",
          "Due Date",
          "Status",
        ];
        const rows = invoices.map((i) => [
          i.invoice_number || i.id,
          i.client_name || "—",
          i.project_name || "—",
          i.billing_type || "—",
          i.amount || 0,
          i.total_amount || 0,
          i.paid_amount || 0,
          i.due_date || "—",
          i.status || "—",
        ]);
        csvContent = [
          headers.join(","),
          ...rows.map((r) =>
            r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n");
      } else if (exportType === "clients") {
        const headers = [
          "Client Name",
          "Company",
          "Email",
          "Phone",
          "Industry",
          "Total Revenue",
          "Status",
        ];
        const rows = clients.map((cl) => [
          cl.name || "—",
          cl.company || "—",
          cl.email || "—",
          cl.phone || "—",
          cl.industry || "—",
          cl.total_revenue || 0,
          cl.status || "—",
        ]);
        csvContent = [
          headers.join(","),
          ...rows.map((r) =>
            r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n");
      } else if (exportType === "projects") {
        const headers = [
          "Project Name",
          "Client Name",
          "Billing Type",
          "Budget",
          "Progress",
          "Start Date",
          "End Date",
          "Status",
          "Priority",
        ];
        const rows = projects.map((pr) => [
          pr.name || "—",
          pr.client_name || "—",
          pr.billing_type || "—",
          pr.budget || 0,
          pr.progress || 0,
          pr.start_date || "—",
          pr.end_date || "—",
          pr.status || "—",
          pr.priority || "—",
        ]);
        csvContent = [
          headers.join(","),
          ...rows.map((r) =>
            r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n");
      } else if (exportType === "payments") {
        // Milestone Payments
        const headers = [
          "Project Name",
          "Milestone Title",
          "Milestone Amount",
          "Due Date",
          "Status",
          "Completion %",
        ];
        const rows = milestones.map((m) => [
          m.project_name || "—",
          m.title || "—",
          m.amount || 0,
          m.due_date || "—",
          m.status || "—",
          m.completion_percentage || 0,
        ]);
        csvContent = [
          headers.join(","),
          ...rows.map((r) =>
            r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n");
      }

      // Download trigger
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log export activity in Firestore
      await addDoc(collection(db, "exports"), {
        type: "csv",
        title: `CSV Exported: ${exportType.toUpperCase()} Reports`,
        message: `Successfully generated and exported ${exportType} report as CSV. Records count: ${
          exportType === "invoices"
            ? invoices.length
            : exportType === "clients"
              ? clients.length
              : exportType === "projects"
                ? projects.length
                : milestones.length
        }`,
        recipient: userProfile?.email || "admin",
        status: "Sent",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "CSV Export Succeeded",
        description: `Exported file saved as: ${filename}`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // PDF Export script using jsPDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF("p", "pt", "a4");
      const filename = `crownridge_${exportType}_report_${moment().format("YYYY-MM-DD")}.pdf`;

      // Draw PDF Document header
      doc.setFillColor(79, 70, 229); // Primary Indigo
      doc.rect(0, 0, 595, 80, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Crownridge LLP", 40, 46);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("IT Project Retainer & Milestone System", 40, 62);

      doc.text(`Generated: ${moment().format("lll")}`, 430, 46);
      doc.text(`Prepared By: ${userProfile?.email || "System"}`, 430, 62);

      // Report Header Section
      doc.setTextColor(31, 41, 55); // Dark text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`${exportType.toUpperCase()} REPORT SUMMARY`, 40, 120);

      // Draw Grid / Rows of Report
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let startY = 150;

      if (exportType === "invoices") {
        // Headers
        doc.setFillColor(243, 244, 246);
        doc.rect(40, startY, 515, 20, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Invoice #", 45, startY + 13);
        doc.text("Client", 115, startY + 13);
        doc.text("Project", 220, startY + 13);
        doc.text("Total", 340, startY + 13);
        doc.text("Due Date", 410, startY + 13);
        doc.text("Status", 490, startY + 13);
        doc.setFont("helvetica", "normal");
        startY += 25;

        invoices.slice(0, 22).forEach((inv) => {
          doc.text(inv.invoice_number || inv.id, 45, startY + 10);
          doc.text(inv.client_name?.substring(0, 18) || "—", 115, startY + 10);
          doc.text(inv.project_name?.substring(0, 22) || "—", 220, startY + 10);
          doc.text(formatCurrency(inv.total_amount || 0), 340, startY + 10);
          doc.text(inv.due_date || "—", 410, startY + 10);
          doc.text(inv.status || "—", 490, startY + 10);
          doc.line(40, startY + 15, 555, startY + 15);
          startY += 20;
        });
      } else if (exportType === "clients") {
        doc.setFillColor(243, 244, 246);
        doc.rect(40, startY, 515, 20, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Client Name", 45, startY + 13);
        doc.text("Company", 155, startY + 13);
        doc.text("Email", 270, startY + 13);
        doc.text("Total Revenue", 400, startY + 13);
        doc.text("Status", 490, startY + 13);
        doc.setFont("helvetica", "normal");
        startY += 25;

        clients.slice(0, 22).forEach((cl) => {
          doc.text(cl.name || "—", 45, startY + 10);
          doc.text(cl.company || "—", 155, startY + 10);
          doc.text(cl.email || "—", 270, startY + 10);
          doc.text(formatCurrency(cl.total_revenue || 0), 400, startY + 10);
          doc.text(cl.status || "—", 490, startY + 10);
          doc.line(40, startY + 15, 555, startY + 15);
          startY += 20;
        });
      } else if (exportType === "projects") {
        doc.setFillColor(243, 244, 246);
        doc.rect(40, startY, 515, 20, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Project Name", 45, startY + 13);
        doc.text("Client Name", 185, startY + 13);
        doc.text("Budget", 305, startY + 13);
        doc.text("Progress", 380, startY + 13);
        doc.text("Status", 430, startY + 13);
        doc.text("Priority", 495, startY + 13);
        doc.setFont("helvetica", "normal");
        startY += 25;

        projects.slice(0, 22).forEach((pr) => {
          doc.text(pr.name?.substring(0, 25) || "—", 45, startY + 10);
          doc.text(pr.client_name?.substring(0, 20) || "—", 185, startY + 10);
          doc.text(formatCurrency(pr.budget || 0), 305, startY + 10);
          doc.text(`${pr.progress || 0}%`, 380, startY + 10);
          doc.text(pr.status || "—", 430, startY + 10);
          doc.text(pr.priority || "—", 495, startY + 10);
          doc.line(40, startY + 15, 555, startY + 15);
          startY += 20;
        });
      } else if (exportType === "payments") {
        doc.setFillColor(243, 244, 246);
        doc.rect(40, startY, 515, 20, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Project", 45, startY + 13);
        doc.text("Milestone", 165, startY + 13);
        doc.text("Amount", 310, startY + 13);
        doc.text("Due Date", 380, startY + 13);
        doc.text("Status", 455, startY + 13);
        doc.text("Comp %", 510, startY + 13);
        doc.setFont("helvetica", "normal");
        startY += 25;

        milestones.slice(0, 22).forEach((m) => {
          doc.text(m.project_name?.substring(0, 20) || "—", 45, startY + 10);
          doc.text(m.title?.substring(0, 25) || "—", 165, startY + 10);
          doc.text(formatCurrency(m.amount || 0), 310, startY + 10);
          doc.text(m.due_date || "—", 380, startY + 10);
          doc.text(m.status || "—", 455, startY + 10);
          doc.text(`${m.completion_percentage || 0}%`, 510, startY + 10);
          doc.line(40, startY + 15, 555, startY + 15);
          startY += 20;
        });
      }

      // Page numbers / Footer
      doc.setTextColor(156, 163, 175);
      doc.text("Crownridge LLP Retainer System • Confidential Report", 40, 800);
      doc.text("Page 1 of 1", 510, 800);

      // Save PDF document
      doc.save(filename);

      // Log export activity in Firestore
      await addDoc(collection(db, "exports"), {
        type: "pdf",
        title: `PDF Exported: ${exportType.toUpperCase()} Reports`,
        message: `Successfully rendered and exported ${exportType} report as PDF. Records printed: ${Math.min(
          22,
          exportType === "invoices"
            ? invoices.length
            : exportType === "clients"
              ? clients.length
              : exportType === "projects"
                ? projects.length
                : milestones.length,
        )}`,
        recipient: userProfile?.email || "admin",
        status: "Sent",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "PDF Export Succeeded",
        description: `Exported file saved as: ${filename}`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "PDF rendering failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

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
        title="Business Reports"
        description="Review financial health, project progress status, and client payment matrix summaries"
      />

      {/* Export Panel Widget */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <FileDown className="w-4 h-4 text-primary" />
          Data Export Dashboard
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full">
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger className="w-full bg-background border-border text-sm">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoices">
                  Invoice Listings Report
                </SelectItem>
                <SelectItem value="clients">Client Directory Report</SelectItem>
                <SelectItem value="projects">
                  Project Delivery Report
                </SelectItem>
                <SelectItem value="payments">
                  Milestone Payments Audit
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleExportCSV}
              disabled={exporting}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Export as CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex-1 sm:flex-none"
            >
              Export as PDF
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger
            value="finance"
            className="flex gap-1.5 text-xs sm:text-sm"
          >
            <DollarSign className="w-4 h-4" />
            Financials
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="flex gap-1.5 text-xs sm:text-sm"
          >
            <Briefcase className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="flex gap-1.5 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
        </TabsList>

        {/* --- FINANCIAL REPORT --- */}
        <TabsContent value="finance" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Collected Revenue"
              value={formatCurrency(financeStats.totalRevenue || 0)}
              icon={CheckCircle2}
              className="border-l-4 border-l-green-500"
            />
            <StatCard
              title="Pending Invoices"
              value={formatCurrency(financeStats.pendingPayments || 0)}
              icon={Clock}
              className="border-l-4 border-l-amber-500"
            />
            <StatCard
              title="Paid Invoices Count"
              value={financeStats.paidInvoicesCount || 0}
              icon={TrendingUp}
            />
            <StatCard
              title="Monthly Active Retainers"
              value={`${formatCurrency(financeStats.retainerRevenue || 0)}/mo`}
              icon={DollarSign}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Paid vs Pending */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-sm mb-4">
                Collected vs Pending Receivables
              </h4>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financeStats.paymentStatusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Invoices Status Breakdown */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <ListCollapse className="w-4 h-4 text-primary" /> Invoice Status
                Breakdown
              </h4>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">
                    Paid Invoices
                  </span>
                  <span className="font-bold bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-2 py-0.5 rounded">
                    {financeStats.invoiceStatusCount?.Paid}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">
                    Sent & Pending
                  </span>
                  <span className="font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded">
                    {financeStats.invoiceStatusCount?.Pending}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">
                    Overdue Payment
                  </span>
                  <span className="font-bold bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded">
                    {financeStats.invoiceStatusCount?.Overdue}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">
                    Draft Status
                  </span>
                  <span className="font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded">
                    {financeStats.invoiceStatusCount?.Draft}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- PROJECTS REPORT --- */}
        <TabsContent value="projects" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Projects Managed"
              value={projectStats.totalProjects || 0}
              icon={Briefcase}
            />
            <StatCard
              title="Active In Development"
              value={projectStats.activeProjects || 0}
              icon={Clock}
              className="border-l-4 border-l-blue-500"
            />
            <StatCard
              title="Completed Projects"
              value={projectStats.completedProjects || 0}
              icon={CheckCircle2}
              className="border-l-4 border-l-green-500"
            />
            <StatCard
              title="Delayed Projects"
              value={projectStats.delayedProjects || 0}
              icon={AlertTriangle}
              className="border-l-4 border-l-red-500"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h4 className="font-semibold text-sm mb-4">
              Project Status Pipeline Overview
            </h4>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStats.projectStatusChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="value"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    name="Projects Count"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* --- CLIENTS REPORT --- */}
        <TabsContent value="clients" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <StatCard
              title="Registered Clients"
              value={clientStats.totalClients || 0}
              icon={Users}
            />
            <StatCard
              title="Active Relationships"
              value={clientStats.activeClients || 0}
              icon={CheckCircle2}
              className="border-l-4 border-l-green-500"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h4 className="font-semibold text-sm mb-4">
              Client Portfolio Value (Top Clients)
            </h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientStats.clientChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar
                    dataKey="Paid"
                    stackId="a"
                    fill="#10b981"
                    name="Paid Revenue"
                  />
                  <Bar
                    dataKey="Pending"
                    stackId="a"
                    fill="#f59e0b"
                    name="Pending Amount"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
