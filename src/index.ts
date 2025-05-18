import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
// Import types from pg
import type { Pool as PgPool } from 'pg';

// Use require for the actual implementation to avoid TypeScript issues
const { Pool } = require('pg');

// Load environment variables
dotenv.config();

// Define types
type LinkPrecedence = 'primary' | 'secondary';

interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: LinkPrecedence;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ContactRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(cors());
app.use(express.json());

// Create database connection pool
let pool: PgPool; // Explicitly type pool with PgPool type
try {
  // Try to use DATABASE_URL if it exists (Render.com provides this)
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // SSL is required for Render.com PostgreSQL
      ssl: {
        rejectUnauthorized: false // Required for Render.com PostgreSQL
      }
    });
  } else {
    console.log('Using individual parameters for connection');
    // Otherwise use individual connection parameters
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'bitespeed',
    });
  }
  
  // Test connection
  pool.query('SELECT NOW()', (err: any, res: any) => {
    if (err) {
      console.error('Database connection error:', err);
    } else {
      console.log('Database connected successfully:', res.rows[0].now);
    }
  });
} catch (error) {
  console.error('Failed to initialize database pool:', error);
}

// Create a public directory for static files if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Serve static files from the public directory
app.use(express.static(publicDir));

// Directly use the HTML content for the root route
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bitespeed Identity Reconciliation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .container {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
        }
        input[type="text"], 
        input[type="email"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        button {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 12px 20px;
            font-size: 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #2980b9;
        }
        .response-area {
            margin-top: 30px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
        }
        .response-title {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-top: 0;
            margin-bottom: 15px;
            color: #555;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 0;
            font-family: monospace;
        }
        .loading {
            text-align: center;
            display: none;
            margin: 20px 0;
        }
        .loader {
            display: inline-block;
            width: 30px;
            height: 30px;
            border: 4px solid #f3f3f3;
            border-radius: 50%;
            border-top: 4px solid #3498db;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .message {
            padding: 10px;
            margin: 15px 0;
            border-radius: 4px;
        }
        .error {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ffcdd2;
        }
        .success {
            background-color: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }
        .hidden {
            display: none;
        }
        .note {
            font-size: 14px;
            color: #666;
            font-style: italic;
        }
    </style>
</head>
<body>
    <h1>Bitespeed Identity Reconciliation</h1>
    
    <div class="container">
        <h2>Contact Form</h2>
        
        <form id="contactForm">
            <div class="form-group">
                <label for="email">Email (optional):</label>
                <input type="email" id="email" name="email" placeholder="Enter email address">
            </div>
            
            <div class="form-group">
                <label for="phoneNumber">Phone Number (optional):</label>
                <input type="text" id="phoneNumber" name="phoneNumber" placeholder="Enter phone number">
            </div>
            
            <div class="form-group">
                <p class="note">Note: At least one of email or phone number must be provided.</p>
            </div>
            
            <button type="submit">Submit</button>
        </form>
        
        <div id="success" class="message success hidden"></div>
        <div id="error" class="message error hidden"></div>
        
        <div id="loading" class="loading">
            <div class="loader"></div>
            <p>Processing request...</p>
        </div>
        
        <div class="response-area">
            <h3 class="response-title">Request:</h3>
            <pre id="request">Submit the form to see the request</pre>
        </div>
        
        <div class="response-area">
            <h3 class="response-title">Response:</h3>
            <pre id="response">Submit the form to see the response</pre>
        </div>
    </div>
    
    <script>
        // Form submission
        const contactForm = document.getElementById('contactForm');
        const requestOutput = document.getElementById('request');
        const responseOutput = document.getElementById('response');
        const loadingIndicator = document.getElementById('loading');
        const errorOutput = document.getElementById('error');
        const successOutput = document.getElementById('success');
        
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            
            // Validate input
            if (!email && !phoneNumber) {
                errorOutput.textContent = 'Error: At least one of email or phone number must be provided.';
                errorOutput.classList.remove('hidden');
                return;
            }
            
            // Clear previous messages
            errorOutput.classList.add('hidden');
            successOutput.classList.add('hidden');
            
            // Prepare request body
            const requestBody = {};
            if (email) requestBody.email = email;
            if (phoneNumber) requestBody.phoneNumber = phoneNumber;
            
            // Display request
            requestOutput.textContent = JSON.stringify(requestBody, null, 2);
            
            // Show loading indicator
            loadingIndicator.style.display = 'block';
            
            try {
                // Make the API call
                const response = await fetch('/identify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (!response.ok) {
                    throw new Error(\`Server returned status: \${response.status}\`);
                }
                
                const data = await response.json();
                
                // Display response
                responseOutput.textContent = JSON.stringify(data, null, 2);
                
                // Show success message
                successOutput.textContent = 'Request processed successfully!';
                successOutput.classList.remove('hidden');
                
                // Clear form
                document.getElementById('email').value = '';
                document.getElementById('phoneNumber').value = '';
                
            } catch (error) {
                console.error('Error:', error);
                errorOutput.textContent = \`Error: \${error.message || 'Failed to connect to the server'}\`;
                errorOutput.classList.remove('hidden');
                responseOutput.textContent = 'An error occurred. Check the console for details.';
            } finally {
                // Hide loading indicator
                loadingIndicator.style.display = 'none';
            }
        });
    </script>
</body>
</html>`;

// Write this HTML content to the public directory
const indexPath = path.join(publicDir, 'index.html');
try {
  fs.writeFileSync(indexPath, htmlContent);
  console.log('Updated index.html file with new content');
} catch (error) {
  console.error('Error writing index.html file:', error);
}

// Define API routes
// Root endpoint - serve static HTML
app.get('/', (req: Request, res: Response) => {
  // Always serve the index.html from memory to ensure it's the latest version
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

// Handle any lingering requests to the removed view-contacts page
app.get('/view-contacts', (req: Request, res: Response) => {
  return res.redirect('/');
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

// Debug endpoint to test request handling
app.get('/debug', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    time: new Date().toISOString(),
    endpoints: [
      { path: '/', method: 'GET', description: 'Frontend interface' },
      { path: '/identify', method: 'POST', description: 'Contact identification' },
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/debug', method: 'GET', description: 'Debug information' }
    ],
    environment: {
      nodeEnv: process.env.NODE_ENV || 'not set',
      port: process.env.PORT || '3000'
    }
  });
});

// Route to handle identify requests
app.post('/identify', async (req: Request, res: Response) => {
  try {
    // Log incoming request for debugging
    console.log('Received request to /identify with body:', req.body);
    
    // Check if content type is application/json
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Invalid content type:', contentType);
      return res.status(415).json({
        error: 'Unsupported Media Type. Content-Type must be application/json'
      });
    }
    
    // Ensure body is not empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.warn('Empty request body');
      return res.status(400).json({
        error: 'Request body is empty'
      });
    }
    
    const { email, phoneNumber } = req.body as ContactRequest;
    
    // Validate request - at least one of email or phoneNumber is required
    if (!email && !phoneNumber) {
      console.warn('Missing required fields');
      return res.status(400).json({ 
        error: 'At least one of email or phoneNumber is required' 
      });
    }
    
    // Convert phoneNumber to string if it's a number
    const phone = phoneNumber ? String(phoneNumber) : null;
    
    // Process the contact
    const result = await identifyContact(email, phone);
    
    // Log the response for debugging
    console.log('Sending response:', result);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Initialize database - create table if it doesn't exist
async function initializeDb() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database for initialization');

    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'contacts'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Creating contacts table...');
      
      // Create contacts table with a retry mechanism
      let retries = 3;
      let created = false;
      
      while (retries > 0 && !created) {
        try {
          await client.query(`
            CREATE TABLE contacts (
              id SERIAL PRIMARY KEY,
              "phoneNumber" VARCHAR,
              email VARCHAR,
              "linkedId" INTEGER REFERENCES contacts(id),
              "linkPrecedence" VARCHAR NOT NULL DEFAULT 'primary',
              "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
              "deletedAt" TIMESTAMP
            );
          `);
          created = true;
          console.log('Contacts table created successfully.');
        } catch (err) {
          console.error(`Error creating table (attempt ${4-retries}/3):`, err);
          retries--;
          
          if (retries === 0) {
            throw err;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      console.log('Contacts table already exists.');
      
      // Log table structure for debugging
      const tableStructure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'contacts';
      `);
      
      console.log('Contacts table structure:', tableStructure.rows);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log('Database client released after initialization');
    }
  }
}

// Function to identify and process contacts
async function identifyContact(email: string | null | undefined, phoneNumber: string | null | undefined): Promise<IdentifyResponse> {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Find existing contacts that match either email or phoneNumber
    const matchingContactsQuery = `
      SELECT * FROM contacts 
      WHERE 
        (email = $1 AND $1 IS NOT NULL) 
        OR 
        ("phoneNumber" = $2 AND $2 IS NOT NULL)
      ORDER BY "createdAt" ASC;
    `;
    
    const matchingContacts = await client.query(matchingContactsQuery, [email, phoneNumber]);
    
    // If no matching contacts found, create a new primary contact
    if (matchingContacts.rows.length === 0) {
      const newContactQuery = `
        INSERT INTO contacts (email, "phoneNumber", "linkPrecedence")
        VALUES ($1, $2, 'primary')
        RETURNING *;
      `;
      
      const newContact = await client.query(newContactQuery, [email, phoneNumber]);
      
      await client.query('COMMIT');
      
      // Return the response with the newly created contact
      return {
        contact: {
          primaryContactId: newContact.rows[0].id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: []
        }
      };
    }
    
    // Process existing contacts
    const contacts: Contact[] = matchingContacts.rows;

    // Find all primary contacts
    let primaryContacts = contacts.filter(c => c.linkPrecedence === 'primary');
    let secondaryContacts = contacts.filter(c => c.linkPrecedence === 'secondary');
    
    // If there are multiple primary contacts, we need to consolidate them
    let primaryContact: Contact;
    
    if (primaryContacts.length > 1) {
      // Sort by creation date to find the oldest one
      primaryContacts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      primaryContact = primaryContacts[0];
      const otherPrimaries = primaryContacts.slice(1);
      
      // Convert other primaries to secondary and link them to the oldest primary
      for (const primary of otherPrimaries) {
        await client.query(`
          UPDATE contacts 
          SET "linkPrecedence" = 'secondary', "linkedId" = $1, "updatedAt" = NOW()
          WHERE id = $2;
        `, [primaryContact.id, primary.id]);
        
        // Update any secondary contacts that were linked to this primary
        await client.query(`
          UPDATE contacts 
          SET "linkedId" = $1, "updatedAt" = NOW()
          WHERE "linkedId" = $2;
        `, [primaryContact.id, primary.id]);
      }
    } else {
      primaryContact = primaryContacts[0];
    }
    
    // Find all secondary contacts linked to the primary contact
    const linkedSecondsQuery = `
      SELECT * FROM contacts WHERE "linkedId" = $1;
    `;
    
    const linkedSeconds = await client.query(linkedSecondsQuery, [primaryContact.id]);
    secondaryContacts = linkedSeconds.rows;
    
    // Check if we need to create a new secondary contact
    // We create a new secondary contact if the request has new information (email or phone)
    // that's not already present in the primary or existing secondaries
    const allEmails = [
      primaryContact.email,
      ...secondaryContacts.map((c: Contact) => c.email)
    ].filter(Boolean) as string[];
    
    const allPhones = [
      primaryContact.phoneNumber,
      ...secondaryContacts.map((c: Contact) => c.phoneNumber)
    ].filter(Boolean) as string[];
    
    const hasNewEmail = email && !allEmails.includes(email);
    const hasNewPhone = phoneNumber && !allPhones.includes(phoneNumber);
    
    // Create a new secondary contact if we have new information
    if (hasNewEmail || hasNewPhone) {
      const newSecondaryQuery = `
        INSERT INTO contacts (email, "phoneNumber", "linkedId", "linkPrecedence")
        VALUES ($1, $2, $3, 'secondary')
        RETURNING *;
      `;
      
      const newSecondary = await client.query(newSecondaryQuery, [
        // If we already have the email, don't duplicate it
        hasNewEmail ? email : null,
        // If we already have the phone, don't duplicate it
        hasNewPhone ? phoneNumber : null,
        primaryContact.id
      ]);
      
      secondaryContacts.push(newSecondary.rows[0]);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Format the response
    // Collect all unique emails and phone numbers
    const uniqueEmails = Array.from(new Set([
      primaryContact.email,
      ...secondaryContacts.map((c: Contact) => c.email)
    ].filter(Boolean))) as string[];
    
    const uniquePhones = Array.from(new Set([
      primaryContact.phoneNumber,
      ...secondaryContacts.map((c: Contact) => c.phoneNumber)
    ].filter(Boolean))) as string[];
    
    // Ensure primary's email and phone are first in the lists if they exist
    if (primaryContact.email && uniqueEmails.includes(primaryContact.email) && uniqueEmails[0] !== primaryContact.email) {
      uniqueEmails.splice(uniqueEmails.indexOf(primaryContact.email), 1);
      uniqueEmails.unshift(primaryContact.email);
    }
    
    if (primaryContact.phoneNumber && uniquePhones.includes(primaryContact.phoneNumber) && uniquePhones[0] !== primaryContact.phoneNumber) {
      uniquePhones.splice(uniquePhones.indexOf(primaryContact.phoneNumber), 1);
      uniquePhones.unshift(primaryContact.phoneNumber);
    }
    
    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails: uniqueEmails,
        phoneNumbers: uniquePhones,
        secondaryContactIds: secondaryContacts.map((c: Contact) => c.id)
      }
    };
    
  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    console.error('Error in identifyContact:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Start the server
async function startServer() {
  try {
    await initializeDb();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend available at: http://localhost:${PORT}`);
      console.log(`API endpoints: /identify (POST), /health (GET)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;