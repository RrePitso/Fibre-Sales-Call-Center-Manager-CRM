# FibreSales CRM

**Manage leads. Monitor performance. Control quality. Track commissions.**

FibreSales CRM is a lightweight, browser-based sales operations and commission management prototype built for a commission-based fibre internet sales manager. It connects lead acquisition, pipeline tracking, sales agent management, fibre product catalogues, quality assurance audits, commission eligibility, and performance analytics in one responsive interface.

---

## Technology Stack

- **Frontend:** React + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Persistence:** Browser `LocalStorage` (versioned schema `v1`)
- **Data Exchange:** Validated JSON backup import/export and CSV reports

---

## Local Development

```bash
npm install
npm run dev
```

Typecheck and production build:

```bash
npm run lint
npm run build
npm run preview
```

---

## Core Business Rules Enforced

1. **QA-Gated Commissions:** An application only becomes eligible for a commission when its pipeline status is **Approved** AND its latest QA review outcome is **Passed**.
2. **Failed / Pending QA Protection:** Rejected applications, applications awaiting QA review, and applications that fail or require QA correction never generate payable commissions.
3. **Duplicate Prevention:** Each application (`leadId`) can generate at most one commission record.
4. **Historical Rate Locking:** Updating a fibre package's future commission rate does not retroactively modify existing commission records.
5. **Immutable Audit History:** Re-reviewing an application appends a new QA review entry rather than overwriting prior reviews, and status changes are preserved in activity history.
6. **Agent History Preservation:** Sales agents with historical sales or commissions are deactivated rather than deleted so reporting remains accurate.

---

## Static Hosting Deployment

FibreSales CRM is a 100% client-side static application with no backend server, database service, or API keys required. Running `npm run build` produces static assets in `dist/`.

### Netlify
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- No server-side routing rules required (navigation is client-side state-based).

### Vercel
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Cloudflare Pages
- **Build command:** `npm run build`
- **Build output directory:** `dist`

### GitHub Pages
1. If deploying to a project subpath (`https://<user>.github.io/<repo>/`), set `base: './'` or `base: '/<repo>/'` in `vite.config.ts`.
2. Build `dist/` and publish via GitHub Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`).

---

## Prototype Limitations & Production Path

- Data is stored in the local browser via `LocalStorage` and seeded with **fictional demonstration records** (`*.demo` emails and `555` placeholder phone numbers). It is intended for single-browser demonstration, not multi-user production operations.
- A production deployment would require a multi-user backend database, authenticated role-based access control (Manager vs Agent vs QA Reviewer), server-side validation, encrypted backups, and POPIA compliance controls.
