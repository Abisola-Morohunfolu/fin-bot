# WhatsApp Finance Bot

Incremental WhatsApp finance assistant built with:
- Node.js (ES Modules)
- `whatsapp-web.js`
- Prisma ORM + SQLite

## Current Status

- Phase 1 complete: WhatsApp connection + QR login + echo bot
- Phase 2 complete in code: Prisma schema, text intent parsing, transaction/balance/summary commands

## Project Structure

```txt
whatsapp-finance-bot/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── bot/
│   │   ├── client.js
│   │   └── messageHandler.js
│   ├── db/
│   │   └── prismaClient.js
│   ├── nlp/
│   │   └── intentParser.js
│   ├── services/
│   │   └── financeService.js
│   └── utils/
│       └── formatter.js
├── .env.example
├── index.js
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run migration:
```bash
npm run prisma:migrate
```

5. Start bot:
```bash
npm start
```

## Tests

Run unit tests:
```bash
npm test
```

## Phase 2 Commands

- `spent 4500 on groceries`
- `earned 100000 salary`
- `balance`
- `summary` or `report`
- `help`

Unknown input returns:
`I didn't understand that. Send help for commands.`

## Notes

- Keep `.env` local and never commit secrets.
- `.env.example` is committed for shared defaults.
- Local SQLite files are ignored via `.gitignore`.
