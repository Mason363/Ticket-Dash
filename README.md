# Ticket Dash 🎟️

Ticket Dash is a lightweight, read-only event dashboard and attendee roster viewer. It connects directly to your Ticket Tailor account (or loads local CSV files) to show all your ticket sales, order details, and check-in statuses in one fast, beautiful grid.

Unlike complex database systems, Ticket Dash keeps your ticketing data private and secure by caching all records strictly **in-memory** on your local machine or in your browser's private local storage.

---

### 🌐 Live Public Version
👉 **[Access the Hosted App here](https://your-vercel-project.vercel.app)** *(Replace this URL with your deployed Vercel URL once configured)*

---

## 🚀 Easy Setup Guide

You don't need to be a developer to get Ticket Dash running. Follow these simple steps:

### Step 1: Download the App
Click the green **"Code"** button at the top right of this GitHub page and select **"Download ZIP"**. Extract (unzip) the downloaded folder to a location on your computer.

### Step 2: Install Node.js
Ticket Dash runs on Node.js. 
1. Go to [nodejs.org](https://nodejs.org/).
2. Download the installer labeled **LTS** (Recommended for most users).
3. Open the downloaded file and click through the installer to finish.

### Step 3: Get your Ticket Tailor API Key
To fetch your live ticket data, you need to create an API key in Ticket Tailor:
1. Log in to your **Ticket Tailor Dashboard**.
2. Go to **Settings** -> **API keys**.
3. Click **Create new API key**.
4. ⚠️ **IMPORTANT (Permissions)**: When creating the key, you **must** check the **"Read-only"** boxes next to:
   - [x] **Events** (`events`)
   - [x] **Orders** (`orders`)
   - [x] **Issued Tickets** (`issued_tickets`)
5. Copy the generated API key.

### Step 4: Configure the App
1. Inside the unzipped Ticket Dash folder, open the file named `.env` in any text editor (like Notepad on Windows or TextEdit on Mac).
2. Paste your API key next to the `=` sign (e.g., `TICKET_TAILOR_API_KEY=your_key_here`). Save and close the file.
*(Note: If you leave this blank, the app runs in **Demo Mode** with sample events and tickets so you can still play with it).*

### Step 5: Launch the Dashboard
1. Open your computer's terminal:
   - **Mac**: Press `Cmd + Space`, type `Terminal`, and press Enter.
   - **Windows**: Press the Windows Key, type `cmd`, and press Enter.
2. Type `cd ` (with a space after it), then drag-and-drop the unzipped folder from your file manager directly into the terminal window, and press Enter.
3. Install the app by typing this command and pressing Enter:
   ```bash
   npm install
   ```
4. Start the app by typing this command and pressing Enter:
   ```bash
   npm start
   ```
5. Open your web browser and go to:
   👉 **`http://localhost:3005`**

---

## ⌨️ Slash (/) Commands Reference

To filter, format, view stats, or export your attendee roster, simply click on the **Search Bar** and type **`/`** to open the interactive command menu.

### 📊 Stats & Revenue Reports (Opens in a Modal)
* **`/show revenue`** (Aliases: `/total sales`, `/revenue stats`): View total sales revenue, ticket count, and average order value.
* **`/show checkin rate`** (Aliases: `/attendance`, `/checkin stats`): See the percentage and count of attendees checked in.
* **`/show top events`** (Aliases: `/event ranks`, `/sales by event`): View ticket sales and revenue rankings per event.
* **`/show tier stats`** (Aliases: `/ticket ranks`, `/popular tiers`): View total sales and revenue broken down by ticket type (VIP, General Admission, etc.).

### 🔍 Attendance & Filter Rules
* **`/show checked-in only`** (Aliases: `/checked`, `/checkedin`, `/present`): Shows checked-in attendees only.
* **`/show unchecked only`** (Aliases: `/unchecked`, `/absent`): Shows unchecked attendees only.
* **`/show valid emails only`** (Aliases: `/valid`, `/clean`, `/real`): Hides malformed or dummy emails.
* **`/hide admin orders`** (Aliases: `/admin`, `/staff`, `/management`): Filters out administrative/internal tickets.
* **`/hide test orders`** (Aliases: `/test`, `/sandbox`, `/fake`): Filters out test/sandbox purchases.
* **`/hide void orders`** (Aliases: `/void`, `/cancelled`, `/refunded`): Filters out refunded or void tickets.
* **`/hide duplicates`** (Aliases: `/hide repeats`, `/merge`): Groups duplicate emails into single rows.
* **`/hide row [name]`** (Aliases: `/hiderow`, `/deleterow`): Hides a specific row from view.
* **`/hide by rule [option] [values]`** (Aliases: `/hidebyrule`, `/rule_hide`): Bulk-hides rows by rules (e.g., `/hide by rule email user1@gmail.com user2@gmail.com`).

### 🎯 Custom Audience Segmentations
* **`/show repeat buyers`** (Aliases: `/repeats`, `/loyal`, `/multi-buyers`): Shows only attendees who have purchased tickets to 2 or more different events.
* **`/show domain [domain]`** (Aliases: `/domain`, `/email domain`): Filters to show only emails matching a domain (e.g. `/show domain gmail.com`).
* **`/hide domain [domain]`** (Aliases: `/ignore domain`, `/exclude domain`): Filters out specific email domains.
* **`/show multi-ticket orders`** (Aliases: `/bulk orders`, `/group bookings`): Shows bookings that bought more than 1 ticket.
* **`/show incomplete names`** (Aliases: `/bad names`, `/short names`, `/initials`): Flags rows where names are blank or just a single letter.
* **`/show missing phone`** (Aliases: `/no phone`, `/empty phone`): Shows attendees with no phone numbers.
* **`/show local phone [prefix]`** (Aliases: `/local`, `/area code`): Filters phone numbers by area code or prefix.
* **`/show ticket range [min] [max]`** (Aliases: `/price range`, `/ticket price`): Shows tickets within a specific price range.
* **`/show free tickets`** (Aliases: `/free`, `/comps`): Shows $0.00 tickets.

### 🎨 Layout, Styling & Formatting
* **`/toggle gridlines`** (Aliases: `/grid`, `/borders`, `/table grid`): Toggles distinct borders between cells for easier reading.
* **`/toggle case format`** (Aliases: `/standardize names`, `/title case`, `/fix casing`): Automatically fixes messy uppercase/lowercase names to Title Case (e.g. converting "JOHN SMITH" to "John Smith").
* **`/toggle theme`** (Aliases: `/theme`, `/dark mode`, `/light mode`): Swaps between Dark and Light mode themes.
* **`/toggle full names`** (Aliases: `/merge names`, `/one name column`): Collapses the First Name and Last Name headers into a single "Name" column.
* **`/set density [high/medium/low]`** (Aliases: `/density`, `/padding`, `/row height`): Adjusts row height spacing.
* **`/highlight recent`** (Aliases: `/new tickets`, `/highlight new`): Applies a yellow highlight border to rows purchased within the last 24 hours.
* **`/compact rows`** (Aliases: `/condense`, `/collapse cells`, `/truncate cells`): Toggles cell collapsing. When on (default), rows with multiple bookings collapse to show `+N more` instead of expanding vertically.

### 📋 Copying & Exporting
* **`/copy bcc`** (Aliases: `/copy bcc list`, `/get emails`): Copies a clean list of all visible valid email addresses separated by commas to your clipboard. Perfect for pasting into your email client's BCC field to send updates.
* **`/copy phones`** (Aliases: `/copy phone list`, `/get phones`): Copies a list of all visible phone numbers.
* **`/export csv`** (Aliases: `/download csv`, `/save csv`): Downloads the current visible table view as a CSV spreadsheet.
* **`/export json`** (Aliases: `/download json`, `/save json`): Downloads the visible table view as a JSON file.
* **`/copy visible row`** (Aliases: `/copy row`, `/copy current`): Copies the cell data of the first visible row in the table.

### 🛠️ Bulk Utilities
* **`/unhide all`** (Aliases: `/restore rows`, `/show hidden rows`): Restores all manually hidden rows.
* **`/invert selection`** (Aliases: `/invert hide`, `/reverse select`): Swaps hidden vs visible rows.
* **`/keep visible`** (Aliases: `/only visible`, `/crop list`): Hides all rows that do not match the current search.
* **`/refresh`** (Aliases: `/sync now`, `/reload data`): Triggers a fresh background sync from Ticket Tailor.
* **`/toggle column [col_name]`** (Aliases: `/col`): Show or hide a specific column (e.g. `/toggle column phone`).
* **`/help`** (Aliases: `/commands`, `/cheat sheet`): Opens the interactive overlay cheat sheet.

---

## 🌐 Deploying to Vercel (Developer Guide)

If you want to host Ticket Dash online so that event organizers can access it from anywhere without installing anything locally, you can deploy it to **Vercel** in less than 5 minutes.

### How it works:
1. **Zero Database Configuration**: The app is completely stateless. It does not run a persistent database.
2. **Browser-Isolated Keys**: User Ticket Tailor API keys are entered directly in the browser. They are stored locally in the browser's `localStorage` and sent with each request in a header (`x-api-key`). The Vercel serverless functions act as a secure, on-the-fly proxy to fetch data and return it to the client without saving anything on the server.
3. **Local-Only CSV Imports**: CSV imports are also saved client-side in the browser's storage, bypassing the Vercel read-only filesystem completely.

### Security Warnings (For Users):
* 🔒 **Run On-Device**: For absolute security, users can run the code locally on their own machines (using the **Easy Setup Guide** above).
* ⚠️ **Private Access only**: Users should **never** configure their Ticket Tailor API keys on shared or public computers. Only use this hosted version on trusted, personal devices.

### Deployment Steps:
1. **Install Vercel CLI**:
   Open your terminal and install Vercel CLI globally using npm:
   ```bash
   npm install -g vercel
   ```
2. **Log in to Vercel**:
   Run the login command and follow the instructions in your browser:
   ```bash
   vercel login
   ```
3. **Deploy the App**:
   Navigate to the unzipped `Ticket-Dash` folder in your terminal and run:
   ```bash
   vercel
   ```
   *Follow the CLI prompts (accept defaults for most settings. When prompted for settings, choose Express/Node if detected, otherwise default).*
4. **Deploy to Production**:
   Once you test the preview deployment, push it to production:
   ```bash
   vercel --prod
   ```
5. **Get your Live URL**:
   Copy the production URL generated by Vercel (e.g., `https://ticket-dash.vercel.app`) and paste it into the **Live Public Version** placeholder at the top of this `README.md` file!

