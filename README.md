# Operations Distribution Center

[**OPEN THE LIVE OPERATIONS DISTRIBUTION CENTER**](https://unified-property-ops.marlon-dichoso1984.chatgpt.site)

> Employees should use the live application link above. This GitHub repository
> stores the application's source code and is not the employee login page.

Operations Distribution Center is the front workspace for separating and
distributing general administrative tasks and maintenance work.

## Included workspaces

- Task Management
- Maintenance & Vendors
- Field Operations Documents
- Tech Admin Data Control

The application routes imported records to the appropriate workspace while
keeping both operational applications connected to the same shared database.

## Access

Employee and Tech Admin credentials are configured as protected hosting
environment variables. Passwords and local environment files are intentionally
excluded from this repository.

## Local development

Requirements:

- Node.js 22.13 or newer

Commands:

```bash
npm install
npm run dev
npm run build
```

Create a local `.env.local` file for development-only environment values. Never
commit that file or production credentials.
