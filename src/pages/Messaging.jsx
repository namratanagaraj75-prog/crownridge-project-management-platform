import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  Mail,
  Send,
  User,
  Phone,
  Layers,
  History,
  FileText,
  Smartphone,
  Settings,
} from "lucide-react";
import moment from "moment";
import {
  sendEmailViaEmailJS,
  logEmailMessage,
  getEmailConfig,
  saveEmailConfig,
} from "@/lib/emailService";

// Email Templates list
const EMAIL_TEMPLATES = {
  invoice_generated: {
    label: "Invoice Generated",
    subject: "Invoice Generated — [Invoice Number]",
    body: 'Dear [Client Name],\n\nWe have generated invoice [Invoice Number] for the project "[Project Name]" in the amount of ₹[Amount] (including applicable taxes). The payment due date is [Due Date]. Please find the invoice details in your dashboard.\n\nBest regards,\nCrownridge LLP',
  },
  invoice_due: {
    label: "Invoice Due Reminder",
    subject: "Reminder: Invoice [Invoice Number] is Due",
    body: 'Dear [Client Name],\n\nThis is a friendly reminder that invoice [Invoice Number] for ₹[Amount] associated with project "[Project Name]" is due on [Due Date]. Please arrange for the payment to be processed.\n\nBest regards,\nCrownridge LLP',
  },
  milestone_completed: {
    label: "Milestone Completed",
    subject: "Milestone Completed: [Milestone Title]",
    body: 'Dear [Client Name],\n\nWe are pleased to inform you that the milestone "[Milestone Title]" for the project "[Project Name]" has been successfully completed! We have updated the project timeline accordingly.\n\nBest regards,\nCrownridge LLP',
  },
  milestone_pending: {
    label: "Milestone Payment Pending",
    subject: "Milestone Payment Pending: [Milestone Title]",
    body: 'Dear [Client Name],\n\nThis is a reminder that the payment for milestone "[Milestone Title]" under project "[Project Name]" (₹[Amount]) is currently pending. Please proceed with payment at your earliest convenience.\n\nBest regards,\nCrownridge LLP',
  },
  retainer_renewal: {
    label: "Retainer Renewal Reminder",
    subject: "Retainer Renewal Alert: [Project Name]",
    body: 'Dear [Client Name],\n\nThis is to notify you that your retainer agreement for the project "[Project Name]" is scheduled for renewal on [End Date]. The renewal monthly fee will be ₹[Monthly Amount]. Please let us know if you wish to adjust the scope.\n\nBest regards,\nCrownridge LLP',
  },
  status_update: {
    label: "Project Status Update",
    subject: "Status Update: [Project Name]",
    body: 'Dear [Client Name],\n\nHere is a status update for the project "[Project Name]". The current status is: [Status] ([Progress]% Completed).\n\nDetails:\n- Status: [Status]\n- Progress: [Progress]%\n- Start Date: [Start Date]\n- Estimated End Date: [End Date]\n\nBest regards,\nCrownridge LLP',
  },
};

// WhatsApp Templates list
const WHATSAPP_TEMPLATES = {
  invoice_reminder: {
    label: "Invoice Reminder",
    body: "Hello [Client Name], this is a quick reminder that invoice [Invoice Number] (₹[Amount]) is due on [Due Date]. Thank you for your partnership! - Crownridge LLP",
  },
  payment_received: {
    label: "Payment Confirmation",
    body: "Dear [Client Name], we have received your payment of ₹[Amount] for invoice [Invoice Number]. Thank you for your business! - Crownridge LLP",
  },
  milestone_done: {
    label: "Milestone Completion Notice",
    body: 'Hi [Client Name], we are excited to share that the milestone "[Milestone Title]" for project "[Project Name]" is now complete! - Crownridge LLP',
  },
  retainer_renew: {
    label: "Retainer Renewal Reminder",
    body: 'Hello [Client Name], your monthly retainer for project "[Project Name]" is due for renewal on [End Date]. The fee is ₹[Monthly Amount]/month. - Crownridge LLP',
  },
  project_update: {
    label: "Project Update",
    body: 'Hi [Client Name], here is the latest update for project "[Project Name]". It is currently "[Status]" with [Progress]% progress. - Crownridge LLP',
  },
};

export default function Messaging() {
  const { userProfile, role } = useAuth();
  const [tab, setTab] = useState("email");
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [messageLogs, setMessageLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // EmailJS Configuration Form state
  const [configForm, setConfigForm] = useState({
    serviceId: "",
    templateId: "",
    publicKey: "",
    recipientOverride: "",
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    clientId: "",
    projectId: "",
    invoiceId: "",
    milestoneId: "",
    retainerId: "",
    templateKey: "",
    recipientEmail: "",
    subject: "",
    body: "",
  });

  // WhatsApp form state
  const [whatsappForm, setWhatsappForm] = useState({
    clientId: "",
    projectId: "",
    invoiceId: "",
    milestoneId: "",
    retainerId: "",
    templateKey: "",
    clientName: "",
    phoneNumber: "",
    body: "",
  });

  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const cfg = await getEmailConfig();
    if (cfg) {
      setConfigForm({
        serviceId: cfg.serviceId || "",
        templateId: cfg.templateId || "",
        publicKey: cfg.publicKey || "",
        recipientOverride: cfg.recipientOverride || "",
      });
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await saveEmailConfig(configForm);
      toast({
        title: "Configuration Saved",
        description:
          "EmailJS API configuration updated successfully in Firestore and local settings.",
      });
    } catch (err) {
      toast({
        title: "Failed to save configuration",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        clientSnap,
        projectSnap,
        invoiceSnap,
        milestoneSnap,
        retainerSnap,
        messageSnap,
      ] = await Promise.all([
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "invoices")),
        getDocs(collection(db, "milestones")),
        getDocs(collection(db, "retainers")),
        getDocs(collection(db, "messages")),
      ]);

      const c = clientSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const p = projectSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const inv = invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const ms = milestoneSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const rt = retainerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const msg = messageSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAtDate: d.data().createdAt?.toDate
          ? d.data().createdAt.toDate()
          : d.data().createdAt
            ? new Date(d.data().createdAt)
            : new Date(),
      }));

      // Sort logs by newest
      msg.sort((a, b) => b.createdAtDate - a.createdAtDate);

      setClients(c);
      setProjects(p);
      setInvoices(inv);
      setMilestones(ms);
      setRetainers(rt);
      setMessageLogs(msg);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Failed to load database records",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Interpolate helper
  const getInterpolatedValues = (
    clientId,
    projectId,
    invoiceId,
    milestoneId,
    retainerId,
  ) => {
    const client = clients.find((c) => c.id === clientId) || {};
    const project = projects.find((p) => p.id === projectId) || {};
    const invoice = invoices.find((i) => i.id === invoiceId) || {};
    const milestone = milestones.find((m) => m.id === milestoneId) || {};
    const retainer = retainers.find((r) => r.id === retainerId) || {};

    return {
      "[Client Name]": client.name || client.company || "Client",
      "[Project Name]": project.name || "Project",
      "[Invoice Number]": invoice.invoice_number || invoice.id || "INV-XXXXXX",
      "[Amount]": (
        invoice.total_amount ||
        invoice.amount ||
        0
      ).toLocaleString(),
      "[Due Date]": invoice.due_date || "due date",
      "[Milestone Title]": milestone.title || "Milestone",
      "[End Date]": retainer.end_date || "renewal date",
      "[Monthly Amount]": (retainer.monthly_amount || 0).toLocaleString(),
      "[Status]": project.status || "Planning",
      "[Progress]": String(project.progress || 0),
      "[Start Date]": project.start_date || "start date",
    };
  };

  const interpolateString = (str, values) => {
    let result = str;
    Object.entries(values).forEach(([placeholder, val]) => {
      result = result.replaceAll(placeholder, val);
    });
    return result;
  };

  // Handle template selection in Email
  const handleEmailTemplateChange = (val) => {
    const template = EMAIL_TEMPLATES[val];
    if (!template) return;

    const values = getInterpolatedValues(
      emailForm.clientId,
      emailForm.projectId,
      emailForm.invoiceId,
      emailForm.milestoneId,
      emailForm.retainerId,
    );

    setEmailForm((prev) => ({
      ...prev,
      templateKey: val,
      subject: interpolateString(template.subject, values),
      body: interpolateString(template.body, values),
    }));
  };

  // Handle template selection in WhatsApp
  const handleWhatsappTemplateChange = (val) => {
    const template = WHATSAPP_TEMPLATES[val];
    if (!template) return;

    const values = getInterpolatedValues(
      whatsappForm.clientId,
      whatsappForm.projectId,
      whatsappForm.invoiceId,
      whatsappForm.milestoneId,
      whatsappForm.retainerId,
    );

    setWhatsappForm((prev) => ({
      ...prev,
      templateKey: val,
      body: interpolateString(template.body, values),
    }));
  };

  // Re-run interpolation when linked entities change
  useEffect(() => {
    if (emailForm.templateKey) {
      handleEmailTemplateChange(emailForm.templateKey);
    }
  }, [
    emailForm.clientId,
    emailForm.projectId,
    emailForm.invoiceId,
    emailForm.milestoneId,
    emailForm.retainerId,
  ]);

  useEffect(() => {
    if (whatsappForm.templateKey) {
      handleWhatsappTemplateChange(whatsappForm.templateKey);
    }
  }, [
    whatsappForm.clientId,
    whatsappForm.projectId,
    whatsappForm.invoiceId,
    whatsappForm.milestoneId,
    whatsappForm.retainerId,
  ]);

  // Handle client selection in Email (auto fills email address)
  const handleEmailClientChange = (cId) => {
    const client = clients.find((c) => c.id === cId);
    setEmailForm((prev) => ({
      ...prev,
      clientId: cId,
      recipientEmail: client?.email || "",
    }));
  };

  // Handle client selection in WhatsApp (auto fills phone & name)
  const handleWhatsappClientChange = (cId) => {
    const client = clients.find((c) => c.id === cId);
    setWhatsappForm((prev) => ({
      ...prev,
      clientId: cId,
      clientName: client?.name || "",
      phoneNumber: client?.phone || "",
    }));
  };

  // Send Email Action (Calling real EmailJS & logging status)
  const handleSendEmail = async () => {
    setSending(true);
    try {
      // 1. Deliver actual email using real EmailJS API
      await sendEmailViaEmailJS({
        to_email: emailForm.recipientEmail,
        subject: emailForm.subject,
        message: emailForm.body,
      });

      // 2. Log message as Sent in Firestore
      await logEmailMessage({
        to_email: emailForm.recipientEmail,
        subject: emailForm.subject,
        message: emailForm.body,
        status: "Sent",
      });

      toast({
        title: "Email Delivered Successfully",
        description: `Notification email successfully sent to: ${emailForm.recipientEmail}`,
      });

      // Clear Form
      setEmailForm({
        clientId: "",
        projectId: "",
        invoiceId: "",
        milestoneId: "",
        retainerId: "",
        templateKey: "",
        recipientEmail: "",
        subject: "",
        body: "",
      });

      await loadData();
    } catch (error) {
      console.error("Email delivery failed:", error);

      // Log failed attempt in Firestore for history log audit
      await logEmailMessage({
        to_email: emailForm.recipientEmail,
        subject: emailForm.subject,
        message: emailForm.body,
        status: "Failed",
        errorMsg: error.message,
      });

      toast({
        title: "Email Delivery Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Send WhatsApp Action
  const handleSendWhatsapp = async () => {
    setSending(true);
    try {
      // Log in messages history
      await addDoc(collection(db, "messages"), {
        type: "whatsapp",
        title: `WhatsApp: ${
          WHATSAPP_TEMPLATES[whatsappForm.templateKey]?.label || "Notification"
        }`,
        message: whatsappForm.body,
        recipient: `${whatsappForm.phoneNumber} (${whatsappForm.clientName})`,
        status: "Sent",
        createdAt: serverTimestamp(),
      });

      // Open WhatsApp click-to-chat
      const cleanedPhone = whatsappForm.phoneNumber.replace(/[^0-9]/g, "");
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(
        whatsappForm.body,
      )}`;

      window.open(whatsappUrl, "_blank");

      toast({
        title: "WhatsApp Click-To-Chat Launched",
        description:
          "Message logged in database and redirected to WhatsApp Web/App.",
      });

      // Clear Form
      setWhatsappForm({
        clientId: "",
        projectId: "",
        invoiceId: "",
        milestoneId: "",
        retainerId: "",
        templateKey: "",
        clientName: "",
        phoneNumber: "",
        body: "",
      });

      await loadData();
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to send WhatsApp message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
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
        title="Messaging Center"
        description="Configure templates, preview messages, and send communications to clients"
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="email" className="flex gap-2">
            <Mail className="w-4 h-4" />
            Email Dispatcher
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex gap-2">
            <MessageSquare className="w-4 h-4" />
            WhatsApp Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="flex gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* --- EMAIL DISPATCHER --- */}
        <TabsContent value="email" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-heading font-semibold text-sm">
                Compose Client Email
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Client *</Label>
                  <Select
                    value={emailForm.clientId}
                    onValueChange={handleEmailClientChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.company})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recipient Email *</Label>
                  <Input
                    value={emailForm.recipientEmail}
                    onChange={(e) =>
                      setEmailForm({
                        ...emailForm,
                        recipientEmail: e.target.value,
                      })
                    }
                    placeholder="client@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Project Reference</Label>
                  <Select
                    value={emailForm.projectId}
                    onValueChange={(val) =>
                      setEmailForm({ ...emailForm, projectId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Project (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter(
                          (p) =>
                            !emailForm.clientId ||
                            p.client_id === emailForm.clientId,
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Template *</Label>
                  <Select
                    value={emailForm.templateKey}
                    onValueChange={handleEmailTemplateChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Email Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EMAIL_TEMPLATES).map(([key, item]) => (
                        <SelectItem key={key} value={key}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced References for interpolation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <Label className="text-xs">Invoice Ref</Label>
                  <Select
                    value={emailForm.invoiceId}
                    onValueChange={(val) =>
                      setEmailForm({ ...emailForm, invoiceId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Link Invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices
                        .filter(
                          (i) =>
                            !emailForm.clientId ||
                            i.client_id === emailForm.clientId,
                        )
                        .map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.invoice_number || i.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Milestone Ref</Label>
                  <Select
                    value={emailForm.milestoneId}
                    onValueChange={(val) =>
                      setEmailForm({ ...emailForm, milestoneId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Link Milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      {milestones
                        .filter(
                          (m) =>
                            !emailForm.projectId ||
                            m.project_id === emailForm.projectId,
                        )
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Retainer Ref</Label>
                  <Select
                    value={emailForm.retainerId}
                    onValueChange={(val) =>
                      setEmailForm({ ...emailForm, retainerId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Link Retainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {retainers
                        .filter(
                          (r) =>
                            !emailForm.projectId ||
                            r.project_id === emailForm.projectId,
                        )
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            ₹{(r.monthly_amount || 0).toLocaleString()}/mo
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <div>
                  <Label>Email Subject</Label>
                  <Input
                    value={emailForm.subject}
                    onChange={(e) =>
                      setEmailForm({ ...emailForm, subject: e.target.value })
                    }
                    placeholder="Enter email subject"
                  />
                </div>

                <div>
                  <Label>Message Body</Label>
                  <Textarea
                    value={emailForm.body}
                    onChange={(e) =>
                      setEmailForm({ ...emailForm, body: e.target.value })
                    }
                    rows={8}
                    className="font-sans text-sm border-border"
                    placeholder="Write your message here..."
                  />
                </div>
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={
                  sending ||
                  !emailForm.recipientEmail ||
                  !emailForm.subject ||
                  !emailForm.body
                }
                className="w-full flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Log & Send Email Notification"}
              </Button>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 h-fit">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <FileText className="w-4 h-4" /> Template Key Guides
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When selection handles occur, placeholders are automatically
                swapped. You can also edit the text directly.
              </p>
              <div className="space-y-2 text-xs border border-border bg-muted/30 rounded-lg p-3">
                <p className="font-semibold text-muted-foreground">
                  Supported Placeholders:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground/80 font-mono text-[10px]">
                  <li>[Client Name]</li>
                  <li>[Project Name]</li>
                  <li>[Invoice Number]</li>
                  <li>[Amount]</li>
                  <li>[Due Date]</li>
                  <li>[Milestone Title]</li>
                  <li>[End Date]</li>
                  <li>[Monthly Amount]</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- WHATSAPP TEMPLATES --- */}
        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-heading font-semibold text-sm">
                Send WhatsApp Template
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Select
                    value={whatsappForm.clientId}
                    onValueChange={handleWhatsappClientChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.company})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    value={whatsappForm.phoneNumber}
                    onChange={(e) =>
                      setWhatsappForm({
                        ...whatsappForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    placeholder="+919876543210 (Country code included)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Project Link</Label>
                  <Select
                    value={whatsappForm.projectId}
                    onValueChange={(val) =>
                      setWhatsappForm({ ...whatsappForm, projectId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Project (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter(
                          (p) =>
                            !whatsappForm.clientId ||
                            p.client_id === whatsappForm.clientId,
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Message Template *</Label>
                  <Select
                    value={whatsappForm.templateKey}
                    onValueChange={handleWhatsappTemplateChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WHATSAPP_TEMPLATES).map(([key, item]) => (
                        <SelectItem key={key} value={key}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced References for interpolation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <Label className="text-xs">Invoice Ref</Label>
                  <Select
                    value={whatsappForm.invoiceId}
                    onValueChange={(val) =>
                      setWhatsappForm({ ...whatsappForm, invoiceId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Link Invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices
                        .filter(
                          (i) =>
                            !whatsappForm.clientId ||
                            i.client_id === whatsappForm.clientId,
                        )
                        .map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.invoice_number || i.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Milestone Ref</Label>
                  <Select
                    value={whatsappForm.milestoneId}
                    onValueChange={(val) =>
                      setWhatsappForm({ ...whatsappForm, milestoneId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Link Milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      {milestones
                        .filter(
                          (m) =>
                            !whatsappForm.projectId ||
                            m.project_id === whatsappForm.projectId,
                        )
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Retainer Ref</Label>
                  <Select
                    value={whatsappForm.retainerId}
                    onValueChange={(val) =>
                      setWhatsappForm({ ...whatsappForm, retainerId: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Link Retainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {retainers
                        .filter(
                          (r) =>
                            !whatsappForm.projectId ||
                            r.project_id === whatsappForm.projectId,
                        )
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            ₹{(r.monthly_amount || 0).toLocaleString()}/mo
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label>Template Body Preview (Editable)</Label>
                <Textarea
                  value={whatsappForm.body}
                  onChange={(e) =>
                    setWhatsappForm({ ...whatsappForm, body: e.target.value })
                  }
                  rows={4}
                  className="font-sans text-sm border-border mt-1"
                  placeholder="Body content appears here..."
                />
              </div>

              <Button
                onClick={handleSendWhatsapp}
                disabled={
                  sending || !whatsappForm.phoneNumber || !whatsappForm.body
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 shadow"
              >
                <Smartphone className="w-4 h-4" />
                {sending ? "Processing..." : "Open WhatsApp & Log Message"}
              </Button>
            </div>

            {/* Live Message Preview */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 h-fit flex flex-col items-center">
              <h4 className="font-semibold text-sm self-start flex items-center gap-2 text-green-600">
                <MessageSquare className="w-4 h-4" /> WhatsApp Live Preview
              </h4>
              <div className="w-full max-w-[280px] bg-[#ece5dd] rounded-lg p-3 shadow-inner relative border border-gray-300">
                {/* Header */}
                <div className="flex items-center gap-2 bg-[#075e54] text-white px-2 py-1.5 -mx-3 -mt-3 rounded-t-lg text-xs font-semibold">
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-700 font-bold">
                    PM
                  </div>
                  <div>
                    <p className="truncate w-36">
                      {whatsappForm.clientName || "Client Business"}
                    </p>
                    <p className="text-[8px] font-normal text-green-200">
                      online
                    </p>
                  </div>
                </div>

                {/* Message Balloon */}
                <div className="relative bg-white text-black p-2.5 rounded-lg mt-3 text-xs shadow-sm max-w-[90%] before:content-[''] before:absolute before:-left-1.5 before:top-2.5 before:border-4 before:border-transparent before:border-r-white before:border-t-white">
                  <p className="whitespace-pre-line leading-normal">
                    {whatsappForm.body ||
                      "Please select a client, template and configure variables to preview the message balloon..."}
                  </p>
                  <p className="text-[8px] text-gray-400 text-right mt-1">
                    {moment().format("LT")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* --- CONFIGURATION TAB --- */}
        <TabsContent value="config" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm max-w-xl">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              EmailJS Integration Credentials
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your actual EmailJS account to enable real email
              transmission. If Recipient Override is provided, all emails
              generated by billing actions or manually sent will be directed to
              this test address instead.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <Label>Service ID *</Label>
                <Input
                  value={configForm.serviceId}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, serviceId: e.target.value })
                  }
                  placeholder="e.g. service_gmail"
                />
              </div>

              <div>
                <Label>Template ID *</Label>
                <Input
                  value={configForm.templateId}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, templateId: e.target.value })
                  }
                  placeholder="e.g. template_billing"
                />
              </div>

              <div>
                <Label>Public Key (User ID) *</Label>
                <Input
                  value={configForm.publicKey}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, publicKey: e.target.value })
                  }
                  placeholder="e.g. user_u8X9asDfj81"
                />
              </div>

              <div>
                <Label>Recipient Email Override (For Testing)</Label>
                <Input
                  value={configForm.recipientOverride}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      recipientOverride: e.target.value,
                    })
                  }
                  placeholder="e.g. test-inbox@yourdomain.com"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty to send directly to actual client inboxes.
                </p>
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={
                  savingConfig ||
                  !configForm.serviceId ||
                  !configForm.templateId ||
                  !configForm.publicKey
                }
                className="w-full mt-2"
              >
                {savingConfig
                  ? "Saving Configuration..."
                  : "Save Configuration Settings"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- LOG HISTORY --- */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Message Transmission History Log
        </h3>

        {messageLogs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No messages sent yet"
            description="Transmitted email notifications and WhatsApp logs will display here."
          />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">
                      Recipient
                    </th>
                    <th className="text-left p-4 font-semibold text-muted-foreground w-1/3">
                      Subject/Template
                    </th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">
                      Message Body Preview
                    </th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">
                      Sent Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {messageLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {log.type === "email" ? (
                            <Mail className="w-4 h-4 text-primary" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-green-600" />
                          )}
                          <span className="font-semibold text-xs capitalize">
                            {log.type}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground truncate max-w-[150px]">
                        {log.recipient}
                      </td>
                      <td className="p-4 font-medium text-xs truncate max-w-[200px] text-foreground">
                        {log.title}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground truncate max-w-[300px]">
                        {log.message}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                        {moment(log.createdAtDate).format("lll")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
