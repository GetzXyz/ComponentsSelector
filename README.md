# FORGE AI PC Builder

Production-ready AI-powered PC builder website built with Next.js, React, TypeScript, Tailwind CSS, and Groq.

## Features

- AI build generator with server-side Groq integration and offline fallback
- Regional currencies: PKR, USD, EUR, GBP, AED, INR
- Live-ready price research model with conservative validation notes
- Gaming FPS estimator for 1080p, 1440p, and 4K
- CPU/GPU comparison tool
- PDF, print, and share invoice actions
- Privacy and terms gate with checkbox validation
- Admin dashboard API for usage, source, and key status
- Responsive futuristic gaming UI with dark/light mode

## Folder Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable client UI
- `lib/` - Types, pricing logic, fallback estimators
- `database.schema.sql` - Suggested production database schema
- `.env.example` - Environment variable template

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

The app still generates realistic fallback builds without a key.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm run start
```

For Vercel, add `GROQ_API_KEY` and optionally `GROQ_MODEL` in Project Settings, then deploy.

## Database Notes

`database.schema.sql` contains tables for build requests, components, pricing sources, and admin audit logs. The current app is stateless by default, so it can run immediately; connect these tables through your preferred hosted Postgres provider when persistent analytics are required.

## Accuracy Notes

Prices and FPS estimates are not guaranteed. The app uses conservative estimates, filters unrealistic outputs, and asks users to verify stock, warranty, taxes, and final retailer pricing before purchase.
