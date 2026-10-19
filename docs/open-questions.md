# Open Questions

Inconsistencies and undecided points across the plan. Resolve each one, update the affected doc, log it in the [CHANGELOG](../CHANGELOG.md), then delete it here.

| # | Question | Where | Notes |
|---|---|---|---|
| 1 | **How do 20 organizers pay by Gate 1 if payments are a Phase 2 feature?** | Business plan §1, §8, §11 · Architecture §1 | Architecture puts "payments and paid tiers" out of scope for Phase 1, and the roadmap lists "Paid plans and ticketing" under Phase 2. Yet Gate 1 (end of Phase 1) needs 20 paying organizers and the 6-month revenue target is ₹12,000. Options: pull Razorpay subscriptions into Phase 1, collect payment manually (UPI link) for the first organizers, or redefine Gate 1 as "20 committed to pay". |
| 2 | **Are spoiler-safe threads free or paid?** | Business plan §3, §6 | They're the headline Phase 1 differentiator, but the pricing table lists them under Club Plus while Free only gets "threads". Paywalling the core feature may hurt adoption. |
| 3 | **Does the timeline fit?** | Business plan §7 · Architecture §11 | GTM: interviews weeks 1–3, private beta month 4. Build plan: 16 weeks at ~20 h/week to private beta. If the build starts after interviews, beta lands around month 4.5–5, which overlaps the planned public launch (month 5). |
| 4 | **Are ads shown in Phase 1?** | Business plan §6 · Architecture §1 | Free plan says "ads shown" and revenue scenarios include ads, but no ad integration appears in the Phase 1 architecture scope. |
| 5 | **Product name and domain** | Business plan §12 | Still to pick. Repo is named `blacknwhite`. |
| 6 | **Missing source links** | Business plan §2, §5, §6 | Market figures (NielsenIQ, IMARC, book fairs), the Bookclubs.com fee, and the Amazon affiliate rate were hyperlinked in the PDF; the URLs need to be re-added. |
| 7 | **Which communities do we launch in, and how do we hand-hold organizers across several cities at once?** | Business plan §7 | With a multi-city launch, a solo founder can't meet every organizer in person. Decide the first shortlist (metros vs. smaller cities with strong scenes) and whether onboarding is remote-first. |
