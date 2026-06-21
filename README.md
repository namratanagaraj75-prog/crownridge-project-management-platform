# Crownridge LLP - IT Project Retainer & Milestone Billing System

## Overview

The IT Project Retainer & Milestone Billing System is a comprehensive project management and billing platform developed for IT consulting and software service organizations.

The system helps organizations manage clients, projects, milestones, retainers, invoices, support tickets, timesheets, AMC contracts, and project delivery workflows from a single centralized dashboard.

It eliminates the need for multiple disconnected tools by providing project tracking, billing management, role-based access control, and AI-powered productivity features within one platform.

## Features

### Dashboard

* Business overview and analytics
* Revenue tracking
* Project status monitoring
* Invoice summary
* Support ticket statistics

### Client Management

* Add, edit, and manage clients
* Store client contact information
* Link clients to projects

### Project Management

* Create and manage projects
* Assign project owners
* Track project progress
* Project-based billing integration

### Sprint & Task Management

* Agile sprint planning
* Task assignment
* Priority management
* Status tracking
* Progress monitoring

### Milestone Billing

* Create project milestones
* Set payment triggers
* Track completion percentages
* Monitor milestone payments

### Retainer Management

* Monthly retainer contracts
* Start and end date tracking
* Automated billing workflow
* Contract monitoring

### Invoice Management

* Invoice creation
* Client-based invoicing
* Payment tracking
* Invoice status management
* Revenue reporting

### Timesheet Management

* Log work hours
* Billable hour tracking
* Employee productivity monitoring
* Project-wise time allocation

### Support Ticket System

* Ticket creation and management
* Priority tracking
* Resolution workflow
* Client issue management

### AMC Management

* Annual Maintenance Contract tracking
* Contract renewals
* Service monitoring
* Client support management

### AI Productivity Tools

* AI-generated content assistance
* Automated documentation support
* Productivity enhancement features

### Authentication & Security

* Firebase Authentication
* Secure login system
* Role-Based Access Control (RBAC)
* Protected routes

## User Roles

### Admin

* Full system access
* Manage users and permissions
* Access all modules

### Project Manager

* Manage projects and teams
* Billing and invoice access
* Sprint planning

### Developer

* View assigned projects
* Manage tasks and timesheets

### QA Engineer

* Test management
* Sprint participation
* Timesheet access

### Support Engineer

* Support ticket management
* Timesheet tracking

### Client

* View assigned projects
* View invoices
* Raise support tickets


## Technology Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* React Router

### Backend Services

* Firebase

### Authentication

* Firebase Authentication

### Database

* Cloud Firestore

### AI Integration

* Generative AI APIs

### Hosting

* Vercel

## Firestore Collections

users

clients

projects

milestones

retainers

invoices

sprints

tasks

timesheets

supportTickets

amcContracts

## System Architecture

Users

↓

React Frontend

↓

Firebase Authentication

↓

Firestore Database

↓

AI Services

↓

Reports & Analytics


Installation
Clone Repository
git clone https://github.com/namratanagaraj75-prog/crownridge-project-management-platform.git
Navigate to Project Directory
cd crownridge-project-management-platform
Install Dependencies
npm install
Configure Environment Variables

Create a .env.local file in the root directory and add:

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

Run Development Server
npm run dev



Completed
✅ Firebase Integration
✅ Firestore Database Setup
✅ Role-Based Authentication
✅ Dashboard Module
✅ Client Management
✅ Project Management
✅ Billing Management
✅ Invoice Management
✅ Sprint & Task Management
✅ Support Ticket System
✅ AI Productivity Tools


Author
Namrata N. S
B.Tech CSE (Data Engineering & Generative AI)
Internship Project – Crownridge LLP
2026

License
This project was developed for educational and internship purposes.
2026
