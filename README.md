# MediQueue Clinical

**A production-grade Outpatient Appointment and Queue Management Platform.**

MediQueue Clinical is a comprehensive clinical management system designed to streamline the entire outpatient journey—from digital appointment booking and real-time queue tracking to electronic health records (EHR), pharmacy management, and telemedicine.

---

## 🚀 Key Features

### 🏥 Patient Portal
*   **Smart Scheduling:** Book appointments with specific doctors or departments.
*   **Live Queue Tracking:** Real-time updates on queue position via the web app.
*   **Digital Health Records:** Secure access to consultation history and prescriptions.
*   **Telemedicine:** Integrated video consultation rooms for remote care.

### 🩺 Physician Clinical Workstation
*   **Patient Triage:** Seamlessly manage incoming patients and consultation queues.
*   **Advanced EHR:** Intuitive SOAP notes (Subjective, Objective, Assessment, Plan) and vital signs tracking.
*   **Order Management:** Digital lab orders and pharmacy dispensing requests.
*   **Patient History:** Quick access to longitudinal patient records and previous consultations.

### ⚖️ Administration Console
*   **Scheduling Engine:** Manage doctor shifts, clinic hours, and department availability.
*   **Pharmacy & Lab:** End-to-end inventory management and laboratory workbench.
*   **Billing & SMS:** Automated billing summaries and SMS dispatch for queue notifications.
*   **Security & Audit:** Comprehensive audit logs and domain-restricted access control.

### 📺 Public Display Mode
*   **Waiting Hall TV:** Optimized fullscreen display for clinic waiting areas, showing live queue numbers and status updates.

---

## 🛠️ Technology Stack

*   **Frontend:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Backend:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) (Serverless Architecture)
*   **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
*   **Authentication:** [Firebase Auth](https://firebase.google.com/docs/auth) with JWT session management
*   **Icons:** [Lucide React](https://lucide.dev/)

---

## 📦 Deployment

This application is configured for deployment on **Vercel** with a serverless Express backend.

1.  **Environment Variables:** Define Firestore and Auth credentials in `.env`.
2.  **Build:** `npm run build`
3.  **Deploy:** Connect to Vercel via GitHub or CLI.

---

## 🔐 Security Notice

MediQueue Clinical enforces strict registration and access control to ensure data privacy and institutional integrity.

---

## 📝 Architecture

The system uses an **Isolated System Architecture**, allowing a single SPA to serve three distinct user roles (Patient, Doctor, Admin) through context-aware routing and role-based access control (RBAC).

---
*Built with the MediQueue Clinical Engine.*
