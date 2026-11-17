# UNU AI

A private AI business assistant for the UNU guitar brand. It keeps your leads, sales, products, marketing plan, website pages and brand knowledge in one place, and an assistant powered by Claude (`claude-opus-5-5`) that can read and change all of it, by text, by voice in the browser, or over the phone.

## What it does

| Area | What you get |
| --- | --- |
| **Dashboard** | Revenue, pipeline, follow-ups due, open tasks, upcoming content, and an AI daily briefing (it can also phone you with it). |
| **Assistant** | Chat with an assistant that uses your real data: "find 10 guitar shops in Germany", "log that Ana ordered 2 guitars", "plan next week's posts". Voice input and spoken replies in Romanian or English. |
| **Leads** | Pipeline for customers, dealers, artists, distributors and press. AI lead finder searches the web for new prospects. Each lead gets an AI sales prep brief (with web research) and outreach drafts for email, Instagram, WhatsApp or a call script. |
| **Sales** | Record sales, quotes and orders, see revenue by month, product and channel, and get an AI read on what's working. Stock updates automatically. |
| **Marketing** | AI campaign planner that creates tasks with due dates and a content calendar with every post written. One-off post writer, rewrite with an instruction, task list. |
| **Products** | Catalog with price, cost, margin and stock. AI product descriptions for your website, marketplaces, dealer catalogs or Instagram. |
| **Website** | AI page builder (home, about, dealers, artists or anything you describe), live preview, edit by instruction, publish at `/site/<slug>`, or copy the HTML into your existing site. |
| **Brand brain** | Brand profile and a knowledge base the assistant reads on every request. Teach it by pasting a link, adding facts, or telling it things in chat. |
| **Phone** | With a Twilio number, the assistant can call you (briefings, reminders) and you can call it and talk through anything. |

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env.local   # then put your ANTHROPIC_API_KEY in it
npm run dev
```

Open http://localhost:3000, go to **Brand brain** and fill in the profile, then add your products. The assistant gets much better the more it knows.

All data is stored in a single SQLite file at `data/unuai.db`. Back up that file to back up everything.

## Put it online

The app keeps its data in a local file, so host it somewhere with a persistent disk (a small VPS, Railway, Render or Fly.io with a volume), not on a serverless host. Before going online:

1. Set `APP_PASSWORD` so only you can open it.
2. Set `ANTHROPIC_API_KEY`.
3. Run `npm run build` and `npm start`.

## Phone calls (optional)

1. Create a [Twilio](https://www.twilio.com) account and buy a phone number with voice.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` and `PUBLIC_BASE_URL` (your app's public https address).
3. Put your own number in **Brand brain > Your phone**.
4. In Twilio, set the number's "A call comes in" webhook to `POST https://<your app>/api/phone/voice` so you can call the assistant too. Only your own number is allowed through.

Webhook requests are verified with Twilio's signature.

## How it's built

- Next.js 16 (App Router) with TypeScript and Tailwind CSS
- SQLite through `better-sqlite3` (`src/lib/db.ts`, `src/lib/repo.ts`)
- Claude through the official Anthropic SDK (`src/lib/ai.ts`): one agent loop for the assistant with tools over your data (`src/lib/tools.ts`), plus web search and web fetch for research. Server-side refusal fallbacks are enabled.
- Twilio voice webhooks for phone calls (`src/lib/phone.ts`, `src/app/api/phone`)
