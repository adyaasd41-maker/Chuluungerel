# Cafe Management & Accounting System + AI Financial Assistant

Монгол кофе шоп, жижиг ресторан, POS + Санхүү + AI туслахтай demo-ready систем.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + Recharts
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT
- File Upload: Multer
- Bank Statement Parser: CSV / Excel
- Reports Export: ExcelJS
- API Docs: Swagger
- Deployment: Docker Compose

## Demo Login
```txt
Admin: admin@demo.mn / password123
Cashier: cashier@demo.mn / password123
Accountant: accountant@demo.mn / password123
```

## Run
```bash
cp .env.example .env
docker compose up --build
```

Open:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

## Important Notes
- eBarimt is simulated only.
- AI Finance module uses deterministic local rules so it works without paid AI API.
- You can later connect OpenAI/other LLM API inside `backend/src/modules/ai/ai.service.js`.
- Uploaded bank statement files can be soft-deleted or permanently deleted by admin.

## Project Structure
```txt
backend/
frontend/
database/
demo-data/
docker-compose.yml
```
