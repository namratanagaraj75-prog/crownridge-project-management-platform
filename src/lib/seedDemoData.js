import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import moment from "moment";

// Clean existing data from a collection (except configuration docs)
async function cleanCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  const deletePromises = [];
  snap.forEach((document) => {
    // Retain configuration in notifications
    if (collectionName === "notifications" && document.id === "emailjs_config") {
      return;
    }
    deletePromises.push(deleteDoc(doc(db, collectionName, document.id)));
  });
  await Promise.all(deletePromises);
}

export async function seedAllDemoData(currentUserUid, currentUserName = "Admin PM") {
  const collectionsToClean = [
    "clients",
    "projects",
    "leads",
    "milestones",
    "retainers",
    "timesheets",
    "supportTickets",
    "inprints", // old sprint names if any
    "sprints",
    "tasks",
    "invoices",
    "amcContracts",
    "messages",
    "notifications",
  ];

  console.log("Cleaning database collections...");
  for (const col of collectionsToClean) {
    try {
      await cleanCollection(col);
    } catch (e) {
      console.warn(`Could not clean collection ${col}:`, e);
    }
  }

  // 1. 10 CLIENTS
  const clientData = [
    { name: "Sarah Jenkins", company: "TechNova Solutions", email: "sarah@technova.com", phone: "+1 555-0101", industry: "Technology", address: "100 Tech Venture Way, Boston, MA", status: "Active", total_revenue: 125000 },
    { name: "Marcus Brody", company: "BlueWave Systems", email: "mbrody@bluewave.com", phone: "+1 555-0102", industry: "Healthcare", address: "42 Ocean Breeze Blvd, Miami, FL", status: "Active", total_revenue: 95000 },
    { name: "Elena Rostova", company: "Nexa Digital", email: "elena@nexadigital.com", phone: "+1 555-0103", industry: "Finance", address: "77 Financial Plaza, New York, NY", status: "Active", total_revenue: 142000 },
    { name: "Dr. David Vance", company: "Quantum Labs", email: "david@quantumlabs.com", phone: "+1 555-0104", industry: "Manufacturing", address: "205 Innovation Park, Austin, TX", status: "Active", total_revenue: 88000 },
    { name: "Linda Zhao", company: "CloudSync Technologies", email: "linda.zhao@cloudsync.io", phone: "+1 555-0105", industry: "Technology", address: "800 Cloud Vista Dr, San Francisco, CA", status: "Active", total_revenue: 160000 },
    { name: "Vikram Mehta", company: "Vertex Innovations", email: "vikram@vertexinnovations.in", phone: "+91 98765 43210", address: "Cyber Tower, Sector 62, Noida, UP", industry: "Education", status: "Active", total_revenue: 75000 },
    { name: "Robert Taylor", company: "PrimeSoft Solutions", email: "robert@primesoft.com", phone: "+1 555-0107", industry: "Retail", address: "12 Retail Corridor, Chicago, IL", status: "Active", total_revenue: 110000 },
    { name: "Alice Cooper", company: "FutureStack IT", email: "alice@futurestack.com", phone: "+44 20 7946 0192", address: "55 Tech Square, London, UK", industry: "Technology", status: "Active", total_revenue: 135000 },
    { name: "James Anderson", company: "Apex Consulting", email: "j.anderson@apexconsulting.com", phone: "+1 555-0109", industry: "Real Estate", address: "99 Pinnacle Heights, Denver, CO", status: "Active", total_revenue: 68000 },
    { name: "Nisha Patel", company: "BrightPath Technologies", email: "nisha@brightpath.in", phone: "+91 99887 76655", address: "Infotech Park, Hinjewadi, Pune", industry: "Media", status: "Active", total_revenue: 55000 },
  ];

  console.log("Seeding clients...");
  const clientIds = [];
  for (const client of clientData) {
    const docRef = await addDoc(collection(db, "clients"), {
      ...client,
      createdAt: serverTimestamp(),
    });
    clientIds.push({ id: docRef.id, name: client.name, company: client.company, email: client.email, phone: client.phone });
  }

  // 2. 10 PROJECTS
  const projectNames = [
    "AI Sales Dashboard",
    "CRM Management Platform",
    "Healthcare Portal",
    "Inventory Management System",
    "E-Commerce Website",
    "HR Management System",
    "School ERP",
    "Billing Automation Platform",
    "Customer Support Portal",
    "Data Analytics Dashboard",
  ];

  const projectDetails = [
    { billing_type: "Fixed Milestone", budget: 45000, progress: 85, status: "Review", priority: "High", desc: "AI-driven analytics dashboard mapping real-time enterprise sales metrics." },
    { billing_type: "Monthly Retainer", budget: 60000, progress: 60, status: "In Progress", priority: "Medium", desc: "Custom CRM architecture handling pipeline flows and custom lead qualification dashboards." },
    { billing_type: "Fixed Milestone", budget: 75000, progress: 95, status: "Testing", priority: "Critical", desc: "HIPAA-compliant online consultation and records vault client dashboard." },
    { billing_type: "Fixed Milestone", budget: 35000, progress: 100, status: "Completed", priority: "Medium", desc: "Stock levels alerting, QR code barcode scanner integration module." },
    { billing_type: "Hourly", budget: 40000, progress: 40, status: "In Progress", priority: "High", desc: "B2B shop portal complete with Stripe payment infrastructure and orders engine." },
    { billing_type: "Monthly Retainer", budget: 50000, progress: 75, status: "In Progress", priority: "Low", desc: "Timesheets tracking, candidate recruitment pipeline, and salaries ledger." },
    { billing_type: "Fixed Milestone", budget: 85000, progress: 20, status: "Planning", priority: "High", desc: "Comprehensive management system for student databases, fee receipts, and marks registers." },
    { billing_type: "Monthly Retainer", budget: 55000, progress: 90, status: "Review", priority: "Critical", desc: "Subscription invoicing ledger engine, multi-currency VAT ledger controller." },
    { billing_type: "Hourly", budget: 30000, progress: 100, status: "Completed", priority: "Medium", desc: "Helpdesk ticket automation with priority routing." },
    { billing_type: "Fixed Milestone", budget: 65000, progress: 10, status: "Planning", priority: "Low", desc: "Analytics board linking multiple client SQL data nodes for live queries." },
  ];

  console.log("Seeding projects...");
  const projectIds = [];
  for (let i = 0; i < 10; i++) {
    const client = clientIds[i];
    const details = projectDetails[i];
    const docRef = await addDoc(collection(db, "projects"), {
      name: projectNames[i],
      client_id: client.id,
      client_name: client.company,
      description: details.desc,
      status: details.status,
      priority: details.priority,
      billing_type: details.billing_type,
      budget: details.budget,
      progress: details.progress,
      start_date: moment().subtract(i + 1, "months").format("YYYY-MM-DD"),
      end_date: moment().add(i + 2, "months").format("YYYY-MM-DD"),
      project_manager: currentUserUid,
      tech_lead: "developer_member_id",
      team_members: currentUserUid + ",developer_member_id",
      createdAt: serverTimestamp(),
    });
    projectIds.push({ id: docRef.id, name: projectNames[i], clientId: client.id, clientCompany: client.company, clientEmail: client.email, clientPhone: client.phone, budget: details.budget });
  }

  // 3. 10 LEADS
  const leadData = [
    { name: "John Hammond", email: "hammond@ingen.com", phone: "+1 555-9080", company: "InGen Genomics", industry: "Healthcare", source: "Website", status: "Proposal Sent", score: 85, budget: 150000, urgency: "High", opportunity_value: 120000, notes: "Highly interested in proprietary healthcare tracking framework." },
    { name: "Bruce Wayne", email: "bruce@waynecorp.com", phone: "+1 555-1939", company: "Wayne Enterprises", industry: "Technology", source: "Referral", status: "Negotiation", score: 95, budget: 500000, urgency: "Critical", opportunity_value: 450000, notes: "Requires advanced satellite telemetry dashboard components." },
    { name: "Tony Stark", email: "tony@stark.com", phone: "+1 555-0815", company: "Stark Industries", industry: "Manufacturing", source: "LinkedIn", status: "Qualified", score: 90, budget: 250000, urgency: "High", opportunity_value: 200000, notes: "Inquiring about manufacturing supply chain automation modules." },
    { name: "Selina Kyle", email: "selina@catwalk.org", phone: "+1 555-2012", company: "Catwalk Fashion", industry: "Retail", source: "Cold Call", status: "Contacted", score: 65, budget: 45000, urgency: "Medium", opportunity_value: 40000, notes: "E-Commerce catalog updates proposal requested." },
    { name: "Charles Xavier", email: "professor@xavier.edu", phone: "+1 555-1963", company: "Xavier Institute", industry: "Education", source: "Event", status: "New", score: 75, budget: 95000, urgency: "Low", opportunity_value: 90000, notes: "Admissions system portal discussion initiated." },
    { name: "Clark Kent", email: "ckent@dailyplanet.com", phone: "+1 555-1938", company: "Daily Planet", industry: "Media", source: "Email Campaign", status: "Contacted", score: 50, budget: 35000, urgency: "Medium", opportunity_value: 30000, notes: "Editorial timesheets system query received." },
    { name: "Peter Parker", email: "peter@dailybugle.com", phone: "+1 555-1962", company: "Daily Bugle", industry: "Media", source: "Website", status: "Lost", score: 30, budget: 15000, urgency: "Low", opportunity_value: 12000, notes: "Budget too low for requested features. Marked lost." },
    { name: "Diana Prince", email: "diana@themyscira.gov", phone: "+1 555-1941", company: "Museum of Antiquities", industry: "Government", source: "Partner", status: "Won", score: 100, budget: 180000, urgency: "Medium", opportunity_value: 180000, notes: "Signed project agreement for historical archives records dashboard." },
    { name: "Arthur Curry", email: "arthur@atlantis.org", phone: "+1 555-0007", company: "Oceanic Shipping Co.", industry: "Other", source: "Other", status: "New", score: 40, budget: 60000, urgency: "Medium", opportunity_value: 50000, notes: "Interested in logistical charts tracking systems." },
    { name: "Barry Allen", email: "barry@star-labs.com", phone: "+1 555-2014", company: "STAR Laboratories", industry: "Technology", source: "Website", status: "Proposal Sent", score: 80, budget: 120000, urgency: "Critical", opportunity_value: 110000, notes: "Real-time telemetry speed charts platform required." },
  ];

  console.log("Seeding leads...");
  for (const lead of leadData) {
    await addDoc(collection(db, "leads"), {
      ...lead,
      assigned_to: currentUserUid,
      createdAt: serverTimestamp(),
    });
  }

  // 4. 10 MILESTONES
  const milestoneData = [
    { title: "UI/UX Figma Prototypes Approved", amount: 8000, status: "Completed", pct: 100, trigger: "Figma design sign-off" },
    { title: "Core Schema & Database Migration Complete", amount: 12000, status: "Completed", pct: 100, trigger: "Database design deployed to staging" },
    { title: "Backend API Endpoint Documentation Sign-off", amount: 15000, status: "In Progress", pct: 75, trigger: "Postman collections testing success" },
    { title: "Dashboard Live Integration Sandbox Complete", amount: 9000, status: "Pending", pct: 0, trigger: "Successful dry run presentation" },
    { title: "Stripe Payment Gateway Sandbox Integration", amount: 10000, status: "Completed", pct: 100, trigger: "Successful mock transactions audit" },
    { title: "Candidate Ledger Module Complete", amount: 14000, status: "Pending", pct: 25, trigger: "Payroll code integration pull request approved" },
    { title: "Student DB Integration & Fee System Complete", amount: 20000, status: "Pending", pct: 10, trigger: "Registrar testing completed" },
    { title: "Invoicing Ledgers Engine Completed & Tested", amount: 18000, status: "Completed", pct: 100, trigger: "Batch generator audit test success" },
    { title: "Helpdesk Ticketing Framework Core Functions", amount: 12000, status: "Completed", pct: 100, trigger: "Production deployment sign-off" },
    { title: "SQL Data Node Connector Protocol Completed", amount: 15000, status: "Pending", pct: 0, trigger: "Multi-node fetch test success" },
  ];

  console.log("Seeding milestones...");
  const milestoneIds = [];
  for (let i = 0; i < 10; i++) {
    const project = projectIds[i];
    const ms = milestoneData[i];
    const docRef = await addDoc(collection(db, "milestones"), {
      project_id: project.id,
      project_name: project.name,
      title: ms.title,
      description: `Target deliverables for milestone: ${ms.title}. Ensures SLA compliance.`,
      amount: ms.amount,
      due_date: moment().add(i + 1, "weeks").format("YYYY-MM-DD"),
      status: ms.status,
      completion_percentage: ms.pct,
      payment_trigger: ms.trigger,
      createdAt: serverTimestamp(),
    });
    milestoneIds.push({ id: docRef.id, title: ms.title, projectId: project.id, projectName: project.name, amount: ms.amount });
  }

  // 5. 10 RETAINER PLANS
  console.log("Seeding retainers...");
  const retainerIds = [];
  for (let i = 0; i < 10; i++) {
    const project = projectIds[i];
    const monthlyAmount = 2500 + i * 250;
    const docRef = await addDoc(collection(db, "retainers"), {
      project_id: project.id,
      project_name: project.name,
      client_id: project.clientId,
      client_name: project.clientCompany,
      monthly_amount: monthlyAmount,
      start_date: moment().subtract(i + 1, "months").format("YYYY-MM-DD"),
      end_date: moment().add(12 - (i + 1), "months").format("YYYY-MM-DD"),
      status: i === 9 ? "Expired" : "Active",
      notes: `Recurring monthly support retainer. Monthly billing value of ₹${monthlyAmount.toLocaleString()}.`,
      createdAt: serverTimestamp(),
    });
    retainerIds.push({ id: docRef.id, projectId: project.id, projectName: project.name, monthlyAmount });
  }

  // 6. INVOICES (at least 10 Paid invoices + others to populate graphs)
  const invoiceData = [
    // 10 Paid invoices to satisfy "10 Payment Records"
    { clientIndex: 0, projectIndex: 0, amount: 8000, billing: "Fixed Milestone", status: "Paid", num: "INV-100201" },
    { clientIndex: 1, projectIndex: 1, amount: 5000, billing: "Monthly Retainer", status: "Paid", num: "INV-100202" },
    { clientIndex: 2, projectIndex: 2, amount: 15000, billing: "Fixed Milestone", status: "Paid", num: "INV-100203" },
    { clientIndex: 3, projectIndex: 3, amount: 35000, billing: "Fixed Milestone", status: "Paid", num: "INV-100204" },
    { clientIndex: 4, projectIndex: 4, amount: 4000, billing: "Hourly", status: "Paid", num: "INV-100205" },
    { clientIndex: 5, projectIndex: 5, amount: 3500, billing: "Monthly Retainer", status: "Paid", num: "INV-100206" },
    { clientIndex: 6, projectIndex: 6, amount: 10000, billing: "Fixed Milestone", status: "Paid", num: "INV-100207" },
    { clientIndex: 7, projectIndex: 7, amount: 4250, billing: "Monthly Retainer", status: "Paid", num: "INV-100208" },
    { clientIndex: 8, projectIndex: 8, amount: 30000, billing: "Hourly", status: "Paid", num: "INV-100209" },
    { clientIndex: 9, projectIndex: 9, amount: 12000, billing: "Fixed Milestone", status: "Paid", num: "INV-100210" },

    // Sent/Pending/Overdue Invoices to make the dashboard analytics and graphs realistic
    { clientIndex: 0, projectIndex: 0, amount: 12000, billing: "Fixed Milestone", status: "Sent", num: "INV-100211" },
    { clientIndex: 1, projectIndex: 1, amount: 5000, billing: "Monthly Retainer", status: "Sent", num: "INV-100212" },
    { clientIndex: 2, projectIndex: 2, amount: 18000, billing: "Fixed Milestone", status: "Overdue", num: "INV-100213" },
    { clientIndex: 3, projectIndex: 3, amount: 7500, billing: "Fixed Milestone", status: "Draft", num: "INV-100214" },
  ];

  console.log("Seeding invoices...");
  for (const inv of invoiceData) {
    const client = clientIds[inv.clientIndex];
    const project = projectIds[inv.projectIndex];
    const taxRate = 18;
    const taxAmount = inv.amount * (taxRate / 100);
    const totalAmount = inv.amount + taxAmount;

    await addDoc(collection(db, "invoices"), {
      invoice_number: inv.num,
      client_id: client.id,
      client_name: client.company,
      client_email: client.email,
      project_id: project.id,
      project_name: project.name,
      billing_type: inv.billing,
      amount: inv.amount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: inv.status,
      due_date: inv.status === "Overdue"
        ? moment().subtract(10, "days").format("YYYY-MM-DD")
        : moment().add(15, "days").format("YYYY-MM-DD"),
      paid_amount: inv.status === "Paid" ? totalAmount : 0,
      paid_date: inv.status === "Paid" ? moment().subtract(5, "days").format("YYYY-MM-DD") : "",
      notes: `Invoice generated for project deliverables. System generated invoice ${inv.num}.`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 7. 10 TIMESHEET RECORDS
  const timesheetDescriptions = [
    "Integrated OpenAI API models, configured system prompt overrides.",
    "Refactored custom CRM query parameters to boost speed.",
    "Completed records encryption module and audit logger code.",
    "Designed and tested barcode scanner API endpoints.",
    "Mapped out billing configurations and Stripe webhooks.",
    "Constructed hiring ledger database structure & UI views.",
    "Drafted fee collections architecture.",
    "Assembled subscriptions ledger testing scripts.",
    "Configured custom priority router logic.",
    "Connected multi-node SQL pipelines and ran queries."
  ];

  const timesheetNames = [
    "Rahul Sharma",
    "John Doe",
    "Amit Patel",
    "Jane Smith",
    "Rahul Sharma",
    "Jane Smith",
    "John Doe",
    "Amit Patel",
    "Jane Smith",
    "Rahul Sharma"
  ];

  console.log("Seeding timesheets...");
  for (let i = 0; i < 10; i++) {
    const project = projectIds[i];
    const hours = 5 + (i % 4);
    await addDoc(collection(db, "timesheets"), {
      user_id: currentUserUid,
      user_name: timesheetNames[i],
      project_id: project.id,
      project_name: project.name,
      date: moment().subtract(i, "days").format("YYYY-MM-DD"),
      hours: hours,
      billable: i !== 8, // Make one non-billable
      description: timesheetDescriptions[i],
      status: "Approved",
      approved_by: currentUserUid,
      createdAt: serverTimestamp(),
    });
  }

  // 8. 10 SUPPORT TICKETS
  const ticketTitles = [
    "OpenAI API Key returns authentication error (401)",
    "CRM dashboard filters fail on mobile Safari",
    "HIPAA documents vault upload freezes at 99%",
    "Inventory Scanner crashes on scan of code 128",
    "B2B store fails to update Stripe payload pricing",
    "Timesheet validation rejects valid hours inputs",
    "ERP Student DB migration throws syntax error",
    "Multi-currency converter fails on GBP currency",
    "Helpdesk ticketing webhook repeats executions",
    "SQL Node Query timed out after 30 seconds"
  ];

  const ticketCategories = ["Bug", "Bug", "Incident", "Bug", "Bug", "Support", "Incident", "Bug", "Support", "Incident"];
  const ticketPriorities = ["Critical", "High", "High", "Medium", "Critical", "Low", "Critical", "Medium", "Low", "High"];
  const ticketStatuses = ["Open", "In Progress", "In Progress", "Resolved", "Resolved", "Open", "Open", "Waiting on Client", "Resolved", "Resolved"];

  console.log("Seeding support tickets...");
  for (let i = 0; i < 10; i++) {
    const project = projectIds[i];
    const client = clientIds[i];
    await addDoc(collection(db, "supportTickets"), {
      ticket_number: `TKT-${200400 + i}`,
      title: ticketTitles[i],
      description: `Detailed support request for "${ticketTitles[i]}". Client reported blockages. Required team audit.`,
      client_id: client.id,
      client_name: client.company,
      project_id: project.id,
      project_name: project.name,
      priority: ticketPriorities[i],
      status: ticketStatuses[i],
      assigned_to: currentUserUid,
      assigned_to_name: currentUserName,
      category: ticketCategories[i],
      sla_due_date: moment().add(3, "days").format("YYYY-MM-DD"),
      resolved_date: ["Resolved", "Closed"].includes(ticketStatuses[i])
        ? moment().subtract(1, "days").format("YYYY-MM-DD")
        : "",
      createdAt: serverTimestamp(),
    });
  }

  // 9. 10 SPRINTS
  console.log("Seeding sprints...");
  const sprintIds = [];
  for (let i = 0; i < 10; i++) {
    const project = projectIds[i];
    const docRef = await addDoc(collection(db, "sprints"), {
      project_id: project.id,
      project_name: project.name,
      name: `Sprint ${i + 1}: Core Deliverables`,
      goal: `Implement high-priority stories. Deliver milestone requirements for project: ${project.name}.`,
      start_date: moment().subtract(i * 10, "days").format("YYYY-MM-DD"),
      end_date: moment().subtract(i * 10, "days").add(14, "days").format("YYYY-MM-DD"),
      status: i === 0 ? "Active" : i < 4 ? "Completed" : "Planning",
      velocity: i < 4 ? 30 + i * 2 : 0,
      total_points: i === 0 ? 35 : i < 4 ? 28 : 15,
      completed_points: i === 0 ? 12 : i < 4 ? 28 : 0,
      createdAt: serverTimestamp(),
    });
    sprintIds.push({ id: docRef.id, name: `Sprint ${i + 1}`, projectId: project.id, projectName: project.name });
  }

  // 10. 10 SPRINT TASKS (So the sprint board/Kanban has cards!)
  const taskTitles = [
    "Configure API endpoint routes and validation headers",
    "Integrate Firestore client database schema bindings",
    "Refactor React routes layouts for mobile responsive views",
    "Design Figma boards mockup structures for feedback",
    "Validate Stripe webhook authorization protocols",
    "Write database collection migrations parameters",
    "Review student admission files schema validations",
    "Test multi-currency conversions pricing matrices",
    "Audit support ticketing webhooks routes security",
    "Troubleshoot SQL connector query performance bottlenecks"
  ];

  const taskStatuses = ["In Progress", "Done", "Review", "Todo", "Done", "In Progress", "Todo", "Review", "Done", "Done"];

  console.log("Seeding sprint tasks...");
  for (let i = 0; i < 10; i++) {
    const sprint = sprintIds[i % sprintIds.length];
    await addDoc(collection(db, "tasks"), {
      project_id: sprint.projectId,
      project_name: sprint.projectName,
      sprint_id: sprint.id,
      sprint_name: sprint.name,
      title: taskTitles[i],
      description: `SLA Task for: ${taskTitles[i]}. Assigned developers must complete coding, write unit tests, and obtain peer review sign-off.`,
      status: taskStatuses[i],
      points: [1, 2, 3, 5, 8][i % 5],
      priority: ["Medium", "High", "Critical", "Low"][i % 4],
      assigned_user_ids: [currentUserUid],
      assigned_users: [currentUserUid],
      createdAt: serverTimestamp(),
    });
  }

  // 11. 10 AMC CONTRACTS
  const amcCoverage = [
    "Security patches & database hotfixes",
    "SLA response within 2 hours, 24/7",
    "Cloud database backups and scale configurations",
    "Figma modifications, code optimizations, bugs repair",
    "Stripe integration maintenance, API updates",
    "Staff record maintenance support",
    "Server administration, monthly databases cleanup",
    "Multi-currency pricing nodes audit checks",
    "Custom priority ticketing upgrades support",
    "Multi-node data analytics pipelines integrity audit"
  ];

  console.log("Seeding AMC contracts...");
  for (let i = 0; i < 10; i++) {
    const client = clientIds[i];
    const project = projectIds[i];
    const amount = 5000 + i * 1000;
    await addDoc(collection(db, "amcContracts"), {
      client_id: client.id,
      client_name: client.company,
      project_id: project.id,
      project_name: project.name,
      contract_number: `AMC-${400200 + i}`,
      amount: amount,
      start_date: moment().subtract(i + 1, "months").format("YYYY-MM-DD"),
      end_date: moment().add(12 - (i + 1), "months").format("YYYY-MM-DD"),
      status: i === 8 ? "Expiring Soon" : i === 9 ? "Expired" : "Active",
      coverage: amcCoverage[i],
      support_hours: 40,
      used_hours: 5 + i * 3,
      notes: `Annual maintenance contract for project ${project.name}. Coverage: ${amcCoverage[i]}. Value: ₹${amount.toLocaleString()}/year.`,
      createdAt: serverTimestamp(),
    });
  }

  console.log("Seeding Completed Successfully! 110+ records added.");
  return true;
}
