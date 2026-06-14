import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEMO_DATA = [
  {
    ticket_id: "t_1",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice.smith@example.com",
    is_email_valid: true,
    phone: "+1 (555) 019-2834",
    event_name: "Global AI Summit 2026",
    ticket_type: "VIP Pass",
    price: 150.00,
    order_id: "or_101",
    purchase_date: 1776268800,
    checked_in: true
  },
  {
    ticket_id: "t_2",
    first_name: "Bob",
    last_name: "Jones",
    email: "bob.jones@invalid-email",
    is_email_valid: false,
    phone: "",
    event_name: "Global AI Summit 2026",
    ticket_type: "General Admission",
    price: 50.00,
    order_id: "or_102",
    purchase_date: 1776355200,
    checked_in: false
  },
  {
    ticket_id: "t_3",
    first_name: "Charlie",
    last_name: "Brown",
    email: "charlie@peanuts.org",
    is_email_valid: true,
    phone: "+1 (555) 014-9988",
    event_name: "NextJS Workshop",
    ticket_type: "Early Bird",
    price: 75.00,
    order_id: "or_103",
    purchase_date: 1776441600,
    checked_in: true
  },
  {
    ticket_id: "t_4",
    first_name: "Diana",
    last_name: "Prince",
    email: "diana@justice.league",
    is_email_valid: true,
    phone: "+1 (555) 018-7711",
    event_name: "Global AI Summit 2026",
    ticket_type: "VIP Pass",
    price: 150.00,
    order_id: "or_104",
    purchase_date: 1776182400,
    checked_in: false
  },
  {
    ticket_id: "t_5",
    first_name: "Evan",
    last_name: "Wright",
    email: "evan.wright@company",
    is_email_valid: false,
    phone: "+44 7700 900077",
    event_name: "NextJS Workshop",
    ticket_type: "General Admission",
    price: 50.00,
    order_id: "or_105",
    purchase_date: 1776528000,
    checked_in: true
  },
  {
    ticket_id: "t_6",
    first_name: "Fiona",
    last_name: "Gallagher",
    email: "fiona@gallagher.com",
    is_email_valid: true,
    phone: "+1 (555) 015-3344",
    event_name: "Global AI Summit 2026",
    ticket_type: "General Admission",
    price: 50.00,
    order_id: "or_106",
    purchase_date: 1776614400,
    checked_in: true
  },
  {
    ticket_id: "t_7",
    first_name: "George",
    last_name: "Hotz",
    email: "george@comma.ai",
    is_email_valid: true,
    phone: "",
    event_name: "Self-Driving Bootcamp",
    ticket_type: "Developer Pass",
    price: 120.00,
    order_id: "or_107",
    purchase_date: 1776700800,
    checked_in: false
  }
];

// In-memory cache replacing cache.json
let inMemoryCache = {
  last_synced: null,
  tickets: [],
  is_demo: true,
  api_key_configured: false,
  last_error: null
};

function parseName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

function isApiKeyConfigured() {
  const key = process.env.TICKET_TAILOR_API_KEY;
  return key && key.trim() !== '' && key !== 'tt_api_key_placeholder';
}

async function fetchAllPages(endpoint, apiKey) {
  let allItems = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    let url = `https://api.tickettailor.com/v1/${endpoint}?limit=100`;
    if (startingAfter) {
      url += `&starting_after=${startingAfter}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(`Forbidden (403): Your Ticket Tailor API key does not have permission to read ${endpoint}. Ensure 'Orders' and 'Issued Tickets' are checked in dashboard settings.`);
      }
      const errText = await response.text();
      throw new Error(`Ticket Tailor API Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const data = json.data || [];
    allItems = allItems.concat(data);

    if (data.length < 100) {
      hasMore = false;
    } else {
      startingAfter = data[data.length - 1].id;
    }
  }

  return allItems;
}

async function performInMemorySync() {
  const apiConfigured = isApiKeyConfigured();
  
  if (!apiConfigured) {
    inMemoryCache = {
      last_synced: new Date().toISOString(),
      tickets: DEMO_DATA,
      is_demo: true,
      api_key_configured: false,
      last_error: null
    };
    return inMemoryCache;
  }

  const apiKey = process.env.TICKET_TAILOR_API_KEY.trim();

  try {
    const events = await fetchAllPages('events', apiKey);
    const eventMap = {};
    events.forEach(event => {
      eventMap[event.id] = event.name;
    });

    const orders = await fetchAllPages('orders', apiKey);
    const orderMap = {};
    orders.forEach(order => {
      orderMap[order.id] = order;
    });

    const issuedTickets = await fetchAllPages('issued_tickets', apiKey);

    const mergedTickets = issuedTickets.map(ticket => {
      const order = orderMap[ticket.order_id];
      
      let buyerNameStr = '';
      let emailVal = ticket.email || '';
      let phoneVal = '';
      let purchaseDate = ticket.created_at;
      
      if (order && order.buyer_details) {
        buyerNameStr = order.buyer_details.name || '';
        if (!buyerNameStr) {
          buyerNameStr = `${order.buyer_details.first_name || ''} ${order.buyer_details.last_name || ''}`.trim();
        }
        emailVal = order.buyer_details.email || emailVal;
        phoneVal = order.buyer_details.phone || '';
        purchaseDate = order.created_at;
      }

      if (!buyerNameStr) {
        buyerNameStr = ticket.full_name || '';
        if (!buyerNameStr) {
          buyerNameStr = `${ticket.first_name || ''} ${ticket.last_name || ''}`.trim();
        }
      }

      const parsed = parseName(buyerNameStr);
      const isEmailValid = isValidEmail(emailVal);

      // Extract ticket price
      const multiplier = ticket.listed_currency?.base_multiplier || 100;
      const priceVal = (ticket.listed_price !== undefined && ticket.listed_price !== null)
        ? ticket.listed_price / multiplier
        : 0;

      return {
        ticket_id: ticket.id,
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        email: emailVal,
        is_email_valid: isEmailValid,
        phone: phoneVal,
        event_name: eventMap[ticket.event_id] || 'Unknown Event',
        ticket_type: ticket.description || 'Standard',
        price: priceVal,
        order_id: ticket.order_id || '',
        purchase_date: purchaseDate,
        checked_in: ticket.checked_in === 'true' || ticket.checked_in === true
      };
    });

    inMemoryCache = {
      last_synced: new Date().toISOString(),
      tickets: mergedTickets,
      is_demo: false,
      api_key_configured: true,
      last_error: null
    };

    return inMemoryCache;

  } catch (error) {
    console.error('Sync failed:', error);
    
    // Retain existing tickets if available, but log the error message
    if (inMemoryCache.tickets && inMemoryCache.tickets.length > 0) {
      inMemoryCache.last_error = error.message;
      inMemoryCache.last_synced = new Date().toISOString();
    } else {
      inMemoryCache = {
        last_synced: new Date().toISOString(),
        tickets: DEMO_DATA,
        is_demo: true,
        api_key_configured: true,
        last_error: error.message
      };
    }
    return inMemoryCache;
  }
}

// Ensure imports directory exists
const importsDir = path.join(__dirname, 'imports');
if (!fs.existsSync(importsDir)) {
  fs.mkdirSync(importsDir, { recursive: true });
}

function loadImportedTickets() {
  try {
    const files = fs.readdirSync(importsDir);
    let allImported = [];
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(importsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const tickets = JSON.parse(content);
          if (Array.isArray(tickets)) {
            allImported = allImported.concat(tickets);
          }
        } catch (err) {
          console.error(`Failed to read/parse import file ${file}:`, err);
        }
      }
    });
    return allImported;
  } catch (err) {
    console.error('Failed to read imports directory:', err);
    return [];
  }
}

async function fetchTicketsWithKey(apiKey) {
  const events = await fetchAllPages('events', apiKey);
  const eventMap = {};
  events.forEach(event => {
    eventMap[event.id] = event.name;
  });

  const orders = await fetchAllPages('orders', apiKey);
  const orderMap = {};
  orders.forEach(order => {
    orderMap[order.id] = order;
  });

  const issuedTickets = await fetchAllPages('issued_tickets', apiKey);

  return issuedTickets.map(ticket => {
    const order = orderMap[ticket.order_id];
    let buyerNameStr = '';
    let emailVal = ticket.email || '';
    let phoneVal = '';
    let purchaseDate = ticket.created_at;
    
    if (order && order.buyer_details) {
      buyerNameStr = order.buyer_details.name || '';
      if (!buyerNameStr) {
        buyerNameStr = `${order.buyer_details.first_name || ''} ${order.buyer_details.last_name || ''}`.trim();
      }
      emailVal = order.buyer_details.email || emailVal;
      phoneVal = order.buyer_details.phone || '';
      purchaseDate = order.created_at;
    }

    if (!buyerNameStr) {
      buyerNameStr = ticket.full_name || '';
      if (!buyerNameStr) {
        buyerNameStr = `${ticket.first_name || ''} ${ticket.last_name || ''}`.trim();
      }
    }

    const parsed = parseName(buyerNameStr);
    const isEmailValid = isValidEmail(emailVal);
    const multiplier = ticket.listed_currency?.base_multiplier || 100;
    const priceVal = (ticket.listed_price !== undefined && ticket.listed_price !== null)
      ? ticket.listed_price / multiplier
      : 0;

    return {
      ticket_id: ticket.id,
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      email: emailVal,
      is_email_valid: isEmailValid,
      phone: phoneVal,
      event_name: eventMap[ticket.event_id] || 'Unknown Event',
      ticket_type: ticket.name,
      price: priceVal,
      order_id: ticket.order_id,
      purchase_date: purchaseDate,
      checked_in: ticket.status === 'checked_in'
    };
  });
}

app.get('/api/tickets', async (req, res) => {
  const clientApiKey = req.headers['x-api-key'];
  if (clientApiKey) {
    try {
      const data = await fetchTicketsWithKey(clientApiKey);
      return res.json({
        tickets: data,
        api_key_configured: true,
        is_demo: false,
        last_synced: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch tickets' });
    }
  }

  const apiConfigured = isApiKeyConfigured();
  const importedTickets = loadImportedTickets();
  const combinedTickets = [...inMemoryCache.tickets, ...importedTickets];
  res.json({
    ...inMemoryCache,
    tickets: combinedTickets,
    api_key_configured: apiConfigured
  });
});

app.post('/api/import', (req, res) => {
  const { event_name, tickets } = req.body;
  if (!event_name || !Array.isArray(tickets)) {
    return res.status(400).json({ success: false, error: 'Invalid import payload.' });
  }

  try {
    const filename = `${event_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    const filePath = path.join(importsDir, filename);
    
    // Write tickets to disk
    fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2), 'utf8');
    
    res.json({ success: true, count: tickets.length });
  } catch (err) {
    console.error('Failed to save imported CSV tickets:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save import.' });
  }
});

app.delete('/api/remove-imports', (req, res) => {
  try {
    const files = fs.readdirSync(importsDir).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      fs.unlinkSync(path.join(importsDir, file));
    });
    res.json({ success: true, removed: files.length });
  } catch (err) {
    console.error('Failed to remove imports:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to remove imports.' });
  }
});

app.all('/api/sync', async (req, res) => {
  const clientApiKey = req.headers['x-api-key'];
  if (clientApiKey) {
    try {
      const data = await fetchTicketsWithKey(clientApiKey);
      return res.json({
        success: true,
        message: 'Sync completed successfully from your browser key.',
        count: data.length,
        last_synced: new Date().toISOString(),
        is_demo: false,
        last_error: null
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Synchronization failed.',
        is_demo: false,
        last_synced: null
      });
    }
  }

  try {
    const data = await performInMemorySync();
    res.json({
      success: !data.last_error,
      message: data.last_error
        ? `Sync warning: ${data.last_error}`
        : (data.is_demo ? 'Demo sandbox data loaded.' : 'Sync completed successfully.'),
      count: data.tickets.length,
      last_synced: data.last_synced,
      is_demo: data.is_demo,
      last_error: data.last_error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during synchronization.',
      is_demo: inMemoryCache.is_demo,
      last_synced: inMemoryCache.last_synced
    });
  }
});

// Trigger background sync on startup if API Key is present
if (isApiKeyConfigured()) {
  console.log('Ticket Tailor API Key detected. Performing initial background sync...');
  performInMemorySync().then(() => {
    console.log('Initial background sync finished. In-memory cache populated.');
  }).catch(err => {
    console.error('Initial background sync failed:', err.message);
  });
} else {
  console.log('No Ticket Tailor API Key configured. Demo mode enabled.');
  inMemoryCache = {
    last_synced: new Date().toISOString(),
    tickets: DEMO_DATA,
    is_demo: true,
    api_key_configured: false,
    last_error: null
  };
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`Ticket Tailor Read-Only Dashboard Running Locally`);
    console.log(`Server Address: http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

export default app;
