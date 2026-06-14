let tickets = [];
let filteredTickets = [];
let uniqueEvents = [];
let isSyncing = false;
let isMenuOpen = false;
let focusedCommandIndex = 0;
let hiddenRowIds = new Set();

let hideAdminOrders = false;
let onlyCheckedIn = false;
let onlyUnchecked = false;
let validEmailsOnly = false;
let hideTestOrders = false;
let hideVoidOrders = false;
let hideDuplicates = false;
let vipOnly = false;
let highValueOnly = false;
let activeOnly = false;
let hideImports = false;
let onlyImports = false;
let compactRows = true;
let showRepeatBuyersOnly = false;
let showMultiTicketOrdersOnly = false;
let showIncompleteNamesOnly = false;
let showMissingPhoneOnly = false;
let showFreeTicketsOnly = false;
let tableGridlines = false;
let caseFormatTitle = false;
let mergeNameCols = false;
let rowDensity = 'medium';
let highlightRecent = false;
let currentSort = 'first_name';

// Inject custom command-driven CSS styles
(() => {
  const style = document.createElement('style');
  style.innerHTML = `
    .gridlines-active td, .gridlines-active th {
      border-right: 1px solid rgba(63, 63, 70, 0.4) !important;
      border-bottom: 1px solid rgba(63, 63, 70, 0.4) !important;
    }
    .gridlines-active tr {
      border-bottom: none !important;
    }
    .density-high td {
      padding-top: 0.25rem !important;
      padding-bottom: 0.25rem !important;
    }
    .density-low td {
      padding-top: 1.25rem !important;
      padding-bottom: 1.25rem !important;
    }
    .highlight-recent-row {
      background-color: rgba(251, 191, 36, 0.04) !important;
      border-left: 3px solid rgba(251, 191, 36, 0.6) !important;
    }
  `;
  document.head.appendChild(style);
})();

let visibleCols = {
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  event_name: true,
  ticket_type: true,
  spent: true,
  activity: true,
  order_id: true,
  purchase_date: true,
  checked_in: true
};

let emailCounts = {};
let emailSpent = {};
let orderCounts = {};
let top33Threshold = 2;
let middle33Threshold = 2;
let highValueThreshold = 100;

const exportCols = {
  email: true,
  first_name: false,
  last_name: false,
  phone: false,
  event_name: false,
  ticket_type: false,
  spent: false,
  activity: false,
  order_id: false,
  purchase_date: false,
  checked_in: false
};

const MODIFIER_MAP = {
  'event:': 'event_name',
  'class:': 'event_name',
  'course:': 'event_name',
  'workshop:': 'event_name',
  'show:': 'event_name',
  'session:': 'event_name',
  'performance:': 'event_name',
  'ticket:': 'ticket_type',
  'type:': 'ticket_type',
  'tier:': 'ticket_type',
  'category:': 'ticket_type',
  'name:': 'name',
  'first:': 'first_name',
  'firstname:': 'first_name',
  'last:': 'last_name',
  'lastname:': 'last_name',
  'email:': 'email',
  'mail:': 'email',
  'phone:': 'phone',
  'number:': 'phone',
  'tel:': 'phone',
  'order:': 'order_id',
  'ord:': 'order_id',
  'date:': 'date',
  'minspend:': 'min_spend',
  'maxspend:': 'max_spend',
  'stars:': 'stars'
};

const tableBody = document.getElementById('table-body');
const searchInput = document.getElementById('search-input');
const eventFilter = document.getElementById('event-filter');
const syncBtn = document.getElementById('sync-btn');
const syncStatusDot = document.getElementById('sync-status-dot');
const syncStatusText = document.getElementById('sync-status-text');
const statusContainer = document.getElementById('status-container');
const bccExportBtn = document.getElementById('bcc-export-btn');

const exportDropdownToggle = document.getElementById('export-dropdown-toggle');
const exportDropdownMenu = document.getElementById('export-dropdown-menu');
const exportSettingsToggle = document.getElementById('export-settings-toggle');
const exportSettingsMenu = document.getElementById('export-settings-menu');

const commandMenu = document.getElementById('command-menu');
const commandList = document.getElementById('command-list');

const statTotalTickets = document.getElementById('stat-total-tickets');
const statUniqueEmails = document.getElementById('stat-unique-emails');
const statMalformedEmails = document.getElementById('stat-malformed-emails');
const statMalformedCard = document.getElementById('stat-malformed-card');

function showModal(title, htmlContent) {
  let modal = document.getElementById('dynamic-info-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dynamic-info-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="bg-brandCard border border-brandBorder p-6 rounded shadow-2xl max-w-lg w-full mx-4 flex flex-col gap-4 text-left max-h-[80vh]">
      <h3 class="text-sm font-semibold tracking-wider font-mono text-zinc-100 uppercase border-b border-brandBorder pb-2 flex justify-between items-center">
        <span>${title}</span>
        <button class="close-dyn-modal-btn text-zinc-500 hover:text-zinc-200 font-mono text-lg cursor-pointer">×</button>
      </h3>
      <div class="text-xs text-zinc-300 font-mono overflow-y-auto pr-1 flex-grow custom-scrollbar">
        ${htmlContent}
      </div>
      <button class="close-dyn-modal-btn px-3 py-1.5 rounded bg-brandMuted border border-brandBorder text-[10px] text-zinc-300 hover:text-white hover:bg-brandHover transition-colors font-mono cursor-pointer self-end uppercase">
        Close
      </button>
    </div>
  `;
  modal.classList.remove('hidden');
  
  const closeBtns = modal.querySelectorAll('.close-dyn-modal-btn');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });
}

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function updateTableGridlines() {
  const table = document.querySelector('table');
  if (table) {
    table.classList.toggle('gridlines-active', tableGridlines);
  }
}

function updateDensityStyles() {
  const tbody = document.getElementById('table-body');
  if (tbody) {
    tbody.classList.remove('density-high', 'density-low');
    if (rowDensity === 'high') {
      tbody.classList.add('density-high');
    } else if (rowDensity === 'low') {
      tbody.classList.add('density-low');
    }
  }
}

function toggleTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const isLight = document.body.classList.toggle('light-theme');
  if (themeToggle) {
    themeToggle.textContent = isLight ? 'Dark Mode' : 'Light Mode';
  }
  saveSettings();
  showToast(`Switched to ${isLight ? 'Light' : 'Dark'} mode.`);
}

function showRevenueStats() {
  const total = filteredTickets.reduce((sum, t) => sum + (t.price || 0), 0);
  const average = filteredTickets.length > 0 ? (total / filteredTickets.length) : 0;
  const html = `
    <div class="flex flex-col gap-3">
      <div class="flex justify-between border-b border-brandBorder/40 py-1.5">
        <span class="text-zinc-400">Total Revenue:</span>
        <span class="text-zinc-100 font-bold">$${total.toFixed(2)}</span>
      </div>
      <div class="flex justify-between border-b border-brandBorder/40 py-1.5">
        <span class="text-zinc-400">Filtered Ticket Count:</span>
        <span class="text-zinc-100">${filteredTickets.length}</span>
      </div>
      <div class="flex justify-between border-b border-brandBorder/40 py-1.5">
        <span class="text-zinc-400">Average Order Value:</span>
        <span class="text-zinc-100">$${average.toFixed(2)}</span>
      </div>
    </div>
  `;
  showModal('Revenue Statistics', html);
}

function showTopEventsStats() {
  const eventCounts = {};
  const eventRev = {};
  filteredTickets.forEach(t => {
    const name = t.event_name || 'Unknown Event';
    eventCounts[name] = (eventCounts[name] || 0) + 1;
    eventRev[name] = (eventRev[name] || 0) + (t.price || 0);
  });
  const sortedEvents = Object.keys(eventCounts).sort((a, b) => eventCounts[b] - eventCounts[a]);
  const rows = sortedEvents.map((evt, idx) => `
    <tr class="border-b border-brandBorder/20">
      <td class="py-2 text-zinc-400">${idx+1}. ${evt}</td>
      <td class="py-2 text-right text-zinc-300 font-mono">${eventCounts[evt]}</td>
      <td class="py-2 text-right text-zinc-100 font-mono">$${eventRev[evt].toFixed(2)}</td>
    </tr>
  `).join('');
  const html = `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-brandBorder/60">
          <th class="pb-1.5 text-zinc-500 font-medium">Event Name</th>
          <th class="pb-1.5 text-right text-zinc-500 font-medium">Tickets</th>
          <th class="pb-1.5 text-right text-zinc-500 font-medium">Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="3" class="text-center py-4 text-zinc-600">No events found</td></tr>'}
      </tbody>
    </table>
  `;
  showModal('Top Events Stats', html);
}

function showCheckinRateStats() {
  const checked = filteredTickets.filter(t => t.checked_in).length;
  const unchecked = filteredTickets.length - checked;
  const pct = filteredTickets.length > 0 ? ((checked / filteredTickets.length) * 100).toFixed(1) : 0;
  const html = `
    <div class="flex flex-col gap-3">
      <div class="flex justify-between border-b border-brandBorder/40 py-1.5">
        <span class="text-zinc-400">Attendance Rate:</span>
        <span class="text-emerald-400 font-bold">${pct}%</span>
      </div>
      <div class="flex justify-between border-b border-brandBorder/40 py-1.5">
        <span class="text-zinc-400">Total Checked In:</span>
        <span class="text-zinc-100">${checked}</span>
      </div>
      <div class="flex justify-between border-b border-brandBorder/40 py-1.5">
        <span class="text-zinc-400">Total Unchecked:</span>
        <span class="text-zinc-100">${unchecked}</span>
      </div>
    </div>
  `;
  showModal('Check-In Rate Stats', html);
}

function showTierStats() {
  const tierCounts = {};
  const tierRev = {};
  filteredTickets.forEach(t => {
    const tier = t.ticket_type || 'Unknown Tier';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    tierRev[tier] = (tierRev[tier] || 0) + (t.price || 0);
  });
  const sortedTiers = Object.keys(tierCounts).sort((a, b) => tierCounts[b] - tierCounts[a]);
  const rows = sortedTiers.map((tier, idx) => `
    <tr class="border-b border-brandBorder/20">
      <td class="py-2 text-zinc-400">${tier}</td>
      <td class="py-2 text-right text-zinc-300 font-mono">${tierCounts[tier]}</td>
      <td class="py-2 text-right text-zinc-100 font-mono">$${tierRev[tier].toFixed(2)}</td>
    </tr>
  `).join('');
  const html = `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-brandBorder/60">
          <th class="pb-1.5 text-zinc-500 font-medium">Ticket Type</th>
          <th class="pb-1.5 text-right text-zinc-500 font-medium">Tickets</th>
          <th class="pb-1.5 text-right text-zinc-500 font-medium">Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="3" class="text-center py-4 text-zinc-600">No ticket types found</td></tr>'}
      </tbody>
    </table>
  `;
  showModal('Ticket Tier Stats', html);
}

function showHelpCheatSheet() {
  const items = COMMAND_ITEMS.map(cmd => `
    <div class="flex flex-col gap-0.5 border-b border-brandBorder/20 py-2">
      <div class="flex justify-between items-center">
        <span class="text-zinc-100 font-bold font-mono">/${cmd.aliases[0]}</span>
        <span class="text-[9px] bg-brandMuted border border-brandBorder px-1.5 rounded text-zinc-400">${cmd.type}</span>
      </div>
      <p class="text-zinc-400 text-[10px]">${cmd.desc || cmd.label}</p>
      ${cmd.aliases.length > 1 ? `<p class="text-[9px] text-zinc-600 font-mono">Aliases: ${cmd.aliases.slice(1).map(a => '/' + a).join(', ')}</p>` : ''}
    </div>
  `).join('');
  showModal('Command Cheat Sheet', items);
}

const COMMAND_ITEMS = [
  { id: 'toggle:admin', label: 'Hide Admin Orders', type: 'toggle', aliases: ['hide admin orders', 'hide_admin_orders', 'admin', 'hideadmin', 'ignoreadmin', 'excludeadmin', 'staff', 'internal', 'management'], getActive: () => hideAdminOrders, action: () => { hideAdminOrders = !hideAdminOrders; } },
  { id: 'toggle:checked', label: 'Show Checked-In Only', type: 'toggle', aliases: ['checked', 'checkedin', 'in', 'present', 'arrived', 'here'], getActive: () => onlyCheckedIn, action: () => { onlyCheckedIn = !onlyCheckedIn; if (onlyCheckedIn) onlyUnchecked = false; } },
  { id: 'toggle:unchecked', label: 'Show Unchecked Only', type: 'toggle', aliases: ['unchecked', 'notchecked', 'absent', 'missing', 'out', 'away'], getActive: () => onlyUnchecked, action: () => { onlyUnchecked = !onlyUnchecked; if (onlyUnchecked) onlyCheckedIn = false; } },
  { id: 'toggle:valid', label: 'Show Valid Emails Only', type: 'toggle', aliases: ['valid', 'good', 'correct', 'clean', 'real'], getActive: () => validEmailsOnly, action: () => { validEmailsOnly = !validEmailsOnly; } },
  { id: 'toggle:test', label: 'Hide Test Orders', type: 'toggle', aliases: ['hide test orders', 'hide_test_orders', 'hidetest', 'hide_test', 'test', 'excludetest', 'sandbox', 'fake', 'dummy'], getActive: () => hideTestOrders, action: () => { hideTestOrders = !hideTestOrders; } },
  { id: 'toggle:void', label: 'Hide Void Orders', type: 'toggle', aliases: ['hide void orders', 'hide_void_orders', 'hidevoid', 'hide_void', 'void', 'excludevoid', 'cancelled', 'refunded', 'invalid'], getActive: () => hideVoidOrders, action: () => { hideVoidOrders = !hideVoidOrders; } },
  { id: 'toggle:hide_duplicates', label: 'Hide Duplicates', type: 'toggle', aliases: ['hide duplicates', 'hide repeats', 'hide_duplicates', 'hide_repeats', 'hideduplicates', 'hiderepeats', 'duplicates', 'repeats', 'merge'], getActive: () => hideDuplicates, action: () => { hideDuplicates = !hideDuplicates; } },
  { id: 'toggle:vip', label: 'Show VIP/Members Only', type: 'toggle', aliases: ['viponly', 'showvip', 'membersonly', 'vip_only', 'vip', 'member'], getActive: () => vipOnly, action: () => { vipOnly = !vipOnly; } },
  { id: 'toggle:high_value', label: 'Show High-Value Buyers', type: 'toggle', aliases: ['highvalue', 'whales', 'topspenders', 'spend', 'valuable'], getActive: () => highValueOnly, action: () => { highValueOnly = !highValueOnly; } },
  { id: 'toggle:active', label: 'Show Active Buyers Only', type: 'toggle', aliases: ['activeonly', 'frequent', 'repeatbuyers', 'active'], getActive: () => activeOnly, action: () => { activeOnly = !activeOnly; } },

  { id: 'toggle:hide_imports', label: 'Hide Imported Tickets', type: 'toggle', aliases: ['hide imported tickets', 'hide_imported_tickets', 'hide imports', 'hideimportedtickets', 'hideimports', 'excludeimports', 'noimports', 'ignoreimports', 'hide_imports', 'hide_imported'], getActive: () => hideImports, action: () => { hideImports = !hideImports; if (hideImports) onlyImports = false; } },
  { id: 'toggle:only_imports', label: 'Show Imports Only', type: 'toggle', aliases: ['onlyimports', 'showimports', 'imports', 'imported', 'only_imports', 'show_imports'], getActive: () => onlyImports, action: () => { onlyImports = !onlyImports; if (onlyImports) hideImports = false; } },
  { 
    id: 'action:remove_imports', 
    label: 'Remove Imported Tickets', 
    desc: 'Permanently remove all local imported CSV tickets from the server', 
    type: 'action', 
    aliases: ['remove imported tickets', 'remove_imported_tickets', 'removeimports', 'deleteimports', 'clearimports'], 
    action: () => { 
      showCustomRemoveImportsModal();
    } 
  },
  { id: 'action:hide_all', label: 'Hide All Visible Rows', type: 'action', aliases: ['hideall', 'clearallrows', 'emptyrows', 'hide_all', 'hideallrows'], action: () => { filteredTickets.forEach(t => { if (t.is_merged && t.ticket_ids) { t.ticket_ids.forEach(id => hiddenRowIds.add(id)); } else { hiddenRowIds.add(t.ticket_id); } }); } },

  { id: 'mod:name', label: 'name: ', desc: 'Search full name only', type: 'modifier', value: 'name:', aliases: ['full', 'fullname', 'person', 'buyer', 'customer', 'attendee', 'guest'] },
  { id: 'mod:first', label: 'first: ', desc: 'Search first name only', type: 'modifier', value: 'first:', aliases: ['firstname', 'given', 'givenname', 'forename'] },
  { id: 'mod:last', label: 'last: ', desc: 'Search last name only', type: 'modifier', value: 'last:', aliases: ['lastname', 'surname', 'family', 'familyname'] },
  { id: 'mod:email', label: 'email: ', desc: 'Search email only', type: 'modifier', value: 'email:', aliases: ['mail', 'emailaddress', 'addr', 'address'] },
  { id: 'mod:phone', label: 'phone: ', desc: 'Search phone only', type: 'modifier', value: 'phone:', aliases: ['number', 'tel', 'telephone', 'mobile', 'cell', 'phonebook', 'contact'] },
  { id: 'mod:event', label: 'event: ', desc: 'Search event (aliases: class:, course:, workshop:)', type: 'modifier', value: 'event:', aliases: ['class', 'course', 'workshop', 'show', 'session', 'performance', 'concert', 'gig', 'exhibition', 'talk', 'movie', 'film', 'play'] },
  { id: 'mod:ticket', label: 'ticket: ', desc: 'Search ticket tier (aliases: type:, tier:, category:)', type: 'modifier', value: 'ticket:', aliases: ['type', 'tier', 'category', 'price', 'pass', 'vip', 'membership', 'admission', 'fare'] },
  { id: 'mod:order', label: 'order: ', desc: 'Search order ID only', type: 'modifier', value: 'order:', aliases: ['ord', 'orderid', 'booking', 'bookingid', 'reference', 'ref', 'ticketid', 'ticket'] },
  { id: 'mod:date', label: 'date: ', desc: 'Search date (e.g. last month, past 30 days, last week)', type: 'modifier', value: 'date:', aliases: ['time', 'when', 'purchase', 'bought', 'day', 'month', 'year', 'week', 'calendar'] },
  { id: 'mod:min_spend', label: 'minspend: ', desc: 'Filter by minimum total spend', type: 'modifier', value: 'minspend:', aliases: ['minspend', 'spendgt', 'greaterthan', 'minimumspent'] },
  { id: 'mod:max_spend', label: 'maxspend: ', desc: 'Filter by maximum total spend', type: 'modifier', value: 'maxspend:', aliases: ['maxspend', 'spendlt', 'lessthan', 'maximumspent'] },
  { id: 'mod:stars', label: 'stars: ', desc: 'Filter by activity stars (1-3)', type: 'modifier', value: 'stars:', aliases: ['stars', 'rating', 'activitylevel', 'star'] },

  { id: 'sort:first', label: 'Sort by First Name', type: 'sort', aliases: ['sortfirst', 'sortfirstname', 'firstnamesort'], getActive: () => currentSort === 'first_name', action: () => { currentSort = 'first_name'; } },
  { id: 'sort:last', label: 'Sort by Last Name', type: 'sort', aliases: ['sortlast', 'sortlastname', 'lastnamesort'], getActive: () => currentSort === 'last_name', action: () => { currentSort = 'last_name'; } },
  { id: 'sort:date_desc', label: 'Sort by Date (Newest)', type: 'sort', aliases: ['newest', 'recent', 'latest', 'sortdate', 'date_desc'], getActive: () => currentSort === 'date_desc', action: () => { currentSort = 'date_desc'; } },
  { id: 'sort:date_asc', label: 'Sort by Date (Oldest)', type: 'sort', aliases: ['oldest', 'earliest', 'sortdateasc', 'date_asc'], getActive: () => currentSort === 'date_asc', action: () => { currentSort = 'date_asc'; } },
  { id: 'sort:type', label: 'Sort by Ticket Type', type: 'sort', aliases: ['sortticket', 'sorttype', 'sorttier'], getActive: () => currentSort === 'ticket_type', action: () => { currentSort = 'ticket_type'; } },
  { id: 'sort:membership', label: 'Sort by Membership', type: 'sort', aliases: ['sortmembership', 'sortvip', 'memberfirst', 'vipfirst', 'passfirst', 'membership'], getActive: () => currentSort === 'membership', action: () => { currentSort = 'membership'; } },
  { id: 'sort:events_bought', label: 'Sort by Events Bought', type: 'sort', aliases: ['sortevents', 'sortclasses', 'eventsbought', 'classesbought', 'mosttickets'], getActive: () => currentSort === 'events_bought', action: () => { currentSort = 'events_bought'; } },
  { id: 'sort:money_spent', label: 'Sort by Money Spent', type: 'sort', aliases: ['sortmoney', 'sortspent', 'moneyspent', 'spentmost', 'topspenders'], getActive: () => currentSort === 'money_spent', action: () => { currentSort = 'money_spent'; } },
  { id: 'sort:activity', label: 'Sort by Activity', type: 'sort', aliases: ['sortactivity', 'sortstars', 'activitysort', 'starsmost', 'highlyactive'], getActive: () => currentSort === 'activity', action: () => { currentSort = 'activity'; } },
  { id: 'sort:checked', label: 'Sort by Check-in Status', type: 'sort', aliases: ['sortchecked', 'checkedinfirst', 'statuscheck'], getActive: () => currentSort === 'checked', action: () => { currentSort = 'checked'; } },

  { id: 'hide:first_name', label: 'Hide First Name Column', type: 'toggle', aliases: ['hidefirstname', 'hidefirst', 'togglefirst', 'showfirst', 'showfirstname'], getActive: () => !visibleCols.first_name, action: () => { visibleCols.first_name = !visibleCols.first_name; } },
  { id: 'hide:last_name', label: 'Hide Last Name Column', type: 'toggle', aliases: ['hidelastname', 'hidelast', 'togglelast', 'showlast', 'showlastname'], getActive: () => !visibleCols.last_name, action: () => { visibleCols.last_name = !visibleCols.last_name; } },
  { id: 'hide:email', label: 'Hide Email Column', type: 'toggle', aliases: ['hideemail', 'toggleemail', 'emailcolumn', 'showemail'], getActive: () => !visibleCols.email, action: () => { visibleCols.email = !visibleCols.email; } },
  { id: 'hide:phone', label: 'Hide Phone Column', type: 'toggle', aliases: ['hidephone', 'hidenumber', 'hidetel', 'togglephone', 'showphone', 'shownumber', 'showtel'], getActive: () => !visibleCols.phone, action: () => { visibleCols.phone = !visibleCols.phone; } },
  { id: 'hide:event_name', label: 'Hide Event Column', type: 'toggle', aliases: ['hideevent', 'hideclass', 'toggleevent', 'toggleclass', 'showevent', 'showclass'], getActive: () => !visibleCols.event_name, action: () => { visibleCols.event_name = !visibleCols.event_name; } },
  { id: 'hide:ticket_type', label: 'Hide Ticket Type Column', type: 'toggle', aliases: ['hideticket', 'hidetype', 'hidetier', 'toggleticket', 'showticket', 'showtype', 'showtier'], getActive: () => !visibleCols.ticket_type, action: () => { visibleCols.ticket_type = !visibleCols.ticket_type; } },
  { id: 'hide:spent', label: 'Hide Spent Column', type: 'toggle', aliases: ['hidespent', 'hidemoney', 'togglespent', 'togglemoney', 'showspent', 'showmoney'], getActive: () => !visibleCols.spent, action: () => { visibleCols.spent = !visibleCols.spent; } },
  { id: 'hide:activity', label: 'Hide Activity Column', type: 'toggle', aliases: ['hideactivity', 'hidestars', 'toggleactivity', 'togglestars', 'showactivity', 'showstars'], getActive: () => !visibleCols.activity, action: () => { visibleCols.activity = !visibleCols.activity; } },
  { id: 'hide:order_id', label: 'Hide Order ID Column', type: 'toggle', aliases: ['hideorder', 'hideorderid', 'toggleorder', 'showorder', 'showorderid'], getActive: () => !visibleCols.order_id, action: () => { visibleCols.order_id = !visibleCols.order_id; } },
  { id: 'hide:purchase_date', label: 'Hide Purchase Date Column', type: 'toggle', aliases: ['hidedate', 'hidepurchase', 'toggledate', 'showdate', 'showpurchase'], getActive: () => !visibleCols.purchase_date, action: () => { visibleCols.purchase_date = !visibleCols.purchase_date; } },
  { id: 'hide:checked_in', label: 'Hide Check-In Column', type: 'toggle', aliases: ['hidecheckin', 'hidechecked', 'togglecheckin', 'showcheckin', 'showchecked'], getActive: () => !visibleCols.checked_in, action: () => { visibleCols.checked_in = !visibleCols.checked_in; } },

  { 
    id: 'action:hiderow_prompt', 
    label: 'Hide Row', 
    desc: 'Hide a specific row from the table', 
    type: 'action', 
    aliases: ['hiderow', 'hide_row', 'deleterow', 'removerow', 'exclude_row', 'hide'], 
    action: () => { 
      searchInput.value = '/hide row '; 
      searchInput.focus(); 
      applyFilters();
      renderCommandMenu();
    } 
  },
  { 
    id: 'action:hidebyrule_prompt', 
    label: 'Hide by Rule', 
    desc: 'Hide all rows matching details: email, firstname, lastname, name, event, ticket, phone, order', 
    type: 'action', 
    aliases: ['hidebyrule', 'hide_by_rule', 'rulehide', 'rule_hide', 'filterrule'], 
    action: () => { 
      searchInput.value = '/hide by rule '; 
      searchInput.focus(); 
      applyFilters();
      renderCommandMenu();
    } 
  },
  { id: 'toggle:compact_rows', label: 'Compact Rows', desc: 'Collapse multi-value cells to first item + +N more. Click any cell to expand.', type: 'toggle', aliases: ['compact rows', 'compact_rows', 'compactrows', 'condense', 'condensed', 'collapse cells', 'collapsecells', 'truncate cells', 'truncatecells'], getActive: () => compactRows, action: () => { compactRows = !compactRows; } },
  { id: 'toggle:repeat_buyers', label: 'Show Repeat Buyers Only', type: 'toggle', aliases: ['show repeat buyers', 'repeat buyers', 'repeat_buyers', 'repeats', 'loyal', 'multi-buyers'], getActive: () => showRepeatBuyersOnly, action: () => { showRepeatBuyersOnly = !showRepeatBuyersOnly; } },
  { id: 'action:show_domain_prompt', label: 'Show Domain', desc: 'Filter to specific email domains (e.g. gmail.com)', type: 'action', aliases: ['show domain', 'show_domain', 'domain', 'email domain'], action: () => { searchInput.value = '/show domain '; searchInput.focus(); applyFilters(); renderCommandMenu(); } },
  { id: 'action:hide_domain_prompt', label: 'Hide Domain', desc: 'Hide specific email domains (e.g. yahoo.com)', type: 'action', aliases: ['hide domain', 'hide_domain', 'ignore domain', 'exclude domain'], action: () => { searchInput.value = '/hide domain '; searchInput.focus(); applyFilters(); renderCommandMenu(); } },
  { id: 'toggle:multi_ticket_orders', label: 'Show Multi-Ticket Orders Only', type: 'toggle', aliases: ['show multi-ticket orders', 'multi-ticket orders', 'bulk orders', 'group bookings', 'multi-ticket'], getActive: () => showMultiTicketOrdersOnly, action: () => { showMultiTicketOrdersOnly = !showMultiTicketOrdersOnly; } },
  { id: 'toggle:incomplete_names', label: 'Show Incomplete Names Only', type: 'toggle', aliases: ['show incomplete names', 'incomplete names', 'bad names', 'short names', 'initials'], getActive: () => showIncompleteNamesOnly, action: () => { showIncompleteNamesOnly = !showIncompleteNamesOnly; } },
  { id: 'toggle:missing_phone', label: 'Show Missing Phone Only', type: 'toggle', aliases: ['show missing phone', 'missing phone', 'no phone', 'empty phone'], getActive: () => showMissingPhoneOnly, action: () => { showMissingPhoneOnly = !showMissingPhoneOnly; } },
  { id: 'action:show_local_phone_prompt', label: 'Show Local Phone', desc: 'Filter by phone number prefix/area code', type: 'action', aliases: ['show local phone', 'show_local_phone', 'local phone', 'local', 'area code'], action: () => { searchInput.value = '/show local phone '; searchInput.focus(); applyFilters(); renderCommandMenu(); } },
  { id: 'action:show_ticket_range_prompt', label: 'Show Ticket Range', desc: 'Filter by price range: [min] [max]', type: 'action', aliases: ['show ticket range', 'show_ticket_range', 'ticket range', 'price range', 'ticket price'], action: () => { searchInput.value = '/show ticket range '; searchInput.focus(); applyFilters(); renderCommandMenu(); } },
  { id: 'toggle:free_tickets', label: 'Show Free Tickets Only', type: 'toggle', aliases: ['show free tickets', 'free tickets', 'free', 'comps', 'zero dollar'], getActive: () => showFreeTicketsOnly, action: () => { showFreeTicketsOnly = !showFreeTicketsOnly; } },
  { id: 'toggle:gridlines', label: 'Toggle Gridlines', type: 'toggle', aliases: ['toggle gridlines', 'gridlines', 'grid', 'borders', 'table grid'], getActive: () => tableGridlines, action: () => { tableGridlines = !tableGridlines; updateTableGridlines(); } },
  { id: 'toggle:case_format', label: 'Toggle Case Format', type: 'toggle', aliases: ['toggle case format', 'case format', 'standardize names', 'title case', 'fix casing'], getActive: () => caseFormatTitle, action: () => { caseFormatTitle = !caseFormatTitle; } },
  { id: 'action:toggle_theme', label: 'Toggle Theme', type: 'action', aliases: ['toggle theme', 'theme', 'dark mode', 'light mode'], action: () => { toggleTheme(); } },
  { id: 'toggle:full_names', label: 'Toggle Full Names', type: 'toggle', aliases: ['toggle full names', 'full names', 'merge names', 'one name column'], getActive: () => mergeNameCols, action: () => { mergeNameCols = !mergeNameCols; } },
  { id: 'action:density_prompt', label: 'Set Row Density', desc: 'Change padding density: high, medium, or low', type: 'action', aliases: ['set density', 'density', 'padding', 'row height'], action: () => { searchInput.value = '/set density '; searchInput.focus(); applyFilters(); renderCommandMenu(); } },
  { id: 'toggle:highlight_recent', label: 'Highlight Recent', type: 'toggle', aliases: ['highlight recent', 'new tickets', 'highlight new'], getActive: () => highlightRecent, action: () => { highlightRecent = !highlightRecent; } },
  { id: 'action:copy_bcc', label: 'Copy BCC List', desc: 'Copy current filtered valid emails to clipboard', type: 'action', aliases: ['copy bcc', 'copy bcc list', 'get emails'], action: () => {
      const emails = filteredTickets.filter(t => t.is_email_valid && t.email).map(t => t.email.trim().toLowerCase());
      const unique = Array.from(new Set(emails));
      if (unique.length === 0) {
        showToast('No valid emails to copy.', 'error');
        return;
      }
      navigator.clipboard.writeText(unique.join(', '))
        .then(() => showToast(`Copied ${unique.length} emails to clipboard.`))
        .catch(() => showToast('Copy failed.', 'error'));
    } 
  },
  { id: 'action:copy_phones', label: 'Copy Phone List', desc: 'Copy current visible phone numbers to clipboard', type: 'action', aliases: ['copy phones', 'copy phone list', 'get phones'], action: () => {
      const phones = filteredTickets.map(t => t.phone).filter(p => p && p.trim() !== '');
      const unique = Array.from(new Set(phones));
      if (unique.length === 0) {
        showToast('No phone numbers to copy.', 'error');
        return;
      }
      navigator.clipboard.writeText(unique.join(', '))
        .then(() => showToast(`Copied ${unique.length} phone numbers to clipboard.`))
        .catch(() => showToast('Copy failed.', 'error'));
    }
  },
  { id: 'action:export_csv', label: 'Export CSV', desc: 'Download visible records as a CSV file', type: 'action', aliases: ['export csv', 'download csv', 'save csv'], action: () => { executeExport('csv'); } },
  { id: 'action:export_json', label: 'Export JSON', desc: 'Download visible records as a JSON file', type: 'action', aliases: ['export json', 'download json', 'save json'], action: () => { executeExport('json'); } },
  { id: 'action:copy_visible_row', label: 'Copy Visible Row', desc: 'Copy first visible row cell values to clipboard', type: 'action', aliases: ['copy visible row', 'copy row', 'copy current'], action: () => {
      if (filteredTickets.length === 0) {
        showToast('No visible rows to copy.', 'error');
        return;
      }
      const t = filteredTickets[0];
      const data = getExportRowData(t);
      const checkedKeys = Object.keys(exportCols).filter(k => exportCols[k]);
      const text = checkedKeys.map(k => `${k.toUpperCase().replace('_', ' ')}: ${data[k]}`).join('\n');
      navigator.clipboard.writeText(text)
        .then(() => showToast('Copied first visible row info to clipboard.'))
        .catch(() => showToast('Copy failed.', 'error'));
    }
  },
  { id: 'action:show_revenue', label: 'Show Revenue Stats', type: 'action', aliases: ['show revenue', 'total sales', 'revenue stats'], action: () => { showRevenueStats(); } },
  { id: 'action:show_top_events', label: 'Show Top Events', type: 'action', aliases: ['show top events', 'event ranks', 'sales by event'], action: () => { showTopEventsStats(); } },
  { id: 'action:show_checkin_rate', label: 'Show Check-in Rate', type: 'action', aliases: ['show checkin rate', 'attendance', 'checkin stats'], action: () => { showCheckinRateStats(); } },
  { id: 'action:show_tier_stats', label: 'Show Tier Stats', type: 'action', aliases: ['show tier stats', 'ticket ranks', 'popular tiers'], action: () => { showTierStats(); } },
  { id: 'action:unhide_all', label: 'Unhide All Rows', type: 'action', aliases: ['unhide all', 'restore rows', 'show hidden rows'], action: () => { hiddenRowIds.clear(); saveSettings(); applyFilters(); showToast('Restored all hidden rows.'); } },
  { id: 'action:invert_hide', label: 'Invert Selection', type: 'action', aliases: ['invert selection', 'invert hide', 'reverse select'], action: () => {
      const oldHidden = new Set(hiddenRowIds);
      hiddenRowIds.clear();
      tickets.forEach(t => {
        if (!oldHidden.has(t.ticket_id)) {
          hiddenRowIds.add(t.ticket_id);
        }
      });
      saveSettings();
      applyFilters();
      showToast('Inverted row hidden states.');
    }
  },
  { id: 'action:keep_only_visible', label: 'Keep Only Visible', type: 'action', aliases: ['keep only visible', 'keep visible', 'crop list'], action: () => {
      const visibleIds = new Set(filteredTickets.map(t => t.ticket_id));
      tickets.forEach(t => {
        if (!visibleIds.has(t.ticket_id)) {
          hiddenRowIds.add(t.ticket_id);
        }
      });
      saveSettings();
      applyFilters();
      showToast('Kept only visible rows.');
    }
  },
  { id: 'action:refresh', label: 'Sync Cache', type: 'action', aliases: ['refresh', 'sync now', 'reload data'], action: () => { triggerSync(); } },
  { id: 'action:toggle_column_prompt', label: 'Toggle Column', desc: 'Toggle column visibility', type: 'action', aliases: ['toggle column', 'toggle col', 'col'], action: () => { searchInput.value = '/toggle column '; searchInput.focus(); applyFilters(); renderCommandMenu(); } },
  { id: 'action:help', label: 'Help / Cheat Sheet', type: 'action', aliases: ['help', 'commands', 'cheat sheet', 'docs'], action: () => { showHelpCheatSheet(); } }
];

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'px-4 py-3 rounded border text-xs font-mono flex items-center gap-2.5 shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto min-w-[250px]';
  
  if (type === 'success') {
    toast.className += ' bg-zinc-950 border-zinc-800 text-zinc-100';
  } else if (type === 'error') {
    toast.className += ' bg-rose-950/90 border-rose-900 text-rose-200';
  } else {
    toast.className += ' bg-zinc-900 border-zinc-800 text-zinc-300';
  }

  let dotColor = 'bg-zinc-400';
  if (type === 'success') dotColor = 'bg-emerald-400';
  if (type === 'error') dotColor = 'bg-rose-400';

  toast.innerHTML = `
    <span class="inline-block w-1.5 h-1.5 rounded-full ${dotColor}"></span>
    <span class="flex-grow">${message}</span>
  `;

  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-[-4px]');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const isSeconds = timestamp < 10000000000;
  const dateObj = new Date(timestamp * (isSeconds ? 1000 : 1));
  if (isNaN(dateObj.getTime())) return '—';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showApiKeyModal(allowCancel = true) {
  let overlay = document.getElementById('api-key-setup-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'api-key-setup-overlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
    document.body.appendChild(overlay);
  }

  const localKey = localStorage.getItem('ticket_tailor_api_key');
  const isConfigured = !!localKey;
  const lastTwo = isConfigured ? localKey.slice(-2) : '';

  overlay.innerHTML = `
    <div class="bg-brandCard border border-brandBorder p-6 rounded shadow-2xl max-w-lg w-full mx-4 flex flex-col gap-4 text-center">
      <div class="flex flex-col gap-1.5">
        <h3 class="text-sm font-semibold tracking-wider font-mono text-zinc-100 uppercase">
          ${isConfigured ? 'Manage API Key' : 'Welcome to Ticket Dash'}
        </h3>
        <p class="text-xs text-zinc-300 font-sans leading-relaxed">
          ${isConfigured ? 'Your Ticket Tailor API Key is currently configured.' : 'To display your events and attendee rosters, please configure your Ticket Tailor API Key below.'}
        </p>
      </div>
      
      <div class="bg-[#0E0E10] border border-brandBorder/60 p-4 rounded text-left flex flex-col gap-2.5 text-[11px] text-zinc-400 font-sans leading-relaxed">
        <div class="flex gap-2">
          <span class="text-emerald-400 font-bold font-mono">🔒 SECURE BY DESIGN:</span>
          <span>Your API key is processed in transit and saved <strong>only</strong> in your browser's local storage. It is never sent to a database or stored on our servers.</span>
        </div>
        <div class="flex gap-2 border-t border-brandBorder/40 pt-2.5">
          <span class="text-zinc-200 font-bold font-mono">💻 RUN ON-DEVICE:</span>
          <span>For maximum security, you can run this app entirely on-device! View the open-source code at our <a href="https://github.com/Mason363/Ticket-Dash" target="_blank" class="text-zinc-200 underline font-semibold hover:text-white">GitHub Repository</a>.</span>
        </div>
        <div class="flex gap-2 border-t border-brandBorder/40 pt-2.5">
          <span class="text-rose-400 font-bold font-mono">⚠️ WARNING:</span>
          <span>Only configure your API key here if you are the only one with access to this computer. <strong>Never</strong> use this hosted version on shared or public machines.</span>
        </div>
        <div class="flex gap-2 border-t border-brandBorder/40 pt-2.5">
          <span class="text-zinc-300 font-mono">🔑 VIEW RESTRICTION:</span>
          <span>You can change or delete your key at any time. For security reasons, you will <strong>never</strong> be able to view the full key again here after saving (only the last two characters will be shown).</span>
        </div>
      </div>

      ${isConfigured ? `
        <div class="flex items-center justify-between bg-[#0E0E10] border border-brandBorder rounded px-3 py-2 text-xs text-left">
          <span class="text-zinc-400 font-mono">Active Key: ••••••••••••••${lastTwo}</span>
          <div class="flex gap-2">
            <button 
              id="setup-change-key-btn" 
              class="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 border border-brandBorder font-mono text-[10px] hover:bg-zinc-700 transition-colors uppercase cursor-pointer"
            >
              Change Key
            </button>
            <button 
              id="setup-delete-key-btn" 
              class="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-900/60 text-rose-300 font-mono text-[10px] hover:bg-rose-900 transition-colors uppercase cursor-pointer"
            >
              Delete Key
            </button>
          </div>
        </div>
      ` : `
        <div class="flex flex-col gap-2">
          <input 
            type="password" 
            id="setup-api-key-input" 
            placeholder="Paste your api_key..." 
            class="w-full bg-[#0E0E10] border border-brandBorder rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 font-mono focus:outline-none focus:border-brandBorderActive transition-colors"
          >
          <div class="text-[10px] text-zinc-500 font-sans text-left leading-normal flex flex-col gap-1 pl-1">
            <span>1. Go to your Ticket Tailor Dashboard.</span>
            <span>2. Navigate to <strong>Settings</strong> -> <strong>API keys</strong>.</span>
            <span>3. Create a read-only key with <strong>Events</strong>, <strong>Orders</strong>, and <strong>Issued Tickets</strong> checked.</span>
          </div>
        </div>
      `}
      
      <div class="flex gap-3 mt-2">
        ${!isConfigured ? `
          <button 
            id="save-setup-key-btn" 
            class="flex-grow py-2 rounded bg-zinc-100 text-zinc-950 font-mono text-xs font-semibold hover:bg-zinc-200 transition-colors uppercase cursor-pointer"
          >
            Save Key & Load Roster
          </button>
        ` : ''}

        ${(allowCancel || isConfigured) ? `
          <button 
            id="cancel-setup-key-btn" 
            class="flex-grow py-2 rounded bg-zinc-800 text-zinc-400 border border-brandBorder font-mono text-xs hover:bg-zinc-700 hover:text-zinc-200 transition-colors uppercase cursor-pointer"
          >
            Close
          </button>
        ` : ''}
      </div>
      
      ${!isConfigured ? `
        <button 
          id="run-demo-btn" 
          class="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors cursor-pointer hover:underline uppercase self-center mt-1"
        >
          Or, Run Demo Sandbox Mode
        </button>
      ` : ''}
    </div>
  `;
  overlay.classList.remove('hidden');

  if (!isConfigured) {
    const saveBtn = document.getElementById('save-setup-key-btn');
    const input = document.getElementById('setup-api-key-input');
    const demoBtn = document.getElementById('run-demo-btn');

    saveBtn.addEventListener('click', async () => {
      const key = input.value.trim();
      if (!key) {
        showToast('Please enter an API key.', 'error');
        return;
      }
      localStorage.setItem('ticket_tailor_api_key', key);
      overlay.classList.add('hidden');
      showToast('API Key saved locally. Loading rosters...');
      await fetchTickets();
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      }
    });

    demoBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      showToast('Running in Demo mode.');
    });
  } else {
    document.getElementById('setup-change-key-btn').addEventListener('click', () => {
      localStorage.removeItem('ticket_tailor_api_key');
      showApiKeyModal(allowCancel);
    });

    document.getElementById('setup-delete-key-btn').addEventListener('click', () => {
      localStorage.removeItem('ticket_tailor_api_key');
      localStorage.removeItem('ticket_dash_local_imports');
      overlay.classList.add('hidden');
      showToast('API Key and local data deleted. Reloading...');
      location.reload();
    });
  }

  const cancelBtn = document.getElementById('cancel-setup-key-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
    });
  }
}

function checkApiKeySetup(apiConfigured) {
  const localKey = localStorage.getItem('ticket_tailor_api_key');
  if (apiConfigured || localKey) {
    const keyPanel = document.getElementById('api-key-setup-overlay');
    if (keyPanel) keyPanel.classList.add('hidden');
    return;
  }
  showApiKeyModal(false);
}



async function fetchTickets() {
  try {
    const headers = {};
    const localKey = localStorage.getItem('ticket_tailor_api_key');
    if (localKey) {
      headers['x-api-key'] = localKey;
    }

    const response = await fetch('/api/tickets', { headers });
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.statusText}`);
    }

    const data = await response.json();
    tickets = data.tickets || [];

    if (localKey) {
      const localImportsJson = localStorage.getItem('ticket_dash_local_imports');
      if (localImportsJson) {
        try {
          const localImports = JSON.parse(localImportsJson);
          if (Array.isArray(localImports)) {
            const importedFiltered = localImports.filter(lt => !tickets.some(t => t.ticket_id === lt.ticket_id));
            tickets = tickets.concat(importedFiltered);
          }
        } catch (e) {
          console.error('Failed to parse local imports:', e);
        }
      }
    }

    // Precalculate activity counts, money spent, and thresholds
    calculateMetrics();

    populateEventFilter();
    updateSyncStatus(data);
    
    // Check if we need to show the API key overlay
    checkApiKeySetup(data.api_key_configured);
    

    
    applyFilters();

  } catch (error) {
    console.error('Error fetching tickets:', error);
    showToast('Failed to load tickets from local cache.', 'error');
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" class="px-4 py-12 text-center text-rose-400 font-mono">
          Error loading cached data. Please run a Sync to fetch new records.
        </td>
      </tr>
    `;
  }
}

function calculateMetrics() {
  emailCounts = {};
  emailSpent = {};
  orderCounts = {};

  tickets.forEach(t => {
    const email = (t.email || '').toLowerCase().trim();
    if (email) {
      emailCounts[email] = (emailCounts[email] || 0) + 1;
      emailSpent[email] = (emailSpent[email] || 0) + (t.price || 0);
    }
    const orderId = (t.order_id || '').toLowerCase().trim();
    if (orderId) {
      orderCounts[orderId] = (orderCounts[orderId] || 0) + 1;
    }
  });

  const repeatCounts = Object.values(emailCounts)
    .filter(count => count > 1)
    .sort((a, b) => a - b);

  if (repeatCounts.length > 0) {
    const L = repeatCounts.length;
    const idx33 = Math.floor(L * 0.333);
    const idx66 = Math.floor(L * 0.667);
    middle33Threshold = repeatCounts[idx33] || 2;
    top33Threshold = repeatCounts[idx66] || 2;
  } else {
    middle33Threshold = 2;
    top33Threshold = 2;
  }

  const spentList = Object.values(emailSpent).sort((a, b) => a - b);
  if (spentList.length > 0) {
    const L = spentList.length;
    const idx66 = Math.floor(L * 0.667);
    highValueThreshold = Math.max(100, spentList[idx66] || 100);
  } else {
    highValueThreshold = 100;
  }
}

function getActivityStars(email) {
  if (!email) return 1;
  const count = emailCounts[email.toLowerCase().trim()] || 0;
  if (count <= 1) return 1;
  if (count >= top33Threshold) return 3;
  if (count >= middle33Threshold) return 2;
  return 1;
}

function renderActivityStars(email) {
  const stars = getActivityStars(email);
  if (stars === 3) {
    return `<span class="text-zinc-300 select-none">★★★</span>`;
  }
  if (stars === 2) {
    return `<span class="text-zinc-300 select-none">★★</span><span class="text-zinc-700 select-none">★</span>`;
  }
  return `<span class="text-zinc-300 select-none">★</span><span class="text-zinc-700 select-none">★★</span>`;
}

function populateEventFilter() {
  const currentSelection = eventFilter.value || eventFilter.dataset.pendingSelection || '';
  const eventsSet = new Set();
  tickets.forEach(ticket => {
    if (ticket.event_name) eventsSet.add(ticket.event_name);
  });

  uniqueEvents = Array.from(eventsSet).sort();

  eventFilter.innerHTML = '<option value="">All Events</option>';
  uniqueEvents.forEach(evt => {
    const option = document.createElement('option');
    option.value = evt;
    option.textContent = evt;
    eventFilter.appendChild(option);
  });

  if (eventsSet.has(currentSelection)) {
    eventFilter.value = currentSelection;
  }
  delete eventFilter.dataset.pendingSelection;
}

function updateSyncStatus(data) {
  const dot = document.getElementById('sync-status-dot');
  const text = document.getElementById('sync-status-text');
  
  if (!dot || !text) return;
  dot.className = 'w-1.5 h-1.5 rounded-full';

  let timeString = '';
  if (data.last_synced) {
    const syncDate = new Date(data.last_synced);
    timeString = syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  if (!data.api_key_configured) {
    dot.classList.add('bg-amber-500');
    text.textContent = 'demo';
    if (statusContainer) statusContainer.title = 'Demo Sandbox Mode (no API key in .env)';
  } else if (data.last_error) {
    dot.classList.add('bg-rose-500');
    text.textContent = 'warning';
    if (statusContainer) statusContainer.title = `Sync warning: ${data.last_error}`;
  } else if (data.is_demo) {
    dot.classList.add('bg-zinc-500');
    text.textContent = 'demo';
    if (statusContainer) statusContainer.title = 'Cache empty. Click ↻ to sync.';
  } else {
    dot.classList.add('bg-emerald-500');
    text.textContent = timeString ? `live ${timeString}` : 'live';
    if (statusContainer) statusContainer.title = `Connected & cached in-memory. Synced: ${timeString}`;
  }
}

function parseDateQueryToRange(q, now) {
  let start = null;
  let end = null;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (q === 'today') {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (q === 'yesterday') {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    start = startOfDay(d);
    end = endOfDay(d);
  } else if (q === 'tomorrow') {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    start = startOfDay(d);
    end = endOfDay(d);
  } else if (q === 'this week') {
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    start = startOfDay(sunday);
    end = endOfDay(saturday);
  } else if (q === 'last week') {
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() - 7);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    start = startOfDay(sunday);
    end = endOfDay(saturday);
  } else if (q === 'this month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (q === 'last month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (q === 'this year') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (q === 'last year') {
    start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else if (/^(?:past|last)\s+(\d+)\s+days?$/.test(q)) {
    const match = q.match(/^(?:past|last)\s+(\d+)\s+days?$/);
    const days = parseInt(match[1], 10);
    start = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
    end = endOfDay(now);
  } else if (/^(?:past|last)\s+day$/.test(q)) {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (/^(?:past|last)\s+(\d+)\s+weeks?$/.test(q)) {
    const match = q.match(/^(?:past|last)\s+(\d+)\s+weeks?$/);
    const weeks = parseInt(match[1], 10);
    start = startOfDay(new Date(now.getTime() - (weeks * 7 - 1) * 24 * 60 * 60 * 1000));
    end = endOfDay(now);
  } else if (q === 'past week') {
    start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    end = endOfDay(now);
  } else if (/^(?:past|last)\s+(\d+)\s+months?$/.test(q)) {
    const match = q.match(/^(?:past|last)\s+(\d+)\s+months?$/);
    const months = parseInt(match[1], 10);
    start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getTime());
  } else if (/^(\d+)\s+days?\s+ago$/.test(q)) {
    const match = q.match(/^(\d+)\s+days?\s+ago$/);
    const days = parseInt(match[1], 10);
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    start = startOfDay(d);
    end = endOfDay(d);
  } else if (/^(\d+)\s+weeks?\s+ago$/.test(q)) {
    const match = q.match(/^(\d+)\s+weeks?\s+ago$/);
    const weeks = parseInt(match[1], 10);
    const sundayOfThisWeek = new Date(now);
    sundayOfThisWeek.setDate(now.getDate() - now.getDay());
    const sunday = new Date(sundayOfThisWeek);
    sunday.setDate(sundayOfThisWeek.getDate() - weeks * 7);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    start = startOfDay(sunday);
    end = endOfDay(saturday);
  } else if (/^(\d+)\s+months?\s+ago$/.test(q)) {
    const match = q.match(/^(\d+)\s+months?\s+ago$/);
    const X = parseInt(match[1], 10);
    start = new Date(now.getFullYear(), now.getMonth() - X, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() - X + 1, 0, 23, 59, 59, 999);
  } else if (/^\d{4}$/.test(q)) {
    const yr = parseInt(q, 10);
    start = new Date(yr, 0, 1, 0, 0, 0, 0);
    end = new Date(yr, 11, 31, 23, 59, 59, 999);
  }

  if (!start) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthShorts = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    let foundMonth = -1;
    let foundYear = null;

    for (let i = 0; i < 12; i++) {
      const regexName = new RegExp('\\b' + monthNames[i] + '\\b|\\b' + monthShorts[i] + '\\b');
      if (regexName.test(q)) {
        foundMonth = i;
        break;
      }
    }

    const yearMatch = q.match(/\b(\d{4})\b/);
    if (yearMatch) {
      foundYear = parseInt(yearMatch[1], 10);
    }

    if (foundMonth !== -1) {
      const yr = foundYear || now.getFullYear();
      start = new Date(yr, foundMonth, 1, 0, 0, 0, 0);
      end = new Date(yr, foundMonth + 1, 0, 23, 59, 59, 999);
    }
  }

  if (start && end) {
    return { start, end };
  }
  return null;
}

function matchNaturalLanguageDate(timestamp, query) {
  if (!timestamp) return false;
  const isSeconds = timestamp < 10000000000;
  const ticketDate = new Date(timestamp * (isSeconds ? 1000 : 1));
  if (isNaN(ticketDate.getTime())) return false;

  const now = new Date();
  const q = query.toLowerCase().trim().replace(/\s+/g, ' ');

  const range = parseDateQueryToRange(q, now);
  if (range) {
    return ticketDate >= range.start && ticketDate <= range.end;
  }

  const day = ticketDate.getDate();
  const monthIndex = ticketDate.getMonth();
  const year = ticketDate.getFullYear();
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthsShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthName = months[monthIndex];
  const monthShort = monthsShort[monthIndex];
  const weekday = ticketDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const weekdayShort = ticketDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  const dayWithSuffix = `${day}${suffix}`;

  const dateStrings = [
    `${day}`,
    `${dayWithSuffix}`,
    `${monthName}`,
    `${monthShort}`,
    `${year}`,
    `${weekday}`,
    `${weekdayShort}`,
    `${monthName} ${day}`,
    `${monthName} ${dayWithSuffix}`,
    `${day} of ${monthName}`,
    `${dayWithSuffix} of ${monthName}`,
    `${monthShort} ${day}`,
    `${monthShort} ${dayWithSuffix}`,
    `${monthIndex + 1}/${day}/${year}`,
    `${day}/${monthIndex + 1}/${year}`,
    `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  ].map(s => s.toLowerCase());

  return dateStrings.some(s => s.includes(q));
}

function truncateTicketType(typeName) {
  if (!typeName) return '—';
  const maxLen = 26;
  if (typeName.length <= maxLen) return typeName;
  const start = typeName.slice(0, 11);
  const end = typeName.slice(-11);
  return `${start}...${end}`;
}

function renderMergedField(items, formatter = (x) => x, cellId = null) {
  if (!items || items.length === 0) return '—';
  if (items.length === 1) return formatter(items[0]);

  if (compactRows && items.length > 1) {
    const rest = items.length - 1;
    const idAttr = cellId ? ` data-cell-id="${cellId}"` : '';
    return `
      <div class="compact-cell-wrap"${idAttr}>
        <div class="py-1">${formatter(items[0])}</div>
        <button class="expand-cell-btn mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors select-none" data-items='${JSON.stringify(items)}' data-full-html='${encodeURIComponent(items.map((item, idx) => `<div class="py-1 border-b border-brandBorder/20 last:border-0 last:pb-0 first:pt-0">${formatter(item)}</div>`).join(''))}'>+${rest} more</button>
      </div>
    `;
  }

  return items.map((item, idx) => `
    <div class="py-1 border-b border-brandBorder/20 last:border-0 last:pb-0 first:pt-0">
      ${formatter(item)}
    </div>
  `).join('');
}

function formatCheckin(checked_in) {
  const checkinClass = checked_in ? 'text-emerald-400 font-medium' : 'text-zinc-600 font-normal';
  const checkinDot = checked_in
    ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span>'
    : '<span class="inline-block w-1.5 h-1.5 rounded-full bg-zinc-700 mr-2"></span>';
  const checkinText = checked_in ? 'Checked In' : 'Unchecked';
  return `<div class="flex items-center ${checkinClass}">${checkinDot}${checkinText}</div>`;
}

function isMembershipTicket(ticket) {
  const keywords = ['member', 'vip', 'pass', 'patron', 'club', 'sponsor', 'gold', 'platinum', 'silver', 'bronze', 'comp', 'staff', 'priority', 'premium', 'supporter'];
  if (ticket.is_merged) {
    return ticket.ticket_types.some(type => {
      const t = (type || '').toLowerCase();
      return keywords.some(k => t.includes(k));
    });
  }
  const type = (ticket.ticket_type || '').toLowerCase();
  return keywords.some(k => type.includes(k));
}

function applyFilters() {
  const rawQuery = searchInput.value;
  
  if (rawQuery.toLowerCase().startsWith('/hide row ')) {
    searchInput.placeholder = 'Enter the name of the entry row you want to hide...';
  } else if (rawQuery.toLowerCase().startsWith('/hide by rule ')) {
    searchInput.placeholder = 'Format: /hide by rule [option] [value1] [value2]...';
  } else {
    searchInput.placeholder = 'Fuzzy search...';
  }

  const selectedEvent = eventFilter.value;

  filteredTickets = tickets.filter(ticket => {
    if (hiddenRowIds.has(ticket.ticket_id)) {
      return false;
    }

    if (selectedEvent && ticket.event_name !== selectedEvent) {
      return false;
    }

    if (hideAdminOrders) {
      const fn = (ticket.first_name || '').toLowerCase();
      const ln = (ticket.last_name || '').toLowerCase();
      const em = (ticket.email || '').toLowerCase();
      const ord = (ticket.order_id || '').toLowerCase();
      
      if (
        fn.includes('admin') || fn.includes('test') || 
        ln.includes('admin') || ln.includes('test') || 
        em.includes('admin') || em.includes('test') ||
        ord.includes('test')
      ) {
        return false;
      }
    }

    if (onlyCheckedIn && !ticket.checked_in) {
      return false;
    }

    if (onlyUnchecked && ticket.checked_in) {
      return false;
    }

    if (validEmailsOnly && !ticket.is_email_valid) {
      return false;
    }

    if (hideTestOrders) {
      const tt = (ticket.ticket_type || '').toLowerCase();
      const ev = (ticket.event_name || '').toLowerCase();
      if (tt.includes('[test order]') || ev.includes('[test order]')) {
        return false;
      }
    }

    if (hideVoidOrders) {
      const tt = (ticket.ticket_type || '').toLowerCase();
      const ev = (ticket.event_name || '').toLowerCase();
      if (tt.includes('[void]') || ev.includes('[void]')) {
        return false;
      }
    }

    if (vipOnly && !isMembershipTicket(ticket)) {
      return false;
    }

    if (highValueOnly) {
      const email = (ticket.email || '').toLowerCase().trim();
      const spent = emailSpent[email] || 0;
      if (spent < highValueThreshold) return false;
    }

    if (activeOnly) {
      const email = (ticket.email || '').toLowerCase().trim();
      const count = emailCounts[email] || 0;
      if (count < 2) return false;
    }

    if (hideImports && ticket.is_imported) {
      return false;
    }

    if (onlyImports && !ticket.is_imported) {
      return false;
    }

    if (showRepeatBuyersOnly) {
      const email = (ticket.email || '').toLowerCase().trim();
      const count = emailCounts[email] || 0;
      if (count < 2) return false;
    }

    if (showMultiTicketOrdersOnly) {
      const ordId = (ticket.order_id || '').toLowerCase().trim();
      const count = orderCounts[ordId] || 0;
      if (count <= 1) return false;
    }

    if (showIncompleteNamesOnly) {
      const fn = (ticket.first_name || '').trim();
      const ln = (ticket.last_name || '').trim();
      const isBad = fn.length <= 1 || ln.length <= 1;
      if (!isBad) return false;
    }

    if (showMissingPhoneOnly) {
      if (ticket.phone && ticket.phone.trim() !== '') return false;
    }

    if (showFreeTicketsOnly) {
      if ((ticket.price || 0) > 0) return false;
    }

    const query = rawQuery.toLowerCase().trim();
    if (query && query.startsWith('/')) {
      if (query.startsWith('/show domain ')) {
        const domains = query.substring(13).split(/\s+/).map(d => d.trim().toLowerCase()).filter(Boolean);
        if (domains.length > 0) {
          const email = (ticket.email || '').toLowerCase().trim();
          const matched = domains.some(dom => email.endsWith('@' + dom) || email === dom);
          if (!matched) return false;
        }
      } else if (query.startsWith('/hide domain ')) {
        const domains = query.substring(13).split(/\s+/).map(d => d.trim().toLowerCase()).filter(Boolean);
        if (domains.length > 0) {
          const email = (ticket.email || '').toLowerCase().trim();
          const matched = domains.some(dom => email.endsWith('@' + dom) || email === dom);
          if (matched) return false;
        }
      } else if (query.startsWith('/show local phone ')) {
        const prefix = query.substring(18).trim().toLowerCase();
        if (prefix) {
          const phone = (ticket.phone || '').replace(/\D/g, '');
          const cleanPrefix = prefix.replace(/\D/g, '');
          if (cleanPrefix && !phone.startsWith(cleanPrefix)) return false;
        }
      } else if (query.startsWith('/show ticket range ')) {
        const parts = query.substring(19).trim().split(/\s+/);
        const minVal = parseFloat(parts[0]);
        const maxVal = parseFloat(parts[1]);
        const price = ticket.price || 0;
        if (!isNaN(minVal) && price < minVal) return false;
        if (!isNaN(maxVal) && price > maxVal) return false;
      }
    }
    if (query && !query.startsWith('/')) {
      let activePrefix = null;
      let activeQuery = query;

      const prefixKeys = Object.keys(MODIFIER_MAP);
      for (const p of prefixKeys) {
        if (query.startsWith(p)) {
          activePrefix = MODIFIER_MAP[p];
          activeQuery = query.slice(p.length).trim();
          break;
        }
      }

      if (activePrefix) {
        if (!activeQuery) return true;

        if (activePrefix === 'first_name') {
          return (ticket.first_name || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'last_name') {
          return (ticket.last_name || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'name') {
          const fn = (ticket.first_name || '').toLowerCase();
          const ln = (ticket.last_name || '').toLowerCase();
          return `${fn} ${ln}`.includes(activeQuery);
        } else if (activePrefix === 'email') {
          return (ticket.email || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'phone') {
          return (ticket.phone || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'event_name') {
          if (ticket.is_merged) {
            return ticket.event_names.some(name => name.toLowerCase().includes(activeQuery));
          }
          return (ticket.event_name || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'ticket_type') {
          if (ticket.is_merged) {
            return ticket.ticket_types.some(type => type.toLowerCase().includes(activeQuery));
          }
          return (ticket.ticket_type || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'order_id') {
          if (ticket.is_merged) {
            return ticket.order_ids.some(id => id.toLowerCase().includes(activeQuery));
          }
          return (ticket.order_id || '').toLowerCase().includes(activeQuery);
        } else if (activePrefix === 'date') {
          if (ticket.is_merged) {
            return ticket.purchase_dates.some(date => matchNaturalLanguageDate(date, activeQuery));
          }
          return matchNaturalLanguageDate(ticket.purchase_date, activeQuery);
        } else if (activePrefix === 'min_spend') {
          const val = parseFloat(activeQuery);
          if (isNaN(val)) return true;
          const email = (ticket.email || '').toLowerCase().trim();
          const spent = emailSpent[email] || 0;
          return spent >= val;
        } else if (activePrefix === 'max_spend') {
          const val = parseFloat(activeQuery);
          if (isNaN(val)) return true;
          const email = (ticket.email || '').toLowerCase().trim();
          const spent = emailSpent[email] || 0;
          return spent <= val;
        } else if (activePrefix === 'stars') {
          const val = parseInt(activeQuery.replace(/\*/g, ''), 10);
          if (isNaN(val)) {
            const starsLen = (activeQuery.match(/\*/g) || []).length;
            if (starsLen >= 1 && starsLen <= 3) {
              const email = (ticket.email || '').toLowerCase().trim();
              return getActivityStars(email) === starsLen;
            }
            return true;
          }
          const email = (ticket.email || '').toLowerCase().trim();
          return getActivityStars(email) === val;
        }
      } else {
        const firstName = (ticket.first_name || '').toLowerCase();
        const lastName = (ticket.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const email = (ticket.email || '').toLowerCase();
        const phone = (ticket.phone || '').toLowerCase();
        const matchesDate = matchNaturalLanguageDate(ticket.purchase_date, query);

        return (
          fullName.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          matchesDate
        );
      }
    }

    return true;
  });

  if (hideDuplicates) {
    const groups = {};
    filteredTickets.forEach(ticket => {
      const email = (ticket.email || '').toLowerCase().trim();
      if (!groups[email]) {
        groups[email] = [];
      }
      groups[email].push(ticket);
    });

    filteredTickets = Object.keys(groups).map(email => {
      const group = groups[email];
      const base = { ...group[0] };
      base.is_merged = true;
      base.is_imported = group.some(t => t.is_imported);
      base.ticket_ids = group.map(t => t.ticket_id);
      base.event_names = group.map(t => t.event_name);
      base.ticket_types = group.map(t => t.ticket_type);
      base.order_ids = group.map(t => t.order_id);
      base.purchase_dates = group.map(t => t.purchase_date);
      base.checked_ins = group.map(t => t.checked_in);
      return base;
    });
  }

  filteredTickets.sort((a, b) => {
    if (currentSort === 'first_name') {
      const nameA = (a.first_name || '').trim().toLowerCase();
      const nameB = (b.first_name || '').trim().toLowerCase();
      if (nameA === '' && nameB !== '') return 1;
      if (nameB === '' && nameA !== '') return -1;
      return nameA.localeCompare(nameB);
    }
    if (currentSort === 'last_name') {
      const nameA = (a.last_name || '').trim().toLowerCase();
      const nameB = (b.last_name || '').trim().toLowerCase();
      if (nameA === '' && nameB !== '') return 1;
      if (nameB === '' && nameA !== '') return -1;
      return nameA.localeCompare(nameB);
    }
    if (currentSort === 'date_desc') {
      const dateA = a.purchase_date || 0;
      const dateB = b.purchase_date || 0;
      return dateB - dateA;
    }
    if (currentSort === 'date_asc') {
      const dateA = a.purchase_date || 0;
      const dateB = b.purchase_date || 0;
      return dateA - dateB;
    }
    if (currentSort === 'ticket_type') {
      const typeA = (a.ticket_type || '').trim().toLowerCase();
      const typeB = (b.ticket_type || '').trim().toLowerCase();
      return typeA.localeCompare(typeB);
    }
    if (currentSort === 'membership') {
      const aIsMember = isMembershipTicket(a);
      const bIsMember = isMembershipTicket(b);
      if (aIsMember && !bIsMember) return -1;
      if (!aIsMember && bIsMember) return 1;
      const nameA = (a.first_name || '').trim().toLowerCase();
      const nameB = (b.first_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (currentSort === 'events_bought') {
      const emailA = (a.email || '').toLowerCase().trim();
      const emailB = (b.email || '').toLowerCase().trim();
      const countA = emailCounts[emailA] || 0;
      const countB = emailCounts[emailB] || 0;
      if (countA !== countB) return countB - countA;
      const nameA = (a.first_name || '').trim().toLowerCase();
      const nameB = (b.first_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (currentSort === 'money_spent') {
      const emailA = (a.email || '').toLowerCase().trim();
      const emailB = (b.email || '').toLowerCase().trim();
      const spentA = emailSpent[emailA] || 0;
      const spentB = emailSpent[emailB] || 0;
      if (spentA !== spentB) return spentB - spentA;
      const nameA = (a.first_name || '').trim().toLowerCase();
      const nameB = (b.first_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (currentSort === 'activity') {
      const emailA = (a.email || '').toLowerCase().trim();
      const emailB = (b.email || '').toLowerCase().trim();
      const starsA = getActivityStars(emailA);
      const starsB = getActivityStars(emailB);
      if (starsA !== starsB) return starsB - starsA;
      const nameA = (a.first_name || '').trim().toLowerCase();
      const nameB = (b.first_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (currentSort === 'checked') {
      const checkedA = a.is_merged ? a.checked_ins.some(c => c) : a.checked_in;
      const checkedB = b.is_merged ? b.checked_ins.some(c => c) : b.checked_in;
      if (checkedA && !checkedB) return -1;
      if (!checkedA && checkedB) return 1;
      const nameA = (a.first_name || '').trim().toLowerCase();
      const nameB = (b.first_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  renderTable();
  updateStats();
  saveSettings();
}

function renderTable() {
  const thFirst = document.getElementById('th-first_name');
  const thLast = document.getElementById('th-last_name');
  if (thFirst) {
    thFirst.textContent = mergeNameCols ? 'Name' : 'First Name';
  }
  updateTableGridlines();
  updateDensityStyles();

  const colKeys = ['first_name', 'last_name', 'email', 'phone', 'event_name', 'ticket_type', 'spent', 'activity', 'order_id', 'purchase_date', 'checked_in'];
  colKeys.forEach(col => {
    const th = document.getElementById(`th-${col}`);
    if (th) {
      let isVisible = visibleCols[col];
      if (col === 'last_name' && mergeNameCols) {
        isVisible = false;
      }
      th.classList.toggle('hidden', !isVisible);
    }
  });

  const visibleColsCount = Object.values(visibleCols).filter(Boolean).length;

  if (filteredTickets.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${visibleColsCount}" class="px-4 py-12 text-center text-brandSubtext font-mono">
          No tickets found matching your query or filters.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredTickets.map(t => {
    let cells = [];

    let importIconRendered = false;
    if (visibleCols.first_name) {
      let iconHtml = '';
      if (t.is_imported) {
        iconHtml = `
          <svg class="w-3 h-3 text-zinc-500 hover:text-zinc-300 transition-colors inline mr-1.5 align-text-bottom" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" title="Imported from local CSV">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path>
          </svg>
        `;
        importIconRendered = true;
      }
      let val = '';
      let displayVal = '';
      if (mergeNameCols) {
        const fn = t.first_name || '';
        const ln = t.last_name || '';
        val = `${fn} ${ln}`.trim();
        let formattedVal = val;
        if (caseFormatTitle && val) {
          formattedVal = toTitleCase(val);
        }
        displayVal = formattedVal || '<span class="text-zinc-700 font-mono">—</span>';
      } else {
        val = t.first_name || '';
        let formattedVal = val;
        if (caseFormatTitle && val) {
          formattedVal = toTitleCase(val);
        }
        displayVal = formattedVal || '<span class="text-zinc-700 font-mono">—</span>';
      }
      const copyClass = val ? 'cursor-pointer hover:bg-zinc-900/80 transition-colors' : '';
      cells.push(`
        <td class="px-4 py-3 relative text-zinc-200 font-medium whitespace-nowrap ${copyClass}" data-copy-type="${mergeNameCols ? 'name' : 'first_name'}" data-raw-val="${val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text">${iconHtml}${displayVal}</span>
            ${val ? '<span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>' : ''}
          </div>
        </td>
      `);
    }

    if (visibleCols.last_name && !mergeNameCols) {
      let iconHtml = '';
      if (t.is_imported && !importIconRendered) {
        iconHtml = `
          <svg class="w-3 h-3 text-zinc-500 hover:text-zinc-300 transition-colors inline mr-1.5 align-text-bottom" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" title="Imported from local CSV">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path>
          </svg>
        `;
        importIconRendered = true;
      }
      const val = t.last_name || '';
      let formattedVal = val;
      if (caseFormatTitle && val) {
        formattedVal = toTitleCase(val);
      }
      const displayVal = formattedVal || '<span class="text-zinc-700 font-mono">—</span>';
      const copyClass = val ? 'cursor-pointer hover:bg-zinc-900/80 transition-colors' : '';
      cells.push(`
        <td class="px-4 py-3 relative text-zinc-200 whitespace-nowrap ${copyClass}" data-copy-type="last_name" data-raw-val="${val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text">${iconHtml}${displayVal}</span>
            ${val ? '<span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>' : ''}
          </div>
        </td>
      `);
    }

    if (visibleCols.email) {
      let emailDisplay = '';
      if (t.is_email_valid) {
        emailDisplay = `<span class="email-value text-zinc-300 select-text">${t.email}</span>`;
      } else {
        const displayValue = t.email || '—';
        emailDisplay = `
          <div class="flex items-center gap-1.5" title="Malformed or invalid email string">
            <span class="email-value text-rose-400 line-through select-text">${displayValue}</span>
            <span class="px-1 py-0.2 text-[9px] bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded font-mono font-medium scale-90 uppercase">Invalid</span>
          </div>
        `;
      }
      const emailCopyClass = t.is_email_valid ? 'cursor-pointer hover:bg-zinc-900/80' : '';
      cells.push(`
        <td class="px-4 py-3 relative font-mono text-[11px] ${emailCopyClass} transition-colors" data-copy-type="email" data-raw-val="${t.email}">
          <div class="flex items-center justify-between">
            ${emailDisplay}
            <span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>
          </div>
        </td>
      `);
    }

    if (visibleCols.phone) {
      const phoneDisplay = t.phone 
        ? `<span class="phone-value text-zinc-300 select-text">${t.phone}</span>`
        : '<span class="text-zinc-700 font-mono">—</span>';
      const phoneCopyClass = t.phone ? 'cursor-pointer hover:bg-zinc-900/80' : '';
      cells.push(`
        <td class="px-4 py-3 relative font-mono text-[11px] ${phoneCopyClass} transition-colors" data-copy-type="phone" data-raw-val="${t.phone}">
          <div class="flex items-center justify-between">
            ${phoneDisplay}
            <span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>
          </div>
        </td>
      `);
    }

    if (visibleCols.event_name) {
      const val = t.is_merged ? t.event_names.join(', ') : t.event_name;
      const displayVal = t.is_merged ? renderMergedField(t.event_names) : t.event_name;
      const copyClass = val ? 'cursor-pointer hover:bg-zinc-900/80 transition-colors' : '';
      cells.push(`
        <td class="px-4 py-3 relative text-zinc-400 max-w-[200px] truncate ${copyClass}" title="${val}" data-copy-type="event_name" data-raw-val="${val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text truncate">${displayVal}</span>
            ${val ? '<span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>' : ''}
          </div>
        </td>
      `);
    }

    if (visibleCols.ticket_type) {
      const val = t.is_merged ? t.ticket_types.join(', ') : t.ticket_type;
      const displayVal = t.is_merged 
        ? renderMergedField(t.ticket_types, (name) => `<span class="px-1.5 py-0.5 rounded bg-brandMuted border border-brandBorder text-[10px] font-mono text-zinc-300" title="${name}">${truncateTicketType(name)}</span>`) 
        : `<span class="px-1.5 py-0.5 rounded bg-brandMuted border border-brandBorder text-[10px] font-mono text-zinc-300" title="${t.ticket_type}">${truncateTicketType(t.ticket_type)}</span>`;
      const copyClass = val ? 'cursor-pointer hover:bg-zinc-900/80 transition-colors' : '';
      cells.push(`
        <td class="px-4 py-3 relative text-zinc-400 ${copyClass}" data-copy-type="ticket_type" data-raw-val="${val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text">${displayVal}</span>
            ${val ? '<span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>' : ''}
          </div>
        </td>
      `);
    }

    if (visibleCols.spent) {
      const priceVal = t.is_merged
        ? (emailSpent[(t.email || '').toLowerCase().trim()] || 0)
        : (t.price || 0);
      const val = `$${priceVal.toFixed(2)}`;
      const copyClass = 'cursor-pointer hover:bg-zinc-900/80 transition-colors';
      cells.push(`
        <td class="px-4 py-3 relative font-mono text-[11px] text-zinc-300 ${copyClass}" data-copy-type="spent" data-raw-val="${val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text">${val}</span>
            <span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>
          </div>
        </td>
      `);
    }

    if (visibleCols.activity) {
      cells.push(`
        <td class="px-4 py-3 text-[11px]">
          ${renderActivityStars(t.email)}
        </td>
      `);
    }

    if (visibleCols.order_id) {
      const val = t.is_merged ? t.order_ids.join(', ') : (t.order_id || '');
      const displayVal = t.is_merged ? renderMergedField(t.order_ids) : (t.order_id || '—');
      const copyClass = val ? 'cursor-pointer hover:bg-zinc-900/80 transition-colors' : '';
      cells.push(`
        <td class="px-4 py-3 relative font-mono text-[11px] text-zinc-500 ${copyClass}" data-copy-type="order_id" data-raw-val="${val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text">${displayVal}</span>
            ${val ? '<span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>' : ''}
          </div>
        </td>
      `);
    }

    if (visibleCols.purchase_date) {
      const val = t.is_merged ? t.purchase_dates.map(formatDate).join(', ') : formatDate(t.purchase_date);
      const displayVal = t.is_merged ? renderMergedField(t.purchase_dates, formatDate) : formatDate(t.purchase_date);
      const copyClass = val && val !== '—' ? 'cursor-pointer hover:bg-zinc-900/80 transition-colors' : '';
      cells.push(`
        <td class="px-4 py-3 relative font-mono text-[11px] text-zinc-500 ${copyClass}" data-copy-type="purchase_date" data-raw-val="${val === '—' ? '' : val}">
          <div class="flex items-center justify-between gap-2">
            <span class="value-text">${displayVal}</span>
            ${val && val !== '—' ? '<span class="copy-indicator text-[10px] text-emerald-400 font-mono opacity-0 transition-opacity select-none pointer-events-none">Copied</span>' : ''}
          </div>
        </td>
      `);
    }

    if (visibleCols.checked_in) {
      cells.push(`
        <td class="px-4 py-3 font-mono text-[10px]">
          ${t.is_merged ? renderMergedField(t.checked_ins, formatCheckin) : formatCheckin(t.checked_in)}
        </td>
      `);
    }

    let isRecent = false;
    const oneDayAgo = (Date.now() / 1000) - 86400;
    if (t.is_merged && t.purchase_dates) {
      isRecent = t.purchase_dates.some(date => date >= oneDayAgo);
    } else if (t.purchase_date) {
      isRecent = t.purchase_date >= oneDayAgo;
    }
    const rowClass = (highlightRecent && isRecent) ? 'highlight-recent-row' : '';

    return `
      <tr class="border-b border-brandBorder/40 transition-colors duration-100 ${rowClass}">
        ${cells.join('')}
      </tr>
    `;
  }).join('');

  bindTableInteraction();
}

function bindTableInteraction() {
  // Expand compact +N more buttons
  tableBody.querySelectorAll('.expand-cell-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap = btn.closest('.compact-cell-wrap');
      if (!wrap) return;
      const fullHtml = decodeURIComponent(btn.getAttribute('data-full-html') || '');
      wrap.innerHTML = fullHtml;
    });
  });

  const cells = tableBody.querySelectorAll('td[data-copy-type]');
  cells.forEach(cell => {
    cell.addEventListener('click', async (e) => {
      const rawVal = cell.getAttribute('data-raw-val');
      const copyType = cell.getAttribute('data-copy-type');
      
      if (!rawVal || rawVal.trim() === '') return;
      if (copyType === 'email') {
        const isEmailInvalid = cell.querySelector('.text-rose-400') !== null;
        if (isEmailInvalid) {
          showToast('Cannot copy malformed email address.', 'error');
          return;
        }
      }

      try {
        await navigator.clipboard.writeText(rawVal);
        
        const indicator = cell.querySelector('.copy-indicator');
        const textVal = cell.querySelector('.value-text, .email-value, .phone-value');
        
        if (indicator) {
          indicator.classList.remove('opacity-0');
          indicator.classList.add('opacity-100');
          if (textVal) textVal.classList.add('opacity-30');
          
          setTimeout(() => {
            indicator.classList.remove('opacity-100');
            indicator.classList.add('opacity-0');
            if (textVal) textVal.classList.remove('opacity-30');
          }, 1000);
        }

        showToast(`Copied ${copyType}: ${rawVal}`);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
        showToast('Failed to copy to clipboard.', 'error');
      }
    });
  });
}

function updateStats() {
  const total = filteredTickets.length;
  const emailsSet = new Set();
  let malformedCount = 0;

  filteredTickets.forEach(t => {
    if (t.is_email_valid && t.email) {
      emailsSet.add(t.email.toLowerCase().trim());
    } else if (!t.is_email_valid) {
      malformedCount++;
    }
  });

  statTotalTickets.textContent = total;
  statUniqueEmails.textContent = emailsSet.size;
  statMalformedEmails.textContent = malformedCount;

  if (malformedCount > 0) {
    statMalformedCard.className = 'p-4 rounded border border-rose-900/60 bg-rose-950/10 transition-colors duration-300';
    statMalformedEmails.className = 'text-xl font-semibold mt-1 font-mono text-rose-400';
  } else {
    statMalformedCard.className = 'p-4 rounded border border-brandBorder bg-brandCard/40 transition-colors duration-300';
    statMalformedEmails.className = 'text-xl font-semibold mt-1 font-mono text-zinc-100';
  }
}

async function triggerSync() {
  if (isSyncing) return;
  
  isSyncing = true;
  syncBtn.disabled = true;
  const dot = document.getElementById('sync-status-dot');
  const text = document.getElementById('sync-status-text');
  
  if (dot) {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-zinc-400 animate-spin';
  }
  if (text) {
    text.textContent = 'syncing';
  }

  try {
    const headers = {};
    const localKey = localStorage.getItem('ticket_tailor_api_key');
    if (localKey) {
      headers['x-api-key'] = localKey;
    }

    const response = await fetch('/api/sync', { method: 'POST', headers });
    const result = await response.json();

    if (result.success) {
      showToast(result.message || 'Cache sync completed successfully!');
    } else if (result.last_error) {
      throw new Error(result.last_error);
    } else {
      throw new Error(result.error || 'Server error occurred during sync.');
    }

    await fetchTickets();

  } catch (error) {
    console.error('Sync error:', error);
    showToast(error.message || 'Sync failed. Check API key settings.', 'error');
    await fetchTickets();
  } finally {
    isSyncing = false;
    syncBtn.disabled = false;
  }
}

async function triggerAutoSync() {
  try {
    const headers = {};
    const localKey = localStorage.getItem('ticket_tailor_api_key');
    if (localKey) {
      headers['x-api-key'] = localKey;
    }

    const response = await fetch('/api/sync', { headers });
    if (response.ok) {
      const result = await response.json();
      await fetchTickets();
      if (result.success && !result.is_demo) {
        showToast('Background sync completed.', 'success');
      } else if (result.last_error) {
        showToast(`Auto-sync warning: ${result.last_error}`, 'warning');
      }
    }
  } catch (err) {
    console.warn('Auto-sync failed:', err);
  }
}

function getExportRowData(t) {
  const checkedKeys = Object.keys(exportCols).filter(k => exportCols[k]);
  const row = {};
  checkedKeys.forEach(k => {
    if (k === 'email') {
      row.email = t.email || '';
    } else if (k === 'first_name') {
      row.first_name = t.first_name || '';
    } else if (k === 'last_name') {
      row.last_name = t.last_name || '';
    } else if (k === 'phone') {
      row.phone = t.phone || '';
    } else if (k === 'event_name') {
      row.event_name = t.is_merged ? t.event_names.join('; ') : (t.event_name || '');
    } else if (k === 'ticket_type') {
      row.ticket_type = t.is_merged ? t.ticket_types.join('; ') : (t.ticket_type || '');
    } else if (k === 'spent') {
      row.spent = t.is_merged
        ? `$${(emailSpent[(t.email || '').toLowerCase().trim()] || 0).toFixed(2)}`
        : `$${(t.price || 0).toFixed(2)}`;
    } else if (k === 'activity') {
      row.activity = `${getActivityStars(t.email)} stars`;
    } else if (k === 'order_id') {
      row.order_id = t.is_merged ? t.order_ids.join('; ') : (t.order_id || '');
    } else if (k === 'purchase_date') {
      row.purchase_date = t.is_merged ? t.purchase_dates.map(d => formatDate(d)).join('; ') : formatDate(t.purchase_date);
    } else if (k === 'checked_in') {
      row.checked_in = t.is_merged ? t.checked_ins.map(c => c ? 'Checked In' : 'Unchecked').join('; ') : (t.checked_in ? 'Checked In' : 'Unchecked');
    }
  });
  return row;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}`);
}

function generateCleanPDF(rows, checkedKeys) {
  if (typeof html2pdf === 'undefined') {
    showToast('PDF library is loading, please try again in a moment.', 'error');
    return;
  }

  const headerCells = checkedKeys.map(k => `<th style="text-align: left; padding: 8px; border-bottom: 2px solid #27272A; font-family: monospace; font-size: 10px; text-transform: uppercase; color: #71717A;">${k.replace('_', ' ')}</th>`).join('');

  const bodyRows = rows.map(r => {
    const rowCells = checkedKeys.map(k => {
      const val = String(r[k] || '');
      const formattedVal = val.split('; ').map(line => `<div>${line}</div>`).join('<hr style="border: 0; border-top: 1px solid #E4E4E7; margin: 3px 0;">');
      return `<td style="padding: 8px; border-bottom: 1px solid #E4E4E7; font-size: 10px; font-family: sans-serif; color: #18181B; vertical-align: top;">${formattedVal}</td>`;
    }).join('');
    return `<tr>${rowCells}</tr>`;
  }).join('');

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = `
    <div style="padding: 20px; color: #18181B; background-color: #FFFFFF; font-family: sans-serif;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;

  const opt = {
    margin:       [10, 10, 10, 10],
    filename:     `ticket_tailor_export_${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  showToast('Generating PDF...');
  
  html2pdf().set(opt).from(tempDiv).save()
    .then(() => {
      showToast('PDF downloaded successfully.');
    })
    .catch(err => {
      console.error('PDF export failed:', err);
      showToast('PDF export failed.', 'error');
    });
}

function executeExport(format) {
  if (filteredTickets.length === 0) {
    showToast('No records available to export.', 'error');
    return;
  }

  const checkedKeys = Object.keys(exportCols).filter(k => exportCols[k]);
  if (checkedKeys.length === 0) {
    showToast('Please select at least one column to export in settings (gear).', 'error');
    return;
  }

  const rows = filteredTickets.map(getExportRowData);

  if (format === 'clipboard') {
    let clipString = '';
    if (checkedKeys.length === 1 && checkedKeys[0] === 'email') {
      const emails = filteredTickets
        .filter(t => t.is_email_valid && t.email)
        .map(t => t.email.trim().toLowerCase());
      const uniqueEmails = Array.from(new Set(emails));
      clipString = uniqueEmails.join(', ');
      navigator.clipboard.writeText(clipString)
        .then(() => showToast(`Copied ${uniqueEmails.length} emails to clipboard.`))
        .catch(() => showToast('Clipboard copy failed.', 'error'));
    } else {
      const headers = checkedKeys.map(k => k.toUpperCase().replace('_', ' ')).join('\t');
      const dataRows = rows.map(r => checkedKeys.map(k => r[k]).join('\t')).join('\n');
      clipString = `${headers}\n${dataRows}`;
      navigator.clipboard.writeText(clipString)
        .then(() => showToast(`Copied ${rows.length} rows to clipboard.`))
        .catch(() => showToast('Clipboard copy failed.', 'error'));
    }
  } else if (format === 'csv') {
    const headers = checkedKeys.map(k => `"${k.replace(/"/g, '""')}"`).join(',');
    const dataRows = rows.map(r => checkedKeys.map(k => {
      const val = String(r[k] || '');
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${dataRows}`], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `ticket_tailor_export_${Date.now()}.csv`);
  } else if (format === 'tsv') {
    const headers = checkedKeys.map(k => k.toUpperCase().replace('_', ' ')).join('\t');
    const dataRows = rows.map(r => checkedKeys.map(k => String(r[k] || '').replace(/\t/g, ' ')).join('\t')).join('\n');
    const blob = new Blob([`${headers}\n${dataRows}`], { type: 'text/tab-separated-values;charset=utf-8;' });
    triggerDownload(blob, `ticket_tailor_export_${Date.now()}.tsv`);
  } else if (format === 'json') {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8;' });
    triggerDownload(blob, `ticket_tailor_export_${Date.now()}.json`);
  } else if (format === 'pdf') {
    generateCleanPDF(rows, checkedKeys);
  }
}

function clearAllFilters() {
  hideAdminOrders = false;
  onlyCheckedIn = false;
  onlyUnchecked = false;
  validEmailsOnly = false;
  hideTestOrders = false;
  hideVoidOrders = false;
  hideDuplicates = false;
  vipOnly = false;
  highValueOnly = false;
  activeOnly = false;
  hideImports = false;
  onlyImports = false;
  showRepeatBuyersOnly = false;
  showMultiTicketOrdersOnly = false;
  showIncompleteNamesOnly = false;
  showMissingPhoneOnly = false;
  showFreeTicketsOnly = false;
  tableGridlines = false;
  caseFormatTitle = false;
  mergeNameCols = false;
  rowDensity = 'medium';
  highlightRecent = false;
  currentSort = 'first_name';
  visibleCols = {
    first_name: true,
    last_name: true,
    email: true,
    phone: true,
    event_name: true,
    ticket_type: true,
    spent: true,
    activity: true,
    order_id: true,
    purchase_date: true,
    checked_in: true
  };
  searchInput.value = '';
  eventFilter.value = '';
  hiddenRowIds.clear();
}

function getRuleTokens(str) {
  const tokens = [];
  const regex = /"([^"]*)"|([^\s]+)/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    tokens.push({
      value: match[1] !== undefined ? match[1] : match[2],
      raw: match[0],
      start: match.index,
      end: regex.lastIndex,
      isQuoted: match[1] !== undefined
    });
  }
  const hasTrailingSpace = /\s$/.test(str);
  return { tokens, hasTrailingSpace };
}

function getTicketFieldValues(ticket, option) {
  const values = [];
  const add = (val) => {
    if (val !== undefined && val !== null) {
      const s = String(val).trim();
      if (s) values.push(s);
    }
  };

  if (option === 'email') {
    add(ticket.email);
  } else if (option === 'firstname') {
    add(ticket.first_name);
  } else if (option === 'lastname') {
    add(ticket.last_name);
  } else if (option === 'name') {
    const fn = (ticket.first_name || '').trim();
    const ln = (ticket.last_name || '').trim();
    const full = `${fn} ${ln}`.trim();
    add(full || 'No Name');
  } else if (option === 'phone') {
    add(ticket.phone);
  } else if (option === 'event') {
    if (ticket.is_merged && ticket.event_names) {
      ticket.event_names.forEach(add);
    } else {
      add(ticket.event_name);
    }
  } else if (option === 'ticket') {
    if (ticket.is_merged && ticket.ticket_types) {
      ticket.ticket_types.forEach(add);
    } else {
      add(ticket.ticket_type);
    }
  } else if (option === 'order') {
    if (ticket.is_merged && ticket.order_ids) {
      ticket.order_ids.forEach(add);
    } else {
      add(ticket.order_id);
    }
  }
  return values;
}

function applyHideRule(option, values) {
  if (!option || values.length === 0) return;
  
  const valuesLower = values.map(v => v.toLowerCase().trim());
  let count = 0;
  
  tickets.forEach(ticket => {
    const ticketValues = getTicketFieldValues(ticket, option);
    const matches = ticketValues.some(tv => valuesLower.includes(tv.toLowerCase().trim()));
    if (matches) {
      if (!hiddenRowIds.has(ticket.ticket_id)) {
        hiddenRowIds.add(ticket.ticket_id);
        count++;
      }
    }
  });
  
  if (count > 0) {
    saveSettings();
    applyFilters();
    renderTable();
    showToast(`Hid ${count} rows matching rule: ${option} = ${values.join(', ')}`);
  } else {
    showToast(`No matching rows found for rule: ${option} = ${values.join(', ')}`, 'info');
  }
}

function isHideCommand(cmd) {
  if (!cmd) return false;
  const id = cmd.id || '';
  const label = cmd.label || '';
  return id.startsWith('hide:') || id.startsWith('toggle:hide_') || id === 'toggle:admin' || id === 'toggle:test' || id === 'toggle:void' || label.toLowerCase().startsWith('hide');
}

function getVisibleCommands() {
  const query = searchInput.value;
  if (!query.startsWith('/')) {
    return [];
  }
  const queryLower = query.toLowerCase();

  if (queryLower.startsWith('/toggle column ')) {
    const subQuery = queryLower.slice(15).trim();
    const cols = Object.keys(visibleCols);
    const matches = cols.filter(col => col.toLowerCase().includes(subQuery) || col.replace('_', ' ').toLowerCase().includes(subQuery));
    return matches.map(col => {
      const isHidden = !visibleCols[col];
      return {
        id: `togglecol:${col}`,
        label: col.replace('_', ' ').toUpperCase(),
        desc: `${isHidden ? 'Show' : 'Hide'} column "${col}"`,
        type: 'action',
        getActive: () => false,
        action: () => {
          visibleCols[col] = !visibleCols[col];
          saveSettings();
          renderTable();
          searchInput.value = '';
          applyFilters();
          renderCommandMenu();
          showToast(`Toggled visibility of column: ${col}`);
        }
      };
    });
  }

  if (queryLower.startsWith('/set density ')) {
    const subQuery = queryLower.slice(13).trim();
    const densities = ['high', 'medium', 'low'];
    const matches = densities.filter(d => d.includes(subQuery));
    return matches.map(d => ({
      id: `setdensity:${d}`,
      label: d.toUpperCase(),
      desc: `Set row spacing to ${d}`,
      type: 'action',
      getActive: () => rowDensity === d,
      action: () => {
        rowDensity = d;
        updateDensityStyles();
        saveSettings();
        renderTable();
        searchInput.value = '';
        applyFilters();
        renderCommandMenu();
        showToast(`Row density set to: ${d}`);
      }
    }));
  }

  if (queryLower.startsWith('/show domain ') || queryLower.startsWith('/hide domain ')) {
    const isShow = queryLower.startsWith('/show domain ');
    const prefixLen = isShow ? 13 : 13;
    const subQuery = queryLower.slice(prefixLen).trim();
    const domains = new Set();
    tickets.forEach(t => {
      if (t.email && t.email.includes('@')) {
        const dom = t.email.split('@')[1].toLowerCase().trim();
        if (dom) domains.add(dom);
      }
    });
    const sortedDoms = Array.from(domains).sort();
    const matches = sortedDoms.filter(dom => dom.includes(subQuery));
    return matches.map(dom => ({
      id: `domain:${dom}`,
      label: dom,
      desc: `${isShow ? 'Show' : 'Hide'} only tickets from @${dom}`,
      type: 'action',
      getActive: () => false,
      action: () => {
        searchInput.value = isShow ? `/show domain ${dom}` : `/hide domain ${dom}`;
        searchInput.focus();
        applyFilters();
        renderCommandMenu();
      }
    }));
  }

  if (queryLower.startsWith('/hide by rule ')) {
    const rest = query.slice(14);
    const { tokens, hasTrailingSpace } = getRuleTokens(rest);
    const ruleOptions = ['email', 'firstname', 'lastname', 'name', 'event', 'ticket', 'phone', 'order'];
    
    if (tokens.length === 0 || (tokens.length === 1 && !hasTrailingSpace)) {
      const typedOpt = tokens.length === 1 ? tokens[0].value.toLowerCase() : '';
      const matchingOpts = ruleOptions.filter(opt => opt.includes(typedOpt));
      
      return matchingOpts.map(opt => ({
        id: `ruleopt:${opt}`,
        label: opt,
        desc: `Select rule option: ${opt}`,
        type: 'rule-option',
        getActive: () => false,
        action: () => {
          searchInput.value = `/hide by rule ${opt} `;
          searchInput.focus();
          applyFilters();
          renderCommandMenu();
        }
      }));
    }
    
    const selectedOpt = tokens[0].value.toLowerCase();
    if (ruleOptions.includes(selectedOpt)) {
      let completedValues = [];
      let partialValue = '';
      if (hasTrailingSpace) {
        completedValues = tokens.slice(1).map(tok => tok.value);
        partialValue = '';
      } else {
        completedValues = tokens.slice(1, -1).map(tok => tok.value);
        partialValue = tokens[tokens.length - 1].value;
      }
      
      const uniqueValuesSet = new Set();
      filteredTickets.forEach(ticket => {
        const vals = getTicketFieldValues(ticket, selectedOpt);
        vals.forEach(v => {
          if (v) uniqueValuesSet.add(v);
        });
      });
      
      const completedLower = completedValues.map(cv => cv.toLowerCase().trim());
      const filteredSuggs = Array.from(uniqueValuesSet)
        .filter(v => {
          const lower = v.toLowerCase().trim();
          if (completedLower.includes(lower)) return false;
          return lower.includes(partialValue.toLowerCase());
        })
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 40);
        
      const results = [];
      const allValuesToApply = tokens.slice(1).map(tok => tok.value).filter(v => v.trim() !== '');
      if (allValuesToApply.length > 0) {
        results.push({
          id: `ruleapply:${selectedOpt}`,
          label: `✓ Apply Rule: ${selectedOpt} = ${allValuesToApply.map(v => v.includes(' ') ? `"${v}"` : v).join(', ')}`,
          desc: `Hide all matching rows`,
          type: 'rule-apply',
          getActive: () => false,
          action: () => {
            applyHideRule(selectedOpt, allValuesToApply);
            searchInput.value = '';
            applyFilters();
            renderCommandMenu();
          }
        });
      }
      
      const suggCommands = filteredSuggs.map(val => ({
        id: `ruleval:${selectedOpt}:${val}`,
        label: val,
        desc: `Add value to rule`,
        type: 'rule-value',
        getActive: () => false,
        action: () => {
          const formattedVal = val.includes(' ') ? `"${val}"` : val;
          let newValue = '';
          if (hasTrailingSpace) {
            newValue = query.trimEnd() + ' ' + formattedVal + ' ';
          } else {
            const lastToken = tokens[tokens.length - 1];
            const before = query.slice(0, 14 + lastToken.start);
            newValue = before + formattedVal + ' ';
          }
          searchInput.value = newValue;
          searchInput.focus();
          applyFilters();
          renderCommandMenu();
        }
      }));
      
      return [...results, ...suggCommands];
    }
  }

  if (queryLower.startsWith('/hide row ')) {
    const subQuery = queryLower.slice(10).trim();
    const matches = [];
    const seenNames = new Set();
    
    for (const t of filteredTickets) {
      const firstName = (t.first_name || '').toLowerCase();
      const lastName = (t.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim() || 'No Name';
      const email = (t.email || '').toLowerCase();
      const phone = (t.phone || '').toLowerCase();
      
      let orderIdMatch = false;
      if (t.is_merged && t.order_ids) {
        orderIdMatch = t.order_ids.some(id => (id || '').toLowerCase().includes(subQuery));
      } else {
        orderIdMatch = (t.order_id || '').toLowerCase().includes(subQuery);
      }
      
      if (!subQuery || fullName.includes(subQuery) || firstName.includes(subQuery) || lastName.includes(subQuery) || email.includes(subQuery) || phone.includes(subQuery) || orderIdMatch) {
        const displayName = `${fullName} (${t.email || t.phone || t.order_id})`;
        if (seenNames.has(displayName)) continue;
        seenNames.add(displayName);
        
        matches.push(t);
        if (matches.length >= 40) break;
      }
    }
    
    return matches.map(t => {
      const name = `${t.first_name} ${t.last_name}`.trim() || 'No Name';
      return {
        id: `hiderow:${t.ticket_id}`,
        label: name,
        desc: `${t.ticket_type} • ${t.email || t.phone || t.order_id}`,
        type: 'row-entry',
        getActive: () => false,
        action: () => {
          if (t.is_merged && t.ticket_ids) {
            t.ticket_ids.forEach(id => hiddenRowIds.add(id));
          } else {
            hiddenRowIds.add(t.ticket_id);
          }
        }
      };
    });
  }

  const filterQuery = query.slice(1).toLowerCase().trim();

  const filtered = COMMAND_ITEMS.filter(cmd => {
    return (
      cmd.label.toLowerCase().includes(filterQuery) ||
      (cmd.desc && cmd.desc.toLowerCase().includes(filterQuery)) ||
      cmd.id.toLowerCase().includes(filterQuery) ||
      (cmd.aliases && cmd.aliases.some(alias => alias.includes(filterQuery)))
    );
  });

  const activeHideCommands = [];
  const activeOtherCommands = [];
  const inactiveCommands = [];

  filtered.forEach(cmd => {
    const isActive = cmd.getActive ? cmd.getActive() : false;
    if (isActive) {
      if (isHideCommand(cmd)) {
        activeHideCommands.push(cmd);
      } else {
        activeOtherCommands.push(cmd);
      }
    } else {
      inactiveCommands.push(cmd);
    }
  });

  return [...activeHideCommands, ...activeOtherCommands, ...inactiveCommands];
}

function renderCommandMenu() {
  const visible = getVisibleCommands();
  if (visible.length === 0) {
    commandMenu.classList.add('hidden');
    isMenuOpen = false;
    return;
  }

  commandMenu.classList.remove('hidden');
  isMenuOpen = true;

  if (focusedCommandIndex >= visible.length) {
    focusedCommandIndex = Math.max(0, visible.length - 1);
  }

  const query = searchInput.value;
  const isHideRowMode = query.toLowerCase().startsWith('/hide row ');
  const isHideByRuleMode = query.toLowerCase().startsWith('/hide by rule ');

  let headerHtml = '';
  if (isHideRowMode) {
    headerHtml = `
      <div class="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-brandBorder/40 mb-1.5 select-none flex flex-col gap-0.5">
        <span class="text-zinc-400 font-bold">Hide Row</span>
        <span class="text-[9px] font-normal lowercase tracking-normal">Enter the name, email, or order ID of the row to hide:</span>
      </div>
    `;
  } else if (isHideByRuleMode) {
    const rest = query.slice(14);
    const { tokens, hasTrailingSpace } = getRuleTokens(rest);
    let subtitle = '';
    if (tokens.length === 0 || (tokens.length === 1 && !hasTrailingSpace)) {
      subtitle = 'Select a rule option (email, firstname, lastname, name, event, ticket, phone, order):';
    } else {
      const opt = tokens[0].value;
      const vals = tokens.slice(1).map(t => t.value);
      subtitle = `Option: <span class="text-white font-mono font-bold">${opt}</span> | Entered: <span class="text-emerald-400 font-mono font-bold">${vals.length > 0 ? vals.map(v => `"${v}"`).join(', ') : 'none'}</span>`;
    }
    headerHtml = `
      <div class="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-brandBorder/40 mb-1.5 select-none flex flex-col gap-0.5">
        <span class="text-zinc-400 font-bold">Hide by Rule</span>
        <span class="text-[9px] font-normal lowercase tracking-normal">${subtitle}</span>
      </div>
    `;
  }

  commandList.innerHTML = headerHtml + visible.map((cmd, idx) => {
    const isActive = cmd.getActive ? cmd.getActive() : false;
    const isFocused = idx === focusedCommandIndex;

    let itemClass = 'px-3 py-1.5 rounded flex items-center justify-between transition-all select-none cursor-pointer';
    
    if (isFocused) {
      itemClass += ' bg-zinc-800 text-zinc-100';
    } else {
      itemClass += ' text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-300';
    }

    if (isActive) {
      itemClass += ' border border-white bg-zinc-900 text-white font-medium';
    } else {
      itemClass += ' border border-transparent';
    }

    let badge = '';
    if (isActive) {
      badge = '<span class="px-1.5 py-0.2 text-[8px] bg-white text-zinc-950 font-mono font-bold uppercase rounded scale-90">Active</span>';
    } else {
      let typeLabel = cmd.type;
      if (cmd.type === 'rule-option') typeLabel = 'Option';
      if (cmd.type === 'rule-value') typeLabel = 'Value';
      if (cmd.type === 'rule-apply') typeLabel = 'Action';
      if (cmd.type === 'row-entry') typeLabel = 'Row';
      badge = `<span class="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">${typeLabel}</span>`;
    }

    const descText = cmd.desc 
      ? `<span class="text-[10px] text-zinc-500 ml-2 font-normal">${cmd.desc}</span>` 
      : '';

    return `
      <div class="${itemClass}" data-command-id="${cmd.id}">
        <div class="flex items-center gap-1.5">
          <span class="font-mono font-medium">${cmd.label}</span>
          ${descText}
        </div>
        ${badge}
      </div>
    `;
  }).join('');

  const items = commandList.querySelectorAll('[data-command-id]');
  items.forEach((item, idx) => {
    item.addEventListener('click', () => {
      selectCommand(visible[idx]);
    });
  });

  const activeItem = items[focusedCommandIndex];
  if (activeItem) {
    activeItem.scrollIntoView({ block: 'nearest' });
  }
}

function selectCommand(cmd) {
  if (cmd.type === 'modifier') {
    searchInput.value = cmd.value;
    commandMenu.classList.add('hidden');
    isMenuOpen = false;
    searchInput.focus();
    applyFilters();
  } else if (cmd.type === 'rule-option' || cmd.type === 'rule-value') {
    cmd.action();
  } else if (cmd.type === 'rule-apply') {
    cmd.action();
  } else if (cmd.type === 'toggle' || cmd.type === 'sort' || cmd.type === 'action' || cmd.type === 'row-entry') {
    cmd.action();
    
    if (searchInput.value.startsWith('/')) {
      searchInput.value = '';
    }

    applyFilters();
    renderCommandMenu();
    showToast(cmd.type === 'row-entry' ? `Hid row: ${cmd.label}` : `Executed: ${cmd.label}`);
  }
}

function showCustomRemoveImportsModal() {
  const modal = document.getElementById('remove-imports-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function initEvents() {
  bccExportBtn.addEventListener('click', () => {
    executeExport('clipboard');
  });

  exportDropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    exportSettingsMenu.classList.add('hidden');
    exportDropdownMenu.classList.toggle('hidden');
  });

  exportSettingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdownMenu.classList.add('hidden');
    exportSettingsMenu.classList.toggle('hidden');
  });

  const formatButtons = exportDropdownMenu.querySelectorAll('[data-format]');
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format');
      executeExport(format);
      exportDropdownMenu.classList.add('hidden');
    });
  });

  const colIds = ['email', 'first_name', 'last_name', 'phone', 'event_name', 'ticket_type', 'spent', 'activity', 'order_id', 'purchase_date', 'checked_in'];
  colIds.forEach(col => {
    const cb = document.getElementById(`col-export-${col}`);
    if (cb) {
      cb.checked = exportCols[col];
      cb.addEventListener('change', () => {
        exportCols[col] = cb.checked;
        saveSettings();
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (!exportDropdownMenu.contains(e.target) && e.target !== exportDropdownToggle) {
      exportDropdownMenu.classList.add('hidden');
    }
    if (!exportSettingsMenu.contains(e.target) && e.target !== exportSettingsToggle) {
      exportSettingsMenu.classList.add('hidden');
    }
    if (!searchInput.contains(e.target) && !commandMenu.contains(e.target)) {
      commandMenu.classList.add('hidden');
      isMenuOpen = false;
    }
  });

  syncBtn.addEventListener('click', triggerSync);
  searchInput.addEventListener('input', () => {
    applyFilters();
    renderCommandMenu();
  });
  
  searchInput.addEventListener('focus', () => {
    focusedCommandIndex = 0;
    if (searchInput.value.startsWith('/')) {
      renderCommandMenu();
    } else {
      commandMenu.classList.add('hidden');
      isMenuOpen = false;
    }
  });

  eventFilter.addEventListener('change', applyFilters);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const aboutModal = document.getElementById('about-modal');
      if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
        return;
      }
      const removeImportsModal = document.getElementById('remove-imports-modal');
      if (removeImportsModal && !removeImportsModal.classList.contains('hidden')) {
        removeImportsModal.classList.add('hidden');
        return;
      }
      const importModal = document.getElementById('import-modal');
      if (importModal && !importModal.classList.contains('hidden')) {
        importModal.classList.add('hidden');
        return;
      }
      if (isMenuOpen) {
        commandMenu.classList.add('hidden');
        isMenuOpen = false;
        searchInput.blur();
      } else if (document.activeElement === searchInput) {
        searchInput.value = '';
        applyFilters();
        searchInput.blur();
      }
      return;
    }

    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.value = '/';
      renderCommandMenu();
      showToast('Commands loaded. Use ↑↓ keys to select.', 'info');
      return;
    }

    if (isMenuOpen) {
      const visible = getVisibleCommands();
      if (visible.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusedCommandIndex = (focusedCommandIndex + 1) % visible.length;
          renderCommandMenu();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          focusedCommandIndex = (focusedCommandIndex - 1 + visible.length) % visible.length;
          renderCommandMenu();
        } else if (e.key === 'Enter') {
          if (visible[focusedCommandIndex]) {
            e.preventDefault();
            selectCommand(visible[focusedCommandIndex]);
          }
        }
      }
    }
  });

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      themeToggle.textContent = isLight ? 'Dark Mode' : 'Light Mode';
      saveSettings();
    });
  }

  const aboutBtn = document.getElementById('about-btn');
  const aboutModal = document.getElementById('about-modal');
  const closeAboutBtn = document.getElementById('close-about-btn');
  if (aboutBtn && aboutModal && closeAboutBtn) {
    aboutBtn.addEventListener('click', () => {
      aboutModal.classList.remove('hidden');
    });
    closeAboutBtn.addEventListener('click', () => {
      aboutModal.classList.add('hidden');
    });
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
      }
    });
  }

  // Remove Imports Modal Logic
  const removeImportsModal = document.getElementById('remove-imports-modal');
  const cancelRemoveImportsBtn = document.getElementById('cancel-remove-imports-btn');
  const submitRemoveImportsBtn = document.getElementById('submit-remove-imports-btn');

  if (removeImportsModal && cancelRemoveImportsBtn && submitRemoveImportsBtn) {
    cancelRemoveImportsBtn.addEventListener('click', () => {
      removeImportsModal.classList.add('hidden');
    });

    submitRemoveImportsBtn.addEventListener('click', async () => {
      removeImportsModal.classList.add('hidden');
      try {
        showToast('Removing imported tickets...');
        const localKey = localStorage.getItem('ticket_tailor_api_key');
        if (localKey) {
          localStorage.removeItem('ticket_dash_local_imports');
          showToast('Permanently removed all locally imported tickets.');
          await fetchTickets();
          return;
        }

        const response = await fetch('/api/remove-imports', {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error(`Failed to remove imports: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          showToast('Permanently removed all imported tickets.');
          await fetchTickets();
        } else {
          throw new Error(data.error || 'Failed to remove imports.');
        }
      } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
      }
    });

    removeImportsModal.addEventListener('click', (e) => {
      if (e.target === removeImportsModal) {
        removeImportsModal.classList.add('hidden');
      }
    });
  }

  // API Key Configuration Button
  const apiKeyConfigBtn = document.getElementById('api-key-config-btn');
  if (apiKeyConfigBtn) {
    apiKeyConfigBtn.addEventListener('click', () => {
      showApiKeyModal(true);
    });
  }

  // Import Modal & Drag-Drop Logic
  const importBtn = document.getElementById('import-btn');
  const importModal = document.getElementById('import-modal');
  const cancelImportBtn = document.getElementById('cancel-import-btn');
  const submitImportBtn = document.getElementById('submit-import-btn');
  const dropZone = document.getElementById('csv-drop-zone');
  const fileInput = document.getElementById('csv-file-input');
  const fileNameDisplay = document.getElementById('csv-file-name');
  const importEventNameInput = document.getElementById('import-event-name');
  const defaultPriceInput = document.getElementById('import-default-price');
  let selectedFile = null;

  if (importBtn && importModal && cancelImportBtn) {
    importBtn.addEventListener('click', () => {
      importModal.classList.remove('hidden');
    });

    cancelImportBtn.addEventListener('click', () => {
      importModal.classList.add('hidden');
    });

    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) {
        importModal.classList.add('hidden');
      }
    });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-brandBorderActive', 'bg-brandHover/20');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-brandBorderActive', 'bg-brandHover/20');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brandBorderActive', 'bg-brandHover/20');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (!file.name.endsWith('.csv')) {
      showToast('Please select a valid .CSV file.', 'error');
      return;
    }
    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    fileNameDisplay.classList.add('text-zinc-200');

    // Prepopulate Event Name by cleaning the doorlist filename
    const baseName = file.name.replace(/\.[^/.]+$/, "")
      .replace(/export_\d+_doorlist_/i, '')
      .replace(/[_-]/g, ' ')
      .trim();
    const formattedName = baseName.replace(/\b\w/g, c => c.toUpperCase());
    importEventNameInput.value = formattedName;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, '').trim());
  }

  function parseCSVText(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  }

  function mapCSVRowsToTickets(csvRows, eventName, defaultPrice) {
    return csvRows.map((row, index) => {
      const findVal = (possibleKeys) => {
        for (const k of Object.keys(row)) {
          if (possibleKeys.includes(k.toLowerCase().trim())) {
            return row[k];
          }
        }
        return '';
      };

      const nameStr = findVal(['name', 'buyer name', 'buyer_name']);
      const emailVal = findVal(['email address', 'email_address', 'email']);
      const phoneVal = findVal(['mobile phone number', 'mobile_phone_number', 'phone', 'phone number', 'mobile']);
      const ticketType = findVal(['ticket type', 'ticket_type', 'type']);
      const orderId = findVal(['order id', 'order_id', 'order']);
      const ticketCode = findVal(['ticket code', 'ticket_code', 'code', 'ticket id', 'ticket_id']) || `imp_${Date.now()}_${index}`;
      const statusVal = findVal(['status']);
      const checkedInStr = findVal(['checked-in', 'checked_in', 'checked in', 'arrived']);

      const isEmailValid = emailVal ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim()) : false;
      const isCheckedIn = ['yes', 'true', '1', 'checked', 'y'].includes(checkedInStr.toLowerCase().trim());
      
      let firstName = '';
      let lastName = '';
      if (nameStr) {
        const parts = nameStr.trim().split(/\s+/);
        if (parts.length === 1) {
          firstName = parts[0];
        } else {
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
        }
      }

      return {
        ticket_id: ticketCode,
        first_name: firstName,
        last_name: lastName,
        email: emailVal,
        is_email_valid: isEmailValid,
        phone: phoneVal,
        event_name: eventName,
        ticket_type: ticketType || 'Standard',
        price: parseFloat(defaultPrice) || 0,
        order_id: orderId,
        purchase_date: Math.floor(Date.now() / 1000),
        checked_in: isCheckedIn,
        is_imported: true,
        status: statusVal
      };
    });
  }

  if (submitImportBtn) {
    submitImportBtn.addEventListener('click', async () => {
      if (!selectedFile) {
        showToast('Please upload a CSV file first.', 'error');
        return;
      }
      const eventName = importEventNameInput.value.trim();
      if (!eventName) {
        showToast('Please enter an event name.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const parsedRows = parseCSVText(text);
          if (parsedRows.length === 0) {
            showToast('The CSV file is empty or invalid.', 'error');
            return;
          }

          const defaultPrice = parseFloat(defaultPriceInput.value) || 0;
          const mappedTickets = mapCSVRowsToTickets(parsedRows, eventName, defaultPrice);

          const localKey = localStorage.getItem('ticket_tailor_api_key');
          if (localKey) {
            let existingImports = [];
            const existingImportsJson = localStorage.getItem('ticket_dash_local_imports');
            if (existingImportsJson) {
              try {
                existingImports = JSON.parse(existingImportsJson);
              } catch (e) {
                existingImports = [];
              }
            }
            const newTickets = mappedTickets.filter(nt => !existingImports.some(et => et.ticket_id === nt.ticket_id));
            existingImports = existingImports.concat(newTickets);
            localStorage.setItem('ticket_dash_local_imports', JSON.stringify(existingImports));

            showToast(`Successfully imported ${mappedTickets.length} tickets locally.`);
            
            importModal.classList.add('hidden');
            selectedFile = null;
            fileNameDisplay.textContent = 'Click or drag & drop doorlist CSV here';
            fileNameDisplay.classList.remove('text-zinc-200');
            importEventNameInput.value = '';
            defaultPriceInput.value = '0';
            
            fetchTickets();
            return;
          }

          showToast('Uploading imported tickets...');
          
          const response = await fetch('/api/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_name: eventName,
              tickets: mappedTickets
            })
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const resData = await response.json();
          if (resData.success) {
            showToast(`Successfully imported ${resData.count} tickets.`);
            
            importModal.classList.add('hidden');
            selectedFile = null;
            fileNameDisplay.textContent = 'Click or drag & drop doorlist CSV here';
            fileNameDisplay.classList.remove('text-zinc-200');
            importEventNameInput.value = '';
            defaultPriceInput.value = '0';
            
            fetchTickets();
          } else {
            throw new Error(resData.error || 'Failed to import.');
          }

        } catch (err) {
          console.error(err);
          showToast(`Import failed: ${err.message}`, 'error');
        }
      };
      
      reader.readAsText(selectedFile);
    });
  }
}


function saveSettings() {
  const settings = {
    hideAdminOrders,
    onlyCheckedIn,
    onlyUnchecked,
    validEmailsOnly,
    hideTestOrders,
    hideVoidOrders,
    hideDuplicates,
    vipOnly,
    highValueOnly,
    activeOnly,
    hideImports,
    onlyImports,
    compactRows,
    showRepeatBuyersOnly,
    showMultiTicketOrdersOnly,
    showIncompleteNamesOnly,
    showMissingPhoneOnly,
    showFreeTicketsOnly,
    tableGridlines,
    caseFormatTitle,
    mergeNameCols,
    rowDensity,
    highlightRecent,
    currentSort,
    visibleCols,
    exportCols,
    selectedEvent: eventFilter ? eventFilter.value : '',
    theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
    hiddenRowIds: Array.from(hiddenRowIds)
  };
  localStorage.setItem('dashboardSettings', JSON.stringify(settings));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('dashboardSettings');
    if (!raw) return;
    const settings = JSON.parse(raw);
    
    if (settings.hideAdminOrders !== undefined) {
      hideAdminOrders = settings.hideAdminOrders;
    } else if (settings.ignoreAdminOrders !== undefined) {
      hideAdminOrders = settings.ignoreAdminOrders;
    }
    if (settings.onlyCheckedIn !== undefined) onlyCheckedIn = settings.onlyCheckedIn;
    if (settings.onlyUnchecked !== undefined) onlyUnchecked = settings.onlyUnchecked;
    if (settings.validEmailsOnly !== undefined) validEmailsOnly = settings.validEmailsOnly;
    if (settings.hideTestOrders !== undefined) {
      hideTestOrders = settings.hideTestOrders;
    } else if (settings.excludeTestOrders !== undefined) {
      hideTestOrders = settings.excludeTestOrders;
    }
    if (settings.hideVoidOrders !== undefined) {
      hideVoidOrders = settings.hideVoidOrders;
    } else if (settings.excludeVoidOrders !== undefined) {
      hideVoidOrders = settings.excludeVoidOrders;
    }
    if (settings.hideDuplicates !== undefined) {
      hideDuplicates = settings.hideDuplicates;
    } else if (settings.mergeDuplicates !== undefined) {
      hideDuplicates = settings.mergeDuplicates;
    }
    if (settings.vipOnly !== undefined) vipOnly = settings.vipOnly;
    if (settings.hiddenRowIds !== undefined) hiddenRowIds = new Set(settings.hiddenRowIds);
    if (settings.highValueOnly !== undefined) highValueOnly = settings.highValueOnly;
    if (settings.activeOnly !== undefined) activeOnly = settings.activeOnly;
    if (settings.hideImports !== undefined) {
      hideImports = settings.hideImports;
    } else if (settings.excludeImports !== undefined) {
      hideImports = settings.excludeImports;
    }
    if (settings.onlyImports !== undefined) onlyImports = settings.onlyImports;
    if (settings.compactRows !== undefined) compactRows = settings.compactRows;
    if (settings.showRepeatBuyersOnly !== undefined) showRepeatBuyersOnly = settings.showRepeatBuyersOnly;
    if (settings.showMultiTicketOrdersOnly !== undefined) showMultiTicketOrdersOnly = settings.showMultiTicketOrdersOnly;
    if (settings.showIncompleteNamesOnly !== undefined) showIncompleteNamesOnly = settings.showIncompleteNamesOnly;
    if (settings.showMissingPhoneOnly !== undefined) showMissingPhoneOnly = settings.showMissingPhoneOnly;
    if (settings.showFreeTicketsOnly !== undefined) showFreeTicketsOnly = settings.showFreeTicketsOnly;
    if (settings.tableGridlines !== undefined) tableGridlines = settings.tableGridlines;
    if (settings.caseFormatTitle !== undefined) caseFormatTitle = settings.caseFormatTitle;
    if (settings.mergeNameCols !== undefined) mergeNameCols = settings.mergeNameCols;
    if (settings.rowDensity !== undefined) rowDensity = settings.rowDensity;
    if (settings.highlightRecent !== undefined) highlightRecent = settings.highlightRecent;
    
    if (settings.currentSort !== undefined) currentSort = settings.currentSort;
    
    if (settings.visibleCols !== undefined) {
      Object.assign(visibleCols, settings.visibleCols);
    }
    if (settings.exportCols !== undefined) {
      Object.assign(exportCols, settings.exportCols);
    }
    
    if (settings.selectedEvent !== undefined && eventFilter) {
      eventFilter.value = settings.selectedEvent;
      eventFilter.dataset.pendingSelection = settings.selectedEvent;
    }
    
    if (settings.theme === 'light') {
      document.body.classList.add('light-theme');
      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) toggleBtn.textContent = 'Dark Mode';
    } else {
      document.body.classList.remove('light-theme');
      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) toggleBtn.textContent = 'Light Mode';
    }
  } catch (e) {
    console.error('Error loading settings from localStorage:', e);
  }
}

loadSettings();
initEvents();

// Open API key modal instantly on first visit of hosted version to prevent demo data flash
const isHosted = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
if (isHosted && !localStorage.getItem('ticket_tailor_api_key')) {
  showApiKeyModal(false);
}

fetchTickets().then(() => {
  triggerAutoSync();
});
