# Local Ledger 🧾

> **100% Offline-First, Private & Fast Invoicing Web Application**  
> No servers, no tracking, no mandatory cloud subscriptions. All data is stored securely on your device using IndexedDB.

---

## 🌟 Highlights

- **🔒 Zero-Knowledge & 100% Client-Side**: All invoices, clients, line items, and settings are stored exclusively in the browser's IndexedDB via Dexie.js. Zero API calls, zero tracking, zero server dependencies.
- **⚡ Global Keyboard Shortcuts**: Press `Ctrl+N` (or `⌘N`) anywhere to create a new invoice instantly; press `Ctrl+S` (`⌘S`) to save invoices and settings.
- **🛡️ Safe Destructive Actions**: Accessible confirmation dialogs (`AlertDialog`) for deleting clients, removing invoices, resetting settings, or deactivating licenses.
- **📊 Real-time Financial Dashboard**: Real-time KPI summary cards, interactive 6-month revenue bar charts (powered by Recharts), recent invoice listings, and automated 30-day backup reminders.
- **🧾 Comprehensive Invoice Lifecycle**: Draft, Sent, Paid, and Auto-detected Overdue status management with multi-criteria filtering, search, sorting, and quick duplication.
- **📄 Professional A4 PDF Generator**: Pixel-perfect printable view and PDF download powered by `pdf-lib`, supporting business logo embedding, itemized tables, financial breakdowns, and custom color palettes.
- **💾 Full JSON Backup & Restore**: One-click IndexedDB export and schema-validated atomic database restore with overwrite safety confirmations.
- **👑 Client-Side PRO Licensing System**: 100% offline cryptographic license validation enabling multi-currency per invoice, custom PDF branding palettes, and watermark-free white-label exports.

---

## 🚀 Feature Overview

### 1. Dashboard (`/`)

- **4 Key Financial Metric Cards**:
  - **Total Outstanding**: Real-time sum of unpaid and overdue invoices with count badges.
  - **Paid This Month**: Filtered sum of paid invoices in the current calendar month.
  - **Overdue Invoices**: Live count of past-due invoices with overdue sum.
  - **Total Clients**: Total contact database count with quick access links.
- **6-Month Revenue Trend**: Visual bar chart tracking monthly invoiced totals vs. paid revenue over the last 6 calendar months.
- **Recent Invoices Table**: The 5 most recent invoices with status badges and quick view actions.
- **30-Day Backup Alert**: Visual reminder banner if no database backup has been exported in 30+ days.
- **Quick Action Bar**: One-click **"+ New Invoice"** and inline **"+ New Client"** modals.

### 2. Invoices Hub (`/invoices`)

- **Search & Filter**: Real-time search by client name, email, or invoice number.
- **Status Tabs**: Status pills with dynamic counts (`All`, `Paid`, `Sent`, `Overdue`, `Draft`).
- **Auto-Overdue Detection**: Invoices automatically display an Overdue badge if `dueDate < today` and status is not marked `paid`.
- **Sort Controls**: Instant sorting by Issue Date, Due Date, Total Amount, or Invoice Number.
- **Quick Actions Menu**: View detail, Download PDF, Duplicate invoice, Status toggle, and Delete.

### 3. Create & Edit Invoice (`/invoices/new` & `/invoices/:id`)

- **Client Selector**: Select existing client or click `+ Add new client` to create one inline without losing form state.
- **Auto-Increment Sequence**: Automatically pulls prefix and sequence from settings (e.g. `INV-0001`) and increments atomically upon saving.
- **Date Pickers & Presets**: Issue date and due date pickers with quick payment terms (`On Receipt`, `Net 7`, `Net 14`, `Net 30`, `Net 60`).
- **Dynamic Line Items**: Add, reorder, and remove line items with automatic line total calculations (`quantity × rate`).
- **Reactive Financials**: Automatic subtotal, configurable tax percentage, tax amount, and grand total calculations.
- **Notes & Terms**: Bottom textarea for bank wire instructions, payment terms, or client thank-you notes.
- **Save Modes**: Save as Draft or Save & Finalize within an atomic Dexie transaction.

### 4. Printable Invoice View & PDF Export (`/invoices/:id`)

- **A4 Printable Paper Layout**: Matches professional standard stationery with business header, client info, itemized table, totals, and notes.
- **Base64 Logo Embedding**: Embeds PNG/JPEG business logos cleanly onto screen and PDF exports.
- **Edit & Duplicate Actions**:
  - **Edit Mode**: Re-opens form with existing values for quick adjustments.
  - **Duplicate Action**: Generates a new draft invoice with identical line items and client, but a fresh invoice number and today's date.

### 5. Client Directory (`/clients`)

- Complete client records with Name, Email, Phone, and formatted Billing Address.
- Quick create and manage client contacts.

### 6. Settings & Data Management (`/settings`)

- **Business Identity**: Company name, address, tax registration number, and logo upload (Base64).
- **Financial Defaults**: Default currency and global tax rate.
- **Invoice Numbering**: Configurable prefix (`INV-`, `BILL-`, `2026-`) and next sequence number.
- **PRO Licensing**: Offline license key entry, instant cryptographic activation, custom PDF brand color palette, and watermark removal toggle.
- **Backup & Restore**:
  - **Export Data (JSON)**: Dumps entire IndexedDB into a single JSON file.
  - **Import Data (JSON)**: Validates JSON format and safely restores data within an atomic transaction with confirmation dialogs.

### 7. PRO License System (`/pro`)

- **Offline Cryptographic Validation**: Validates license keys (`LLPRO-[TIER]-[CUSTOMER]-[CHECKSUM]`) entirely client-side without external network dependencies.
- **Gated Features**:
  - ✨ Multi-Currency per invoice (25+ currencies like USD, EUR, GBP, JPY, INR, CAD, AUD).
  - ✨ Custom PDF accent color palettes (Forest Slate, Deep Navy, Royal Indigo, Emerald Green, Crimson Ruby, Charcoal Slate).
  - ✨ 100% White-Label exports (suppress "Made with Local Ledger" watermark).
  - ✨ Recurring invoices and unlimited templates.
- **Demo / Evaluation Key**: Includes one-click test key `LLPRO-DEMO-2026-ACTIVE` for sandbox evaluation.

---

## 🛠️ Technology Stack

| Layer              | Technology                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Framework**      | [TanStack Start](https://tanstack.com/start) / [Vite](https://vitejs.dev/) / [React 19](https://react.dev/) |
| **Routing**        | [TanStack Router](https://tanstack.com/router)                                                              |
| **Local Database** | [Dexie.js](https://dexie.org/) (IndexedDB wrapper)                                                          |
| **Styling**        | [Tailwind CSS v4](https://tailwindcss.com/) with OKLCH design tokens                                        |
| **UI Components**  | [Radix UI](https://www.radix-ui.com/) & Tailwind UI primitives                                              |
| **Icons**          | [Lucide React](https://lucide.dev/)                                                                         |
| **Charts**         | [Recharts](https://recharts.org/)                                                                           |
| **PDF Engine**     | [pdf-lib](https://pdf-lib.js.org/)                                                                          |
| **Dates**          | [date-fns](https://date-fns.org/)                                                                           |
| **Notifications**  | [Sonner](https://sonner.emilkowal.ski/)                                                                     |

---

## 📁 Project Structure

```
local-ledger/
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Radix UI primitives (Button, Dialog, Select, etc.)
│   │   ├── AppLayout.tsx      # Sidebar navigation & mobile drawer layout
│   │   ├── CreateClientDialog.tsx # Inline client creation modal
│   │   ├── EmptyState.tsx     # Empty state visual placeholder
│   │   ├── InvoiceForm.tsx    # Comprehensive create/edit invoice form
│   │   └── InvoiceList.tsx    # Invoices table with search, filters & sort
│   ├── db/                    # Dexie IndexedDB layer
│   │   ├── db.ts              # Dexie DB schema definition (v1)
│   │   ├── clients.ts         # Client CRUD operations
│   │   ├── invoices.ts        # Invoice transactions & sequencing
│   │   ├── invoice-items.ts   # Line item queries
│   │   ├── full-invoice.ts    # Joined invoice + items + client data
│   │   └── settings.ts        # Settings retrieval & updates
│   ├── routes/                # TanStack file-based routes
│   │   ├── __root.tsx         # Root document shell
│   │   ├── index.tsx          # Dashboard page (/)
│   │   ├── clients/index.tsx  # Clients page (/clients)
│   │   ├── invoices/
│   │   │   ├── index.tsx      # Invoices list (/invoices)
│   │   │   ├── new.tsx        # New invoice (/invoices/new)
│   │   │   └── $id.tsx        # Invoice detail & PDF preview (/invoices/:id)
│   │   ├── pro/index.tsx      # Upgrade to PRO & license activation (/pro)
│   │   └── settings/index.tsx # Settings, branding, backups & licensing (/settings)
│   ├── types/                 # TypeScript interfaces
│   │   ├── client.ts          # Client data types
│   │   ├── invoice.ts         # Invoice & status types
│   │   ├── invoice-item.ts    # Invoice line item types
│   │   └── settings.ts        # Settings & PRO license types
│   ├── utils/                 # Utility helpers
│   │   ├── backup.ts          # JSON database export & restore engine
│   │   ├── currencies.ts      # 25+ world currency symbols and formatting
│   │   ├── format.ts          # Currency and date formatting helpers
│   │   ├── license.ts         # Offline license checksum generator & validator
│   │   └── pdf.ts             # pdf-lib A4 PDF generation engine
│   ├── routeTree.gen.ts       # Generated TanStack route tree
│   ├── router.tsx             # TanStack router initialization
│   ├── server.ts              # SSR entry point
│   ├── start.ts               # TanStack Start runner
│   └── styles.css             # Tailwind CSS tokens & base styles
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🗄️ Database Schema (IndexedDB)

The application uses **Dexie.js** with versioned IndexedDB stores:

```ts
// src/db/db.ts
class InvoiceDatabase extends Dexie {
  clients!: Table<Client, string>;
  invoices!: Table<Invoice, string>;
  invoiceItems!: Table<InvoiceItem, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("InvoiceDB");
    this.version(1).stores({
      clients: "id, name, email, createdAt",
      invoices: "id, invoiceNumber, clientId, status, issueDate, dueDate, createdAt, updatedAt",
      invoiceItems: "id, invoiceId, [invoiceId+description]",
      settings: "id",
    });
  }
}
```

---

## 🔑 Offline License Key Specification

License validation runs **100% on the client** using deterministic salted checksum hashing:

- **Format**: `LLPRO-[TIER]-[CUSTOMER]-[CHECKSUM]`
- **Example**: `LLPRO-LIFETIME-ACME-8F3A2B`
- **Validation**:
  ```ts
  import { validateLicenseKey } from "@/utils/license";

  const result = validateLicenseKey("LLPRO-LIFETIME-ACME-8F3A2B");
  // { isValid: true, tier: "LIFETIME", customerTag: "ACME" }
  ```
- **Evaluation Key**: You can activate PRO during development using `LLPRO-DEMO-2026-ACTIVE`.

---

## 💻 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or pnpm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/girishlade111/local-ledger.git
cd local-ledger

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

The application will be accessible at `http://localhost:8080/`.

---

## 🔧 Available Scripts

| Command            | Description                                   |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Starts local development server with Vite HMR |
| `npm run build`    | Compiles production bundle with Nitro & Vite  |
| `npm run preview`  | Previews production build locally             |
| `npm run lint`     | Runs ESLint across the codebase               |
| `npm run format`   | Formats all files with Prettier               |
| `npx tsc --noEmit` | Runs full TypeScript type verification        |

---

## 🛡️ Privacy Guarantee

1. **No External Database**: All records remain strictly in your browser's IndexedDB.
2. **No Tracking / Analytics**: Zero third-party telemetry scripts.
3. **True Data Portability**: Full JSON backup and restore capabilities ensure you always own your invoicing data.

---

## 📄 License

This project is licensed under the **MIT License**.
