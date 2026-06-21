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
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import {
  Bell,
  Search,
  FileWarning,
  Calendar,
  DollarSign,
  Award,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
} from "lucide-react";
import moment from "moment";
import { sendEmailViaEmailJS, logEmailMessage } from "@/lib/emailService";

const NOTIFICATION_TYPES = [
  "Invoice Due",
  "Overdue Invoice",
  "Retainer Renewal",
  "Milestone Pending",
  "Invoice Generated",
  "Milestone Completed",
  "Project Status Update",
];

const STATUSES = ["Sent", "Pending", "Failed"];

export default function Notifications() {
  const { userProfile, role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingReminders, setCheckingReminders] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, [userProfile, role]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "notifications"));
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Normalize createdAt to date or string
        createdAtDate: d.data().createdAt?.toDate
          ? d.data().createdAt.toDate()
          : d.data().createdAt
            ? new Date(d.data().createdAt)
            : new Date(),
      }));

      // Filter by recipient for client roles
      const clientEmail = userProfile?.email || "";
      const filteredData = data.filter((notif) => {
        if (role === "client") {
          return (
            notif.recipient?.toLowerCase() === clientEmail.toLowerCase() ||
            notif.recipient === "client" ||
            notif.client_id === userProfile?.client_id
          );
        }
        return true; // admin, PM, support, etc., see all
      });

      // Sort by newest
      filteredData.sort((a, b) => b.createdAtDate - a.createdAtDate);
      setNotifications(filteredData);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({
        title: "Failed to load notifications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to send the email and save to notifications + message logs
  const createAndDeliverNotification = async (payload) => {
    let status = "Sent";
    let errorMsg = "";

    try {
      // Trigger EmailJS REST API
      await sendEmailViaEmailJS({
        to_email: payload.recipient,
        subject: payload.title,
        message: payload.message,
      });

      // Log in messages history
      await logEmailMessage({
        to_email: payload.recipient,
        subject: payload.title,
        message: payload.message,
        status: "Sent",
      });
    } catch (err) {
      console.error("Automated notification email delivery failed:", err);
      status = "Failed";
      errorMsg = err.message;

      // Log failure in history
      await logEmailMessage({
        to_email: payload.recipient,
        subject: payload.title,
        message: payload.message,
        status: "Failed",
        errorMsg: err.message,
      });
    }

    // Write notification item to DB
    await addDoc(collection(db, "notifications"), {
      ...payload,
      status,
      ...(errorMsg ? { error: errorMsg } : {}),
      createdAt: serverTimestamp(),
    });
  };

  // Manual resend / delivery trigger from UI action button
  const handleDeliverEmail = async (notif) => {
    try {
      toast({
        title: "Delivering Email",
        description: `Attempting transmission to ${notif.recipient}...`,
      });

      await sendEmailViaEmailJS({
        to_email: notif.recipient,
        subject: notif.title,
        message: notif.message,
      });

      // Update notification status to Sent in DB
      const notifRef = doc(db, "notifications", notif.id);
      await updateDoc(notifRef, {
        status: "Sent",
        error: "",
        updatedAt: serverTimestamp(),
      });

      // Log in message history log
      await logEmailMessage({
        to_email: notif.recipient,
        subject: notif.title,
        message: notif.message,
        status: "Sent",
      });

      toast({
        title: "Email Delivered Successfully",
        description: `Successfully delivered reminder email to ${notif.recipient}`,
      });
      await loadNotifications();
    } catch (err) {
      console.error("Manual retry failed:", err);

      // Update DB to status Failed with error message
      const notifRef = doc(db, "notifications", notif.id);
      await updateDoc(notifRef, {
        status: "Failed",
        error: err.message,
        updatedAt: serverTimestamp(),
      });

      // Log failed transmission attempt
      await logEmailMessage({
        to_email: notif.recipient,
        subject: notif.title,
        message: notif.message,
        status: "Failed",
        errorMsg: err.message,
      });

      toast({
        title: "Delivery Failed",
        description: err.message,
        variant: "destructive",
      });
      await loadNotifications();
    }
  };

  // Automated Reminder System
  const triggerAutomatedRemindersCheck = async () => {
    if (!["admin", "project_manager"].includes(role)) return;
    setCheckingReminders(true);
    try {
      // 1. Fetch Invoices, Milestones, Retainers, and existing notifications trigger keys
      const [invoiceSnap, milestoneSnap, retainerSnap, notifSnap] = await Promise.all([
        getDocs(collection(db, "invoices")),
        getDocs(collection(db, "milestones")),
        getDocs(collection(db, "retainers")),
        getDocs(collection(db, "notifications")),
      ]);

      const invoices = invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const milestones = milestoneSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const retainers = retainerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const existingKeys = new Set(
        notifSnap.docs.map((d) => d.data().triggerKey).filter(Boolean)
      );

      const today = moment().startOf("day");
      const threeDaysLater = moment().add(3, "days").endOf("day");
      const sevenDaysLater = moment().add(7, "days").endOf("day");
      let remindersCreatedCount = 0;

      // 2. Check Overdue Invoices
      for (const inv of invoices) {
        if (!inv.due_date || ["Paid", "Cancelled", "Draft"].includes(inv.status)) continue;
        const dueDate = moment(inv.due_date);
        if (dueDate.isBefore(today)) {
          const triggerKey = `overdue_invoice_${inv.id}_${inv.due_date}`;
          if (!existingKeys.has(triggerKey)) {
            await createAndDeliverNotification({
              type: "Overdue Invoice",
              title: `Overdue Invoice: ${inv.invoice_number || inv.id}`,
              message: `Invoice ${inv.invoice_number || inv.id} for client ${
                inv.client_name || "Client"
              } was due on ${inv.due_date} and is currently overdue. Amount: ₹${(
                inv.total_amount || inv.amount || 0
              ).toLocaleString('en-IN')}`,
              recipient: inv.client_email || inv.recipient || "admin",
              client_id: inv.client_id || "",
              triggerKey,
            });
            remindersCreatedCount++;
          }
        }
      }

      // 3. Check Upcoming Invoices (due in next 3 days)
      for (const inv of invoices) {
        if (!inv.due_date || ["Paid", "Cancelled", "Draft"].includes(inv.status)) continue;
        const dueDate = moment(inv.due_date);
        if (dueDate.isBetween(today, threeDaysLater, null, "[]")) {
          const triggerKey = `upcoming_invoice_${inv.id}_${inv.due_date}`;
          if (!existingKeys.has(triggerKey)) {
            await createAndDeliverNotification({
              type: "Invoice Due",
              title: `Upcoming Invoice Due: ${inv.invoice_number || inv.id}`,
              message: `Invoice ${inv.invoice_number || inv.id} for client ${
                inv.client_name || "Client"
              } is due on ${inv.due_date}. Amount: ₹${(
                inv.total_amount || inv.amount || 0
              ).toLocaleString('en-IN')}`,
              recipient: inv.client_email || inv.recipient || "admin",
              client_id: inv.client_id || "",
              triggerKey,
            });
            remindersCreatedCount++;
          }
        }
      }

      // 4. Check Retainer Renewals (ending in next 7 days)
      for (const ret of retainers) {
        if (!ret.end_date || ret.status !== "Active") continue;
        const endDate = moment(ret.end_date);
        if (endDate.isBetween(today, sevenDaysLater, null, "[]")) {
          const triggerKey = `retainer_renewal_${ret.id}_${ret.end_date}`;
          if (!existingKeys.has(triggerKey)) {
            await createAndDeliverNotification({
              type: "Retainer Renewal",
              title: `Retainer Renewal Alert: ${ret.project_name || "Project"}`,
              message: `Monthly Retainer for project ${
                ret.project_name || "Project"
              } is ending soon on ${ret.end_date}. Monthly budget: ₹${(
                ret.monthly_amount || 0
              ).toLocaleString('en-IN')}`,
              recipient: "admin",
              client_id: ret.client_id || "",
              triggerKey,
            });
            remindersCreatedCount++;
          }
        }
      }

      // 5. Check Pending Milestone Payments
      for (const ms of milestones) {
        if (ms.status !== "Completed") continue;
        const triggerKey = `milestone_payment_pending_${ms.id}`;
        if (!existingKeys.has(triggerKey)) {
          await createAndDeliverNotification({
            type: "Milestone Pending",
            title: `Milestone Payment Pending: ${ms.title}`,
            message: `Milestone "${ms.title}" for project "${
              ms.project_name
            }" is completed but has not been invoiced or paid yet. Amount: ₹${(
              ms.amount || 0
            ).toLocaleString('en-IN')}`,
            recipient: "admin",
            client_id: ms.client_id || "",
            triggerKey,
          });
          remindersCreatedCount++;
        }
      }

      if (remindersCreatedCount > 0) {
        toast({
          title: "Automated Reminders Generated",
          description: `Successfully checked and generated ${remindersCreatedCount} new reminders.`,
        });
        await loadNotifications();
      } else {
        toast({
          title: "Check Complete",
          description: "No new reminders or alerts to generate.",
        });
      }
    } catch (error) {
      console.error("Error generating reminders:", error);
      toast({
        title: "Reminder Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCheckingReminders(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const notifRef = doc(db, "notifications", id);
      await updateDoc(notifRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: `Notification marked as ${newStatus}`,
      });
      await loadNotifications();
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      toast({
        title: "Notification deleted",
      });
      await loadNotifications();
    } catch (error) {
      console.error(error);
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterStatus !== "all" && n.status !== filterStatus) return false;
    if (
      search &&
      !n.title?.toLowerCase().includes(search.toLowerCase()) &&
      !n.message?.toLowerCase().includes(search.toLowerCase()) &&
      !n.recipient?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case "Overdue Invoice":
        return <FileWarning className="w-5 h-5 text-red-500" />;
      case "Invoice Due":
      case "Invoice Generated":
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case "Retainer Renewal":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "Milestone Pending":
      case "Milestone Completed":
        return <Award className="w-5 h-5 text-orange-500" />;
      case "Project Status Update":
        return <Clock className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-amber-500" />;
    }
  };

  const totalCount = notifications.length;
  const sentCount = notifications.filter((n) => n.status === "Sent").length;
  const pendingCount = notifications.filter((n) => n.status === "Pending").length;
  const failedCount = notifications.filter((n) => n.status === "Failed").length;

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
        title="Notifications Center"
        description="View system alerts, automated billing reminders, and updates"
        actions={
          ["admin", "project_manager"].includes(role) && (
            <Button
              onClick={triggerAutomatedRemindersCheck}
              disabled={checkingReminders}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${checkingReminders ? "animate-spin" : ""}`}
              />
              Generate Reminders
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Notifications" value={totalCount} icon={Bell} />
        <StatCard
          title="Sent Successfully"
          value={sentCount}
          icon={CheckCircle}
          className="border-l-4 border-l-green-500"
        />
        <StatCard
          title="Pending Queue"
          value={pendingCount}
          icon={Clock}
          className="border-l-4 border-l-amber-500"
        />
        <StatCard
          title="Failed Attempts"
          value={failedCount}
          icon={FileWarning}
          className="border-l-4 border-l-red-500"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts, messages or recipients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-sm"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border text-sm">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border text-sm">
            <SelectValue placeholder="Filter by Status" />
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
          icon={Bell}
          title="No notifications match filters"
          description="Try modifying search queries or checking for reminders."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground w-1/2">
                    Notification Details
                  </th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Recipient</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Timestamp</th>
                  {["admin", "project_manager"].includes(role) && (
                    <th className="text-right p-4 font-semibold text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((notif) => (
                  <tr key={notif.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getIcon(notif.type)}
                        <span className="font-medium text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                          {notif.type}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
                      {notif.recipient}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <StatusBadge status={notif.status} />
                    </td>
                    <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                      {moment(notif.createdAtDate).format("lll")}
                    </td>
                    {["admin", "project_manager"].includes(role) && (
                      <td className="p-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                            onClick={() => handleDeliverEmail(notif)}
                          >
                            {notif.status === "Failed" ? "Retry Email" : "Send Email"}
                          </Button>
                          {notif.status !== "Sent" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => handleUpdateStatus(notif.id, "Sent")}
                            >
                              Sent
                            </Button>
                          )}
                          {notif.status !== "Failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleUpdateStatus(notif.id, "Failed")}
                            >
                              Fail
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDelete(notif.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
