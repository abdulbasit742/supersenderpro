# Group Commerce OS Command Reference

This document catalogs all available group commands inside Group Commerce OS, along with their parameters, authorization layers, and dry-run boundaries.

## Command Execution Model
Commands are triggered inside WhatsApp groups by authorized administrators or owner numbers. The syntax follows standard `/command [args]` structure.

```
Incoming message (/pause 10m) ──► Is sender registered admin? ──► Execute Command
                                                                      │
  ┌───────────────────────────────────────────────────────────────────┴──┐
  ▼ (Is action hazardous?)                                                ▼
[Yes (e.g. /remove @spammer)]                                      [No (e.g. /status)]
  │                                                                      │
  ├─► Dry-run Active? (Yes) ──► Log Draft action only                     └─► Execute & Return
  └─► Dry-run Active? (No)  ──► Run Live Client integration (Baileys)
```

---

## Command Catalog

### 1. General & Settings
#### `/help`
- **Description:** Lists all available group commands and brief explanations.
- **Access Level:** All group members.
- **Output Sample:** Displays the command catalog guide.

#### `/status`
- **Description:** Outputs the active coordination modes (Commerce, AI, Moderation, Relay) along with the system safety setting (Dry-run mode).
- **Access Level:** Admins / Group Owners.
- **Output Sample:**
  ```
  Group Status: Tech Wholesale PK
  - Commerce Mode: ENABLED 🛒
  - AI Agent: ACTIVE 🤖
  - Moderation: SHIELD ON 🛡️
  - Relay: ACTIVE 📢
  - Temporary Pause: ACTIVE 🟢
  - Mode: DRY-RUN (SAFE MODE) 🛡️
  ```

#### `/rules`
- **Description:** Prints standard trading compliance and link restrictions for group participants.
- **Access Level:** All group members.

---

### 2. Pause Controls
#### `/pause [5m|10m]`
- **Description:** Temporarily mutes AI responses and moderation alerts for 5 or 10 minutes to allow natural uninterrupted discussions.
- **Access Level:** Admins / Group Owners.
- **Action:** Triggers pause timers in `pauseManager.js`. Resumes automatically.

#### `/resume`
- **Description:** Instantly overrides temporary pauses, resuming all AI monitors and link moderation guards.
- **Access Level:** Admins / Group Owners.

---

### 3. Catalog & Price Intelligence
#### `/catalog` or `/products`
- **Description:** Outputs a stylized list of the group's active virtual catalog, displaying prices, available stocks, and verified traders.
- **Access Level:** All group members.

#### `/stock`
- **Description:** Outputs a quick inventory stock checklist for all tracked SKUs in the group.
- **Access Level:** All group members.

#### `/price [SKU]`
- **Description:** Performs a targeted price intelligence lookup for a specific SKU code. Returns pricing ranges (min/max price history) and verified stocking merchants.
- **Access Level:** All group members.
- **Example:** `/price SKU-IPH13`

---

### 4. Group Moderation (Safety Dry-Run by Default)
#### `/banlink [on|off]`
- **Description:** Toggles external link blocking. When `on`, any unapproved external URL triggers warning messages.
- **Access Level:** Admins / Group Owners.

#### `/approve [@username]`
- **Description:** Grants "Trusted Seller" clearance to a member. Approved sellers are permitted to trigger catalog stock listings without getting flagged.
- **Access Level:** Admins / Group Owners.
- **Default Behavior:** Dry-run draft logs prepared.

#### `/warn [@username]`
- **Description:** Warns a group member about policy violations.
- **Access Level:** Admins / Group Owners.

#### `/remove [@username]`
- **Description:** Kick/ban spam members.
- **Access Level:** Admins / Group Owners.
- **Boundary Rule:** Kicking users is extremely hazardous and irreversible. This action is STRICTLY dry-run by default. No actual user is kicked unless `GROUP_COMMERCE_LIVE_GROUP_ACTIONS` is set to `true` in active environment bindings.

#### `/appreciate [@username]`
- **Description:** Commends a trusted seller for helpful postings or verified trading logs.
- **Access Level:** All group members.

---

### 5. Platform Sync Commands
#### `/ecom sync`
- **Description:** Syncs group virtual catalog listings with external e-commerce gateways (Shopify/WooCommerce). Creates product and order drafts.
- **Access Level:** Admins / Group Owners.
- **Boundary Rule:** Review drafts only. No live database writes are performed.

#### `/social sync`
- **Description:** Compiles the group's current catalog listings and generates social content draft posts for Facebook, Instagram, or channels.
- **Access Level:** Admins / Group Owners.
