---
name: gigsnano
description: Work a GigsNano work item end-to-end from its code (e.g. WEB-42) — pull context, claim it, implement via Superpowers, open a PR, and hand it back for review. Trigger when the user gives a work-item code or says "work on <CODE>".
---

# Working a GigsNano work item

You have the `gigsnano` MCP tools available. Follow this loop exactly.

## 0. Pick the workspace (only if needed)
Work-item codes resolve within the **active** workspace. If a `get_work_item`
call fails with `No project '<X>' in workspace`, the code lives elsewhere:
call `list_workspaces`, then `set_active_workspace({ workspace })` and retry.
Don't guess the workspace — surface the list if it's ambiguous.

## 1. Pull
Call `get_work_item({ code })`. Read the title, description, acceptance
criteria, priority, type, and any linked docs. These are your task + your
definition of done.

## 2. Claim
Call `start_work_item({ code })` (sets In Progress + comments). Create a
work branch named `<code>-<short-slug>`.

## 3. Work

### Understand the code with graphify first
Both repos ship a **graphify** knowledge graph (`graphify-out/`). Before opening
files, answer "where does this live / what depends on what / how does X flow"
with the **graphify** skill (query the graph), not by reading whole files. Only
open the specific files for the exact lines you'll edit. Same for the sibling
backend `G:\git\gigsnano-api`. This keeps context small and findings accurate.

### Route to the right Superpowers skill
- Requirements unclear or ambiguous → **superpowers:brainstorming** first.
- Feature / change → **superpowers:test-driven-development**.
- Bug ticket (type = bug) → **superpowers:systematic-debugging**.
- New or reshaped UI → **emil-design-eng** (component polish + invisible details)
  and **transitions-dev** (open/close, page, staggered transitions). Any visual
  work routes through these before it's done.
- Before you claim it's done → **superpowers:verification-before-completion**,
  then **superpowers:requesting-code-review**.
The work item's acceptance criteria are the pass/fail bar.

### UI house rules (non-negotiable)
- **Never hardcode colors.** Use the shadcn CSS-var design tokens
  (`bg-primary`, `text-muted-foreground`, `border`, …) so light/dark both work —
  no hex, no `rgb()`, no fixed Tailwind color classes like `bg-blue-500`.
- **Match the app's aesthetic.** Reuse existing primitives (`@/components/ui`,
  `@/components/layout`, `EmptyState`) and patterns rather than inventing new
  chrome; keep the enterprise, no-layout-shift feel.
- Reach for `transitions-dev` for motion; don't hand-roll ad-hoc animations.

## 4. Hand back
Open a PR (the repo is known). Call
`complete_work_item({ code, pr_url, summary })` — this sets In Review and
comments the PR link + summary.

## Guardrails
- NEVER move an item to Done. Stop at In Review. Done comes from a human
  merging the PR (github-sync flips it automatically).
- Keep the developer in the loop: get plan approval and review in-session.
- If a tool errors (auth, unresolved repo, unknown code), surface the exact
  message and stop — do not guess.

## Reference: available tools
The MCP server (`gigsnano`) exposes **25 tools**. This loop only needs a few of
the workflow tools, but all are available in-session.

**Core work-item loop**

| Tool                  | Arguments                        | Used in this loop |
|------------------------|-----------------------------------|--------------------|
| `list_workspaces`      | *(none)*                          | Step 0 — list workspaces to pick the active one. |
| `set_active_workspace` | `{ workspace }`                   | Step 0 — switch which workspace the MCP acts on. |
| `list_my_work_items`   | *(none)*                          | Optional — "what's assigned to me" instead of naming a code. |
| `get_work_item`        | `{ code }`                        | Step 1 (Pull) |
| `start_work_item`      | `{ code }`                        | Step 2 (Claim) |
| `add_comment`          | `{ code, body }`                  | Optional — interim status updates during Step 3. |
| `complete_work_item`   | `{ code, pr_url?, summary? }`     | Step 4 (Hand back) |

**Everything else (richer sessions, not needed for the core loop)**

- Work items: `list_work_items`, `create_work_item`, `update_work_item`
- Comments: `list_comments`, `update_comment`, `delete_comment`
- Documents: `list_documents`, `get_document`, `attach_file` (PDF/DOCX/text only), `delete_document`
- Projects: `list_projects`, `get_project`
- Metadata: `list_statuses`, `list_labels`, `create_label`, `list_cycles`, `list_modules`
- People: `list_users`, `get_user`

See the package README for full argument details. If you add or remove a tool on
the MCP server, update this count and lists.
