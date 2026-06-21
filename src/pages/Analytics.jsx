import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";

import {
  IndianRupee,
  Users,
  FolderKanban,
  Ticket,
  Clock,
  TrendingUp,
  Receipt,
  Shield,
} from "lucide-react";

const COLORS = [
  "hsl(234, 89%, 60%)",
  "hsl(168, 76%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(291, 64%, 42%)",
  "hsl(0, 84%, 60%)",
  "hsl(200, 70%, 50%)",
  "hsl(330, 80%, 55%)",
  "hsl(60, 80%, 45%)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely convert a Firestore Timestamp, Date, or string to a JS Date. */
const toDate = (value) => {
  if (!value) return null;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** Normalise a raw Firestore doc, converting all Timestamp fields to ISO strings. */
const normaliseDoc = (raw) => {
  if (Array.isArray(raw)) return raw.map(normaliseDoc);
  if (raw && typeof raw === "object") {
    if (
      typeof raw.seconds === "number" &&
      typeof raw.nanoseconds === "number"
    ) {
      return new Date(raw.seconds * 1000).toISOString();
    }
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, normaliseDoc(v)]),
    );
  }
  return raw;
};

/** Fetch an entire collection and return normalised docs. */
const fetchCollection = async (name) => {
  try {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d) => ({ id: d.id, ...normaliseDoc(d.data()) }));
  } catch (err) {
    console.error(`Failed to fetch collection "${name}":`, err);
    return [];
  }
};

/**
 * Build a frequency / value map from an array of records by a given key.
 * Returns [{name, value}] sorted descending by value, omitting null/undefined keys.
 */
const groupByCount = (records, key) => {
  const map = {};
  for (const r of records) {
    const val = r[key];
    if (val == null || val === "") continue;
    map[val] = (map[val] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const groupBySum = (records, groupKey, sumKey) => {
  const map = {};
  for (const r of records) {
    const group = r[groupKey];
    if (group == null || group === "") continue;
    map[group] = (map[group] || 0) + (Number(r[sumKey]) || 0);
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all collections in parallel
      const [invoices, projects, tickets, timesheets, clients, amcs] =
        await Promise.all([
          fetchCollection("invoices"),
          fetchCollection("projects"),
          fetchCollection("supportTickets"),
          fetchCollection("timesheets"),
          fetchCollection("clients"),
          fetchCollection("amcContracts"),
        ]);

      // ── KPI calculations ──────────────────────────────────────────────────

      // Revenue: any invoice whose status matches "paid" (case-insensitive)
      const revenue = invoices
        .filter((i) => (i.status || "").toLowerCase() === "paid")
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);

      // Pending: status === "pending"
      const pending = invoices
        .filter((i) => (i.status || "").toLowerCase() === "pending")
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);

      // Overdue: status === "overdue"
      const overdue = invoices
        .filter((i) => (i.status || "").toLowerCase() === "overdue")
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);

      // Active projects: status is NOT one of the "done" keywords
      const INACTIVE_PROJECT_STATUSES = new Set([
        "completed",
        "cancelled",
        "archived",
        "done",
        "closed",
      ]);
      const activeProjects = projects.filter(
        (p) => !INACTIVE_PROJECT_STATUSES.has((p.status || "").toLowerCase()),
      ).length;

      // Open tickets: status is NOT resolved / closed
      const CLOSED_TICKET_STATUSES = new Set(["resolved", "closed", "done"]);
      const openTickets = tickets.filter(
        (t) => !CLOSED_TICKET_STATUSES.has((t.status || "").toLowerCase()),
      ).length;

      // Billable hours: sum hours where billable === true
      const billableHours = timesheets
        .filter((t) => Boolean(t.billable))
        .reduce((s, t) => s + (Number(t.hours) || 0), 0);

      const totalHours = timesheets.reduce(
        (s, t) => s + (Number(t.hours) || 0),
        0,
      );

      // Active AMCs: status === "active"
      const activeAMCs = amcs.filter(
        (a) => (a.status || "").toLowerCase() === "active",
      ).length;

      // ── Chart data — fully dynamic, no hardcoded status arrays ───────────

      // Project status distribution (all statuses found in Firestore)
      const projectStatusData = groupByCount(projects, "status");

      // Revenue by billing type (sum of invoice amounts per billingType)
      const billingTypeData = groupBySum(invoices, "billingType", "amount");

      // Tickets by priority
      const ticketPriorityData = groupByCount(tickets, "priority");

      // Ticket status breakdown
      const ticketStatusData = groupByCount(tickets, "status");

      // Bonus: Timesheet hours by project (top 8 for readability)
      const hoursByProject = groupBySum(timesheets, "project", "hours").slice(
        0,
        8,
      );

      // Bonus: Invoice status breakdown (amounts)
      const invoiceStatusData = groupBySum(invoices, "status", "amount");

      setData({
        // KPIs
        revenue,
        pending,
        overdue,
        billableHours,
        totalHours,
        activeProjects,
        totalClients: clients.length,
        openTickets,
        activeAMCs,
        // Charts
        projectStatusData,
        billingTypeData,
        ticketPriorityData,
        ticketStatusData,
        hoursByProject,
        invoiceStatusData,
      });
    } catch (error) {
      console.error("Analytics loadData error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Business insights and performance metrics"
      />

      {/* Row 1 — Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${(data?.revenue || 0).toLocaleString("en-IN")}`}
          icon={IndianRupee}
        />
        <StatCard
          title="Pending Payments"
          value={`₹${(data?.pending || 0).toLocaleString("en-IN")}`}
          icon={Receipt}
        />
        <StatCard
          title="Overdue Amount"
          value={`₹${(data?.overdue || 0).toLocaleString("en-IN")}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Projects"
          value={data?.activeProjects || 0}
          icon={FolderKanban}
        />
      </div>

      {/* Row 2 — Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={data?.totalClients || 0}
          icon={Users}
        />
        <StatCard
          title="Open Tickets"
          value={data?.openTickets || 0}
          icon={Ticket}
        />
        <StatCard
          title="Billable Hours"
          value={`${(data?.billableHours || 0).toFixed(1)}h`}
          icon={Clock}
          subtitle={`of ${(data?.totalHours || 0).toFixed(1)}h total`}
        />
        <StatCard
          title="Active AMCs"
          value={data?.activeAMCs || 0}
          icon={Shield}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        {data?.projectStatusData?.length > 0 && (
          <ChartCard title="Project Status Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.projectStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={4}
                >
                  {data.projectStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <Legend items={data.projectStatusData} />
          </ChartCard>
        )}

        {/* Revenue by Billing Type */}
        {data?.billingTypeData?.length > 0 && (
          <ChartCard title="Revenue by Billing Type">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.billingTypeData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220,13%,91%)"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 13 }}
                  formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.billingTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Tickets by Priority */}
        {data?.ticketPriorityData?.length > 0 && (
          <ChartCard title="Tickets by Priority">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.ticketPriorityData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220,13%,91%)"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.ticketPriorityData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Ticket Resolution Metrics */}
        {data?.ticketStatusData?.length > 0 && (
          <ChartCard title="Ticket Resolution Metrics">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.ticketStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={4}
                >
                  {data.ticketStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <Legend items={data.ticketStatusData} />
          </ChartCard>
        )}

        {/* Hours by Project */}
        {data?.hoursByProject?.length > 0 && (
          <ChartCard title="Hours Logged by Project">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.hoursByProject} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220,13%,91%)"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={130}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 13 }}
                  formatter={(v) => `${v}h`}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.hoursByProject.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Invoice Status Breakdown */}
        {data?.invoiceStatusData?.length > 0 && (
          <ChartCard title="Invoice Amounts by Status">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.invoiceStatusData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220,13%,91%)"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 13 }}
                  formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.invoiceStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

// ─── Small reusable sub-components ───────────────────────────────────────────

function ChartCard({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-heading font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-3">
      {items.map((d, i) => (
        <div
          key={d.name}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: COLORS[i % COLORS.length] }}
          />
          {d.name} ({d.value})
        </div>
      ))}
    </div>
  );
}
