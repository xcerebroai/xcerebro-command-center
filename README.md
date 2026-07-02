# X Cerebro — Command Center

A live, shareable project dashboard for the AI Agents + Jarvis build pipeline.
The whole team views it as a website. Your AI reads the **same file** to know the current state of every build.

Two files do the work:

- **`projects.json`** — the single source of truth. Humans edit it, the dashboard renders it, and AI reads it.
- **`index.html`** — the dashboard. It loads `projects.json`, scores every build, and draws the command center. No backend, no build step.

---

## 1. Put it live on GitHub Pages

1. Create a repo (e.g. `xcerebro-command-center`) and add `index.html` and `projects.json` to the root.
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main` / `root`**, then **Save**.
4. Wait ~1 minute. Your live URL will be:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

Share that URL with the team. It works on desktop, tablet, and phone, and auto-refreshes every 60 seconds — good for a wall display.

---

## 2. Update projects (keep it live)

The dashboard shows whatever is in `projects.json`. To update:

- **On GitHub:** open `projects.json` → pencil icon → edit → **Commit changes**. Pages redeploys in under a minute and everyone sees the new numbers.
- **Locally:** edit `projects.json`, then `git commit` and `git push`.

Component values are decimals from `0` to `1` (e.g. `0.4` = 40%). Everything else — Overall %, launch readiness, health, days left, the KPIs, and the auto-ranked Next Moves — is calculated for you.

---

## 3. AI access (Claude Code / agents)

Your AI reads the current pipeline straight from the raw file:

```
https://raw.githubusercontent.com/<your-username>/<repo-name>/main/projects.json
```

**Read (any agent):** fetch that URL to get the live state of every build.

**Read + update (Claude Code with repo access):** point it at the repo and it can edit `projects.json` and commit. The moment it pushes, the site updates for the whole team. That's the loop — your AI keeps the board current, the team watches it live.

Prompt you can hand Claude Code:

> This repo hosts our project command center. `projects.json` is the source of truth. When I tell you a build moved forward, update that build's `components`, `status`, `nextAction`, and `blocker` in `projects.json`, then commit and push. Never change the `weights` unless I ask.

---

## 4. `projects.json` field reference

```jsonc
{
  "meta":    { "title", "subtitle", "owner", "updated" },
  "weights": {                 // must total 100 — drives every Overall % score
    "dashboard":10, "campaign":15, "automations":15, "aiAgent":20,
    "customWorkflow":15, "a2p":10, "jarvis":10, "jvPayment":5
  },
  "projects": [
    {
      "id":            "XC-001",
      "client":        "Alex Rodas",
      "project":       "Coastalgic Realtor Campaign",
      "workstream":    "Realtor Campaign",
      "buildType":     "Campaign + AI Follow-Up",
      "owner":         "Alexia / Q",
      "start":         "2026-06-26",     // YYYY-MM-DD
      "targetEnd":     "2026-07-05",     // drives Days Left
      "status":        "Build Mode",     // Planning | Build Mode | Testing | Payment Follow-Up | Blocked | Ready | Live
      "priority":      "High",           // Urgent | High | Normal
      "components": {                    // each 0.0–1.0
        "dashboard":0.30, "campaign":0.60, "automations":0.35, "aiAgent":0.40,
        "customWorkflow":0.25, "a2p":0.10, "jarvis":0.50, "jvPayment":1.00
      },
      "jarvisRelated":   "Yes",          // Yes | No
      "paymentFollowUp": "No",           // Yes | No | Maybe
      "blocker":     "What's holding this build.",
      "nextAction":  "The single next move.",
      "notes":       "Context."
    }
  ]
}
```

### How scoring works (mirrors the tracker)

- **Overall %** = `Σ(component × weight) / Σ(weights)`
- **Launch Readiness** — Payment Follow-Up → *Payment Needed* · ≥85% *Launch Ready* · ≥65% *QA / Testing* · ≥35% *Build Mode* · else *Needs Scope*
- **Health** — *Blocked* · *Payment Hold* · *Overdue* (past target) · *At Risk* (≤5 days & <70%) · *On Track*
- **Next Moves** — auto-ranked by urgency: days left, weighted up for Urgent / High priority and payment holds

To re-weight what "done" means, change `weights` once — every build re-scores.

---

## Notes

- `index.html` carries an embedded copy of the data as a fallback, so opening the file directly (double-click) still shows the board. On GitHub Pages the live `projects.json` always wins. Edit the JSON, not the copy inside the HTML.
- Everything is client-side and static — safe to host anywhere (GitHub Pages, Vercel, or a GHL custom-code page).
