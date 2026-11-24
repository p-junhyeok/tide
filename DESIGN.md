# Design
## Source of truth
Active · 2026-11-24. New standalone local-first product. Evidence: conversation's data-to-mart-to-AI workflow, n8n/Airflow interaction reference, Docker-only launch requirement. No prior app or visual assets.
## Brand
Tide: calm, precise, approachable engineering workbench. Show real states and data provenance. No fabricated metrics, fake connected clouds, decorative charts, or fake AI responses.
## Product goals
Connect source, storage, cleaning, quality, mart and data-tool query in one observable journey. First-use success: launch Docker, run sample, inspect real tables and query them. Non-goals: production orchestration, arbitrary remote code, all clouds, authenticated multi-user deployments. Daily/weekly scheduling is real, single-instance, and durable.
## Personas and jobs
Primary: solo data engineer reviewing and running pipelines. Secondary: analyst inspecting datasets and querying marts. Assume Korean UI, English technical identifiers.
## Information architecture
Workflow editor (default), independent per-workflow schedules and calendar, run history, datasets, connections, AI studio. Supporting workflow switcher, node configuration drawer, template chooser, search and quickstart.
## Design principles
Progressive disclosure; expose one clear primary action per screen. Make unsupported capabilities explicit. Editing never silently changes an existing execution snapshot. Autosave positions only on explicit save; show unsaved state.
## Visual language
White work surfaces on cool gray #f5f7f9; ink #182b35; emerald #098d77; navy #14252e sidebar. Mint highlight; blue sources, amber transform, violet AI. System sans Korean; 16px body, 14px controls, 12–13px secondary metadata only. Soft 8–14px corners; fine borders; sparse shadows. Use a real execution calendar with text tooltips and no fabricated history. Use small inline SVG icons and a dot-grid workflow canvas. No stock images needed.
## Components
Sidebar nav; compact breadcrumbs; workflow header; stage cards; draggable canvas node; SVG dependency edge; accessible dialog/drawer; status badge; data table; code/log panel; toast live region. CSS tokens owned in public/styles.css.
## Accessibility
Native buttons, labels, tables and dialogs; visible focus; icon-only buttons have names; keyboard Escape closes dialog. Nodes selectable by keyboard and have non-drag auto-layout. Status accompanied by text. Respect prefers-reduced-motion.
## Responsive behavior
Desktop persistent 216px sidebar. Below 1100px compact icons sidebar and optional node palette. Below 760px bottom nav, stacked header, scrollable canvas/table, full-width drawer. No page-wide horizontal overflow.
## Interaction states
Initial data includes a sample definition and no fabricated execution history. Empty runs/datasets provide run-sample CTA. API errors preserve editing state. Run progress is clearly labeled only while a real request is pending; completed nodes use returned backend states. Buttons disable while request is pending. Configured cloud ≠ live connection. Data-tool answers ≠ LLM output.
## Content voice
Concise Korean, verbs for actions, clear error recovery. Distinguish demo/sample input from real backend execution. No implementation jargon in main flow unless needed for a user decision.
## Implementation constraints
Vanilla modules, Node 24+, no runtime dependencies, Node HTTP server, JSON persistence, Docker volume. Real browser review plus node tests and API smoke. No publishing.
## Open questions
- [ ] Which production cloud and orchestration adapter first? Owner: user; no block on local MVP.
- [ ] Which LangGraph/LLM provider? Owner: user; MVP uses explicit data-tool mode.
