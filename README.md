# elle-dev-console — DEPRECATED

This cloud console is retired. The superadmin surface is now the **local Elle
workbench** (the `Elle` repo, Electron): it carries everything this console
had — the router conversation with the κ readout, the Optimus journal, the
code engine, diagnose, and cross-worker health — plus the forge, skills, and
MCP surfaces this console never gained. The workbench is gated to
admin/superadmin tier at login and at session verify.

The deploy workflow is manual-only (`workflow_dispatch`) so nothing ships from
here by accident. When you're ready, delete the Cloudflare Pages project and
archive this repo; nothing depends on it.
