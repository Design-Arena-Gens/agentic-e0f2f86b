## Calling Agent Command Center

AI-assisted outbound calling control room powered by Next.js, Twilio, and OpenAI. Generate tailored call scripts, launch voice calls, and monitor live status updates from a single dashboard.

### Prerequisites

- A Twilio account with a verified caller ID or purchased phone number.
- An OpenAI API key with access to GPT-4o or compatible models.

Create `.env.local` by copying the template:

```bash
cp .env.local.example .env.local
```

Fill in the Twilio and OpenAI credentials:

```
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=...
TWILIO_CALLER_ID=+15555551234
OPENAI_API_KEY=sk-...
```

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the dashboard.

### Deployment

Deploy straight to Vercel:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-e0f2f86b
```

Ensure the environment variables above are configured in the Vercel dashboard before deploying.
