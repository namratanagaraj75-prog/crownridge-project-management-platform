import React from "react";

const statusColors = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Contacted:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Qualified:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Proposal Sent":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Negotiation:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Planning: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Backlog: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "To Do": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "In Progress":
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "In Review": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Review:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Testing:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "On Hold": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Partially Paid":
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Invoiced: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Captured: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Billed: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Expiring Soon":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Expired: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Renewed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export default function StatusBadge({ status }) {
  const color =
    statusColors[status] ||
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}
    >
      {status}
    </span>
  );
}
