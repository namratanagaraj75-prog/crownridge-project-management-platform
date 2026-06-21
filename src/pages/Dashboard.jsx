import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import moment from "moment";
import { db } from "../lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { fetchProjectsForUser } from "@/lib/firestoreQueries";
import { Button } from "@/components/ui/button";
import { seedAllDemoData } from "@/lib/seedDemoData";
import confetti from "canvas-confetti";

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
} from "recharts";

import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/ui/PageHeader";

import {
  IndianRupee,
  Users,
  FolderKanban,
  Receipt,
  Ticket,
  Shield,
  Clock,
  Target,
  Bell,
  AlertTriangle,
  Calendar,
  FileWarning,
  Award,
} from "lucide-react";

const COLORS = ["#4F46E5", "#14B8A6", "#F59E0B"];

export default function Dashboard() {
  const { userProfile, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const handleSeedData = async () => {
    if (!["admin", "project_manager"].includes(role)) return;
    setSeeding(true);
    try {
      const uid = userProfile?.uid || userProfile?.id || "";
      const name = userProfile?.name || "Admin PM";
      await seedAllDemoData(uid, name);

      // Confetti burst!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });

      await loadStats();
    } catch (error) {
      console.error("Seeding failed:", error);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [role, userProfile]);

  const loadStats = async () => {
    try {
      const mapSnap = (snap) =>
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const emptySnap = { docs: [] };
      const uid = userProfile?.uid || userProfile?.id || "";
      const clientId = userProfile?.client_id || userProfile?.clientId || "";
      const isAdminOrPm = ["admin", "project_manager"].includes(role);
      const isClient = role === "client" && clientId;
      const isDeveloper = role === "developer" && uid;
      const isQa = role === "qa" && uid;

      const projectsPromise = fetchProjectsForUser(role, userProfile);
      const clientsPromise = ["admin", "project_manager", "support"].includes(
        role,
      )
        ? getDocs(collection(db, "clients"))
        : Promise.resolve(emptySnap);
      const invoicesPromise = isAdminOrPm
        ? getDocs(collection(db, "invoices"))
        : isClient
          ? getDocs(
              query(
                collection(db, "invoices"),
                where("client_id", "==", clientId),
              ),
            )
          : Promise.resolve(emptySnap);
      const tasksPromise = isAdminOrPm
        ? getDocs(collection(db, "tasks"))
        : isDeveloper || isQa
          ? getDocs(
              query(
                collection(db, "tasks"),
                where("assigned_user_ids", "array-contains", uid),
              ),
            )
          : Promise.resolve(emptySnap);
      const leadsPromise = isAdminOrPm
        ? getDocs(collection(db, "leads"))
        : Promise.resolve(emptySnap);
      const ticketsPromise = [
        "admin",
        "project_manager",
        "support",
        "qa",
      ].includes(role)
        ? getDocs(collection(db, "supportTickets"))
        : isClient
          ? getDocs(
              query(
                collection(db, "supportTickets"),
                where("client_id", "==", clientId),
              ),
            )
          : Promise.resolve(emptySnap);
      const amcPromise = isAdminOrPm
        ? getDocs(collection(db, "amcContracts"))
        : isClient
          ? getDocs(
              query(
                collection(db, "amcContracts"),
                where("client_id", "==", clientId),
              ),
            )
          : Promise.resolve(emptySnap);
      const timesheetPromise = isAdminOrPm
        ? getDocs(collection(db, "timesheets"))
        : isDeveloper
          ? getDocs(
              query(collection(db, "timesheets"), where("user_id", "==", uid)),
            )
          : Promise.resolve(emptySnap);
      const retainersPromise = isAdminOrPm
        ? getDocs(collection(db, "retainers"))
        : isClient
          ? getDocs(
              query(
                collection(db, "retainers"),
                where("client_id", "==", clientId),
              ),
            )
          : Promise.resolve(emptySnap);
      const notificationsPromise = getDocs(collection(db, "notifications"));

      const [
        projects,
        clientsSnap,
        invoicesSnap,
        tasksSnap,
        leadsSnap,
        ticketsSnap,
        amcSnap,
        timesheetSnap,
        retainersSnap,
        notificationsSnap,
      ] = await Promise.all([
        projectsPromise,
        clientsPromise,
        invoicesPromise,
        tasksPromise,
        leadsPromise,
        ticketsPromise,
        amcPromise,
        timesheetPromise,
        retainersPromise,
        notificationsPromise,
      ]);

      const clients = mapSnap(clientsSnap);

      // Silent seeding check: if the database is empty, seed it automatically in the background
      if (isAdminOrPm && clients.length === 0) {
        console.log(
          "Database is empty. Seeding realistic demo data in the background...",
        );
        await seedAllDemoData(uid, userProfile?.name || "Admin PM");
        setTimeout(() => {
          loadStats();
        }, 100);
        return;
      }

      const invoices = mapSnap(invoicesSnap);
      const tasks = mapSnap(tasksSnap);
      const leads = mapSnap(leadsSnap);
      const tickets = mapSnap(ticketsSnap);
      const amcs = mapSnap(amcSnap);
      const timesheets = mapSnap(timesheetSnap);
      const retainers = mapSnap(retainersSnap);
      let notificationsRaw = mapSnap(notificationsSnap);

      const totalRevenue = invoices.reduce(
        (sum, inv) => sum + (Number(inv.amount) || 0),
        0,
      );

      const projectStatusData = [
        {
          name: "Planning",
          value: projects.filter((p) => p.status === "Planning").length,
        },
        {
          name: "In Progress",
          value: projects.filter((p) => p.status === "In Progress").length,
        },
        {
          name: "Completed",
          value: projects.filter((p) => p.status === "Completed").length,
        },
      ];

      const invoiceStatusData = [
        {
          name: "Pending",
          value: invoices.filter((i) => i.status === "Pending").length,
        },
        {
          name: "Paid",
          value: invoices.filter((i) => i.status === "Paid").length,
        },
        {
          name: "Overdue",
          value: invoices.filter((i) => i.status === "Overdue").length,
        },
      ];

      const billableHours = timesheets.reduce(
        (sum, t) => sum + (Number(t.hours) || 0),
        0,
      );

      const clientEmail = userProfile?.email || "";

      // Background Automated Reminder Generator for Admins/PMs
      if (isAdminOrPm) {
        try {
          const milestoneSnap = await getDocs(collection(db, "milestones"));
          const milestones = mapSnap(milestoneSnap);
          const existingKeys = new Set(
            notificationsRaw.map((d) => d.triggerKey).filter(Boolean),
          );

          const today = moment().startOf("day");
          const threeDaysLater = moment().add(3, "days").endOf("day");
          const sevenDaysLater = moment().add(7, "days").endOf("day");
          let remindersCreatedCount = 0;

          // Check Overdue Invoices
          for (const inv of invoices) {
            if (
              !inv.due_date ||
              ["Paid", "Cancelled", "Draft"].includes(inv.status)
            )
              continue;
            const dueDate = moment(inv.due_date);
            if (dueDate.isBefore(today)) {
              const triggerKey = `overdue_invoice_${inv.id}_${inv.due_date}`;
              if (!existingKeys.has(triggerKey)) {
                await addDoc(collection(db, "notifications"), {
                  type: "Overdue Invoice",
                  title: `Overdue Invoice: ${inv.invoice_number || inv.id}`,
                  message: `Invoice ${inv.invoice_number || inv.id} for client ${
                    inv.client_name || "Client"
                  } was due on ${inv.due_date} and is currently overdue. Amount: ₹${(
                    inv.total_amount ||
                    inv.amount ||
                    0
                  ).toLocaleString("en-IN")}`,
                  recipient: inv.client_email || inv.recipient || "admin",
                  client_id: inv.client_id || "",
                  status: "Sent",
                  triggerKey,
                  createdAt: serverTimestamp(),
                });
                remindersCreatedCount++;
              }
            }
          }

          // Check Upcoming Invoices (due in next 3 days)
          for (const inv of invoices) {
            if (
              !inv.due_date ||
              ["Paid", "Cancelled", "Draft"].includes(inv.status)
            )
              continue;
            const dueDate = moment(inv.due_date);
            if (dueDate.isBetween(today, threeDaysLater, null, "[]")) {
              const triggerKey = `upcoming_invoice_${inv.id}_${inv.due_date}`;
              if (!existingKeys.has(triggerKey)) {
                await addDoc(collection(db, "notifications"), {
                  type: "Invoice Due",
                  title: `Upcoming Invoice Due: ${inv.invoice_number || inv.id}`,
                  message: `Invoice ${inv.invoice_number || inv.id} for client ${
                    inv.client_name || "Client"
                  } is due on ${inv.due_date}. Amount: ₹${(
                    inv.total_amount ||
                    inv.amount ||
                    0
                  ).toLocaleString("en-IN")}`,
                  recipient: inv.client_email || inv.recipient || "admin",
                  client_id: inv.client_id || "",
                  status: "Sent",
                  triggerKey,
                  createdAt: serverTimestamp(),
                });
                remindersCreatedCount++;
              }
            }
          }

          // Check Retainer Renewals (ending in next 7 days)
          for (const ret of retainers) {
            if (!ret.end_date || ret.status !== "Active") continue;
            const endDate = moment(ret.end_date);
            if (endDate.isBetween(today, sevenDaysLater, null, "[]")) {
              const triggerKey = `retainer_renewal_${ret.id}_${ret.end_date}`;
              if (!existingKeys.has(triggerKey)) {
                await addDoc(collection(db, "notifications"), {
                  type: "Retainer Renewal",
                  title: `Retainer Renewal Alert: ${ret.project_name || "Project"}`,
                  message: `Monthly Retainer for project ${
                    ret.project_name || "Project"
                  } is ending soon on ${ret.end_date}. Monthly budget: ₹${(
                    ret.monthly_amount || 0
                  ).toLocaleString("en-IN")}`,
                  recipient: "admin",
                  client_id: ret.client_id || "",
                  status: "Sent",
                  triggerKey,
                  createdAt: serverTimestamp(),
                });
                remindersCreatedCount++;
              }
            }
          }

          // Check Pending Milestone Payments
          for (const ms of milestones) {
            if (ms.status !== "Completed") continue;
            const triggerKey = `milestone_payment_pending_${ms.id}`;
            if (!existingKeys.has(triggerKey)) {
              await addDoc(collection(db, "notifications"), {
                type: "Milestone Pending",
                title: `Milestone Payment Pending: ${ms.title}`,
                message: `Milestone "${ms.title}" for project "${
                  ms.project_name
                }" is completed but has not been invoiced or paid yet. Amount: ₹${(
                  ms.amount || 0
                ).toLocaleString("en-IN")}`,
                recipient: "admin",
                client_id: ms.client_id || "",
                status: "Sent",
                triggerKey,
                createdAt: serverTimestamp(),
              });
              remindersCreatedCount++;
            }
          }

          if (remindersCreatedCount > 0) {
            const freshNotifSnap = await getDocs(
              collection(db, "notifications"),
            );
            notificationsRaw = mapSnap(freshNotifSnap);
          }
        } catch (err) {
          console.error("Dashboard background reminders generator error:", err);
        }
      }

      // Filter Notifications
      const userNotifications = notificationsRaw.filter((notif) => {
        if (role === "client") {
          return (
            notif.recipient?.toLowerCase() === clientEmail.toLowerCase() ||
            notif.recipient === "client" ||
            notif.client_id === clientId
          );
        }
        return true;
      });

      const notificationsWithDates = userNotifications.map((n) => ({
        ...n,
        createdAtDate: n.createdAt?.toDate
          ? n.createdAt.toDate()
          : n.createdAt
            ? new Date(n.createdAt)
            : new Date(),
      }));
      notificationsWithDates.sort((a, b) => b.createdAtDate - a.createdAtDate);
      const recentNotifications = notificationsWithDates.slice(0, 5);

      // Pending Invoices
      const pendingInvoicesList = invoices.filter((i) =>
        ["Sent", "Partially Paid"].includes(i.status),
      );
      const pendingInvoicesCount = pendingInvoicesList.length;
      const pendingInvoicesAmount = pendingInvoicesList.reduce(
        (sum, i) =>
          sum +
          ((Number(i.total_amount) || Number(i.amount) || 0) -
            (Number(i.paid_amount) || 0)),
        0,
      );

      // Upcoming renewals (retainers ending in 7 days)
      const todayMoment = moment().startOf("day");
      const sevenDaysLaterMoment = moment().add(7, "days").endOf("day");
      const upcomingRenewalsCount = retainers.filter((ret) => {
        if (ret.status !== "Active" || !ret.end_date) return false;
        const endDate = moment(ret.end_date);
        return endDate.isBetween(todayMoment, sevenDaysLaterMoment, null, "[]");
      }).length;

      // Overdue payments count
      const overduePaymentsCount = invoices.filter(
        (i) => i.status === "Overdue",
      ).length;

      // Monthly Revenue
      const currentMonthStr = moment().format("YYYY-MM");
      const monthlyRevenue = invoices
        .filter(
          (i) =>
            i.status === "Paid" &&
            i.due_date &&
            i.due_date.startsWith(currentMonthStr),
        )
        .reduce(
          (sum, i) => sum + (Number(i.total_amount) || Number(i.amount) || 0),
          0,
        );

      setStats({
        totalRevenue,
        totalClients: clients.length,
        activeProjects: projects.length,
        totalTasks: tasks.length,
        totalLeads: leads.length,
        openTickets: tickets.length,
        activeAMCs: amcs.length,
        billableHours,
        recentProjects: projects.slice(0, 5),
        recentInvoices: invoices.slice(0, 5),
        projectStatusData,
        invoiceStatusData,
        pendingInvoicesCount,
        pendingInvoicesAmount,
        upcomingRenewalsCount,
        overduePaymentsCount,
        totalNotificationsSent: userNotifications.length,
        monthlyRevenue,
        recentNotifications,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Loading Crownridge LLP…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {" "}
      <PageHeader
        title="Dashboard"
        description="Crownridge LLP — Business Overview"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
          icon={IndianRupee}
        />

        <StatCard title="Clients" value={stats.totalClients} icon={Users} />

        <StatCard
          title="Projects"
          value={stats.activeProjects}
          icon={FolderKanban}
        />

        <StatCard title="Tasks" value={stats.totalTasks} icon={Target} />

        <StatCard title="Tickets" value={stats.openTickets} icon={Ticket} />

        <StatCard title="AMCs" value={stats.activeAMCs} icon={Shield} />

        <StatCard title="Hours" value={stats.billableHours} icon={Clock} />

        <StatCard title="Leads" value={stats.totalLeads} icon={Receipt} />
      </div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-6 mb-1">
        Billing & Messaging Center Widgets
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Pending Invoices"
          value={stats.pendingInvoicesCount}
          subtitle={`Amt: ₹${stats.pendingInvoicesAmount.toLocaleString("en-IN")}`}
          icon={Receipt}
        />

        <StatCard
          title="Upcoming Renewals"
          value={stats.upcomingRenewalsCount}
          subtitle="Retainers ending soon"
          icon={Calendar}
        />

        <StatCard
          title="Overdue Payments"
          value={stats.overduePaymentsCount}
          subtitle="Past invoice deadline"
          icon={AlertTriangle}
          className="border-l-4 border-l-red-500"
        />

        <StatCard
          title="Notifications Sent"
          value={stats.totalNotificationsSent}
          subtitle="System alerts active"
          icon={Bell}
        />

        <StatCard
          title="Monthly Revenue"
          value={`₹${stats.monthlyRevenue.toLocaleString("en-IN")}`}
          subtitle={`Month: ${moment().format("MMMM")}`}
          icon={IndianRupee}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl p-5 shadow border border-border">
          <h3 className="font-semibold mb-4">Project Status Distribution</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.projectStatusData}
                dataKey="value"
                outerRadius={100}
              >
                {stats.projectStatusData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Notifications Widget Panel */}
        <div className="bg-card rounded-xl p-5 shadow border border-border flex flex-col justify-between">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Recent Alerts &
              Notifications
            </h3>

            {stats.recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active notifications or reminders.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentNotifications.map((notif) => {
                  const isOverdue = notif.type === "Overdue Invoice";
                  const isMsPending = notif.type === "Milestone Pending";
                  return (
                    <div
                      key={notif.id}
                      className={`text-xs border-l-2 p-2.5 rounded bg-muted/20 ${
                        isOverdue
                          ? "border-l-red-500"
                          : isMsPending
                            ? "border-l-orange-500"
                            : "border-l-primary"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-foreground truncate block max-w-[150px]">
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {moment(notif.createdAtDate).fromNow()}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {stats.recentNotifications.length > 0 && (
            <div className="pt-3 border-t border-border mt-3 text-center">
              <a
                href="/notifications"
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                View all notifications center →
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="bg-card rounded-xl p-5 shadow border border-border">
        <h3 className="font-semibold mb-4">Invoice Status Overview</h3>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.invoiceStatusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#4F46E5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
