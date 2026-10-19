# Plan Changelog

Every change to the plan gets an entry here, newest first. Record *what* changed and *why*, so the reasoning survives after the docs are edited.

Format:

```
## YYYY-MM-DD — short title
**Docs:** business-plan / architecture
**Change:** what changed
**Why:** what prompted it (interview finding, cost, new data…)
```

---

## 2026-10-19 — Not a single-city launch

**Docs:** business-plan, architecture, README
**Change:** Dropped the "Bangalore first" strategy. The platform launches in multiple cities wherever a thriving reading community exists; metros are expected to lead early traction but aren't a requirement. Rewrote Go-to-market (§7), roadmap phase labels ("launch communities" → "more communities" → "nationwide"), Phase 1 goal, personas, financial-model note, next steps, and city examples in the architecture doc. Gate targets (100 / 300 clubs) are unchanged and now count across all communities.
**Why:** The product isn't tied to one city; reading communities exist in many places and should be served from day one.

## 2026-10-19 — Initial Markdown version

**Docs:** business-plan, architecture
**Change:** Converted the two original PDFs (Business Plan, Web Architecture — both dated 2026-10-19) into Markdown under `docs/`. Content carried over as written; diagrams redrawn as Mermaid.
**Why:** Keep the plan in git so it can be versioned and edited as it evolves.
