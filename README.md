# Ticket Dash

A lightweight, high-performance, read-only event dashboard and attendee doorlist viewer. Ticket Dash lets you browse, filter, search, segment, and export your ticket sales and check-in rosters using an Obsidian/Linear-style command line interface.

Built to run locally, Ticket Dash keeps your ticketing data secure by caching records strictly in-memory or in local CSV imports—no databases, zero data leakage, completely secure.

---

## Features

- **Obsidian/Linear Command Palette**: Trigger powerful filters, table sorts, and stats summaries by typing `/` in the search input.
- **Fuzzy Search Modifiers**: Search by specific fields like `email:user@domain.com`, `minspend:100`, or `stars:***`.
- **Attendee Merging**: Automatically aggregates duplicate attendee emails to calculate customer lifetime spend, event check-in history, and loyalty/activity ratings.
- **Compact Merged Fields**: Cells with multiple values auto-collapse into a single row containing a clickable `+N more` button to save vertical space.
- **Local CSV Imports**: Import lists on the fly from local CSV doorsheets.
- **Statistical Overlays**: Visual modals showing visible revenue summaries, popular ticket tiers, attendance check-in metrics, and event sales distributions.
- **Advanced Exports**: Instantly copy BCC email strings, visible phone numbers, or download custom-column layouts as CSV or JSON.

---

## Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- Optional: A **Ticket Tailor API Key** (if not provided, Ticket Dash defaults to Demo mode with sample sandbox data).

### 2. Installation
Clone or download the project folder, then install dependencies:
```bash
npm install
```

### 3. Environment Setup
Duplicate the example environment file and add your Ticket Tailor API key:
```bash
cp .env.example .env
```
Open `.env` in a text editor and populate the key:
```env
TICKET_TAILOR_API_KEY=your_api_key_here
PORT=3005
```

### 4. Launch the App
Start the local Node server:
```bash
npm start
```
Open your browser and navigate to: **`http://localhost:3005`**

---

## Commands Cheat Sheet

Type `/` in the search box to view, autocomplete, and toggle these options:

| Command | Type | Description |
| :--- | :--- | :--- |
| `/help` | Action | Opens the interactive command help cheat sheet. |
| `/show revenue` | Action | Displays total revenue, filtered count, and AOV. |
| `/show checkin rate` | Action | Displays real-time check-in stats and percentage. |
| `/show top events` | Action | Displays ticket counts and revenue ranks per event. |
| `/show tier stats` | Action | Displays ticket distributions and revenues per tier. |
| `/copy bcc` | Action | Copies BCC-formatted string of visible valid emails. |
| `/copy phones` | Action | Copies comma-separated list of visible phone numbers. |
| `/export csv` | Action | Downloads currently visible table rows as a CSV file. |
| `/export json` | Action | Downloads currently visible table rows as a JSON file. |
| `/toggle gridlines` | Toggle | Toggles table grid borders. |
| `/toggle full names` | Toggle | Merges First Name and Last Name columns. |
| `/toggle theme` | Action | Swaps light/dark themes. |
| `/set density [high/medium/low]` | Action | Autocompletes padding adjustments. |
| `/highlight recent` | Toggle | Highlights tickets purchased in the last 24 hours. |
| `/unhide all` | Action | Restores manually hidden rows. |
| `/invert selection` | Action | Swaps visible rows with hidden rows. |
| `/keep visible` | Action | Hides all rows except the currently visible ones. |
| `/refresh` | Action | Triggers a fresh background sync from the provider API. |

---

## Git & GitHub Setup

Follow these steps to track your dashboard and push it to a public GitHub repository.

### 1. Initialize Git
From the project root directory, run:
```bash
git init
```

### 2. Verify Ignored Files
Ensure that Node dependencies, local environments, and private imported doorlists are not tracked:
```bash
git status
```
*(Confirms that `node_modules/`, `.env`, and private JSON files in `imports/` are correctly ignored by `.gitignore`).*

### 3. Create First Commit
Stage and commit the project assets:
```bash
git add .
git commit -m "Initial commit: Ticket Dash setup"
```

### 4. Create Public GitHub Repo & Push
1. Go to your [GitHub account](https://github.com/) and click **New Repository**.
2. Name the repository **`ticket-dash`**.
3. Choose **Public**, leave "Add a README" and "Add .gitignore" **unchecked** (since they are already present locally), and click **Create repository**.
4. Link and push your branch:
```bash
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ticket-dash.git
git push -u origin main
```
