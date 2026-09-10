# MediQueue — Clinic Appointment & Queue Management System

**MediQueue** is an all-in-one clinic management platform that coordinates appointment scheduling, live digital queueing, physician clinical consultations, diagnostic requisitions, and cashier billing across three isolated portals: **Patient**, **Doctor**, and **Clinic Administrator**.

---

## 🏥 Portals & Features

### 1. Patient Self-Service Portal
- **Online Booking**: Schedule appointments by choosing preferred doctors, specialties, dates, and morning/afternoon time slots.
- **Self Check-In**: Instant queue ticket generation on the scheduled consultation date with a live ticket pass.
- **Real-Time Queue Tracking**: Live waiting counter displaying estimated wait times, preceding patients, and current room announcements.
- **Pre-Consultation Clinical Intake (Triage)**: Submit chief complaints, symptom duration, 0–10 pain scale, current home medications, and known drug allergies before entering the doctor's room.
- **Continuous Vitals & Health Trends**: Visual progression chart tracking Blood Pressure, Heart Rate, Temperature, SpO2, and automated BMI.
- **Laboratory Requisitions**: View doctor-ordered diagnostic tests, check 10–12h fasting warnings, and print official requisition slips.

### 2. Physician Clinical Workstation
- **Active Consultation Terminal**: Call next waiting patient with audio chime alert and automatic room display update.
- **Electronic Medical Records (EMR)**: Review previous patient visits, medical history, pre-consultation intake, and historical vitals.
- **Clinical Prescription & Follow-up**: Prescribe medications, dosage instructions, clinical diagnosis, and schedule return visits.
- **Diagnostic Orders**: Requisition laboratory packages (CBC, Urinalysis, Blood Chem, Imaging) with custom notes.
- **Operational Availability Control**: Toggle status (*Available*, *In Consultation*, *On 15/30/45-min Break* with live countdown, *Off Duty*).

### 3. Clinic Administration & Cashier Console
- **Central Queue Manager**: Walk-in ticket issuance, manual priority reordering, queue transfers, and service station tracking.
- **Billing & Cashier**: Create invoices with multi-item billing (consultations, lab fees, procedures). Support for **Senior Citizen/PWD 20% discounts**, Cash, Credit Card, and **HMO / Health Insurance Guarantee Letters**.
- **Printable Official Receipts**: BIR-style official clinic receipts with itemized tax and payment breakdown.
- **Doctor Duty Schedules**: Manage clinic shift hours, consultation room assignments, and daily patient slot limits.
- **Analytics & Audit Logs**: Daily patient throughput, average consultation durations, revenue reports, and immutable audit logs.

### 4. Public Waiting Hall TV Display Mode
- Full-screen kiosk display for clinic lobby screens.
- Web Audio chime sound alerts and optional voice synthesizer announcements for called ticket numbers and room directions.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/mediqueue.git
   cd mediqueue
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas-Confetti
- **Backend**: Node.js, Express, REST API
- **Persistence**: File-based local database engine (`/data/mediqueue-db.json`)
- **Audio & Media**: Web Audio API Synthesizer, SpeechSynthesis API

---

## 📂 Project Structure

```
├── data/                  # Initial seed data and database storage
├── server/                # Express API backend
│   ├── routes/            # Appointments, Queue, Billing, Clinical, Auth
│   ├── db/                # Database store and transactions
│   └── auth.ts            # Token authentication middleware
├── src/                   # React frontend application
│   ├── components/        # Reusable UI components & modals
│   ├── context/           # AuthContext & NotificationContext
│   ├── services/          # API client wrapper
│   ├── types/             # TypeScript definitions & data models
│   ├── views/             # Patient, Doctor, Admin, and TV Display views
│   ├── App.tsx            # Main application router
│   └── main.tsx           # Application entry point
├── server.ts              # Full-stack server entry point (Vite + Express)
├── package.json           # Scripts and dependencies
└── tsconfig.json          # TypeScript configuration
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
