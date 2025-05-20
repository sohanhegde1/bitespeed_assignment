# [bitespeed_assignment](https://bitespeed-assignment-hq8h.onrender.com/)
This project implements the Bitespeed Backend Task for Identity Reconciliation. It provides a service that tracks and consolidates customer identities across multiple purchases, even when customers use different contact information.
Live Demo
The application is deployed at: https://bitespeed-identity.onrender.com
Features

Tracks and links customer identities based on common email addresses or phone numbers
Maintains primary and secondary contact relationships
Returns consolidated contact information in a structured format
Provides a simple web interface for testing the API

API Documentation
Identify Endpoint
URL: /identify
Method: POST
Content-Type: application/json
Request Body:
json{
  "email": "customer@example.com",
  "phoneNumber": "1234567890"
}
Both fields are required.
Response:
json{
  "contact": {
    "primaryContactId": 1,
    "emails": ["customer@example.com", "customer2@example.com"],
    "phoneNumbers": ["1234567890", "9876543210"],
    "secondaryContactIds": [2, 3]
  }
}
Technical Details
Database Schema
The application uses a single table named contacts with the following schema:
sqlCREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  "phoneNumber" VARCHAR,
  email VARCHAR,
  "linkedId" INTEGER REFERENCES contacts(id),
  "linkPrecedence" VARCHAR NOT NULL DEFAULT 'primary',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);
Contact Linking Rules

Contacts are linked if they share either email or phone number
The oldest contact is treated as primary
When contacts are linked, a hierarchy is established with one primary contact and multiple secondary contacts
If multiple primary contacts are found, they are consolidated with the oldest one remaining as primary

Tech Stack

Backend: Node.js with Express
Language: TypeScript
Database: PostgreSQL
Deployment: Render.com
