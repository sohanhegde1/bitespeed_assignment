# [bitespeed_assignment](https://bitespeed-assignment-hq8h.onrender.com/)

## Overview

This project implements the Bitespeed Backend Task for Identity Reconciliation. It provides a service that tracks and consolidates customer identities across multiple purchases, even when customers use different contact information.

## Live Demo

The application is deployed at: [bitespeed_assignment](https://bitespeed-assignment-hq8h.onrender.com/)

## Features

- Tracks and links customer identities based on common email addresses or phone numbers
- Maintains primary and secondary contact relationships
- Returns consolidated contact information in a structured format
- Provides a simple web interface for testing the API

## API Documentation

### Identify Endpoint

**URL**: `/identify`

**Method**: `POST`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "email": "customer@example.com",
  "phoneNumber": "1234567890"
}
```
Both fields are required.

**Response**:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["customer@example.com", "customer2@example.com"],
    "phoneNumbers": ["1234567890", "9876543210"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Technical Details

### Database Schema

The application uses a single table named `contacts` with the following schema:

```sql
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
```

### Contact Linking Rules

1. Contacts are linked if they share either email or phone number
2. The oldest contact is treated as primary
3. When contacts are linked, a hierarchy is established with one primary contact and multiple secondary contacts
4. If multiple primary contacts are found, they are consolidated with the oldest one remaining as primary

### Tech Stack

- **Backend**: Node.js with Express
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Deployment**: Render.com


### Identity Reconciliation Logic

The core logic follows these steps:

1. **Search for Matching Contacts**:
   - When a request is received, check if either email or phone number matches any existing contacts

2. **No Match Found**:
   - If no match is found, create a new primary contact

3. **Match Found**:
   - If matches are found, determine the primary contact (oldest by creation date)
   - If multiple primary contacts are found, consolidate them by keeping the oldest as primary and converting others to secondary
   - If new information is provided (email or phone not present in any linked contacts), create a new secondary contact

4. **Construct Response**:
   - Return a consolidated view with primary contact ID, all unique emails, all unique phone numbers, and all secondary contact IDs

### Performance Considerations

- Database queries use transactions to ensure data consistency
- Indexing could be added to optimize searches on email and phoneNumber columns for larger datasets
- Connection pooling is used to efficiently manage database connections
