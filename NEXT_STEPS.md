# Recommended Production Upgrades

1. Add Prisma or Knex migrations instead of raw SQL.
2. Add MinIO/S3 for uploaded bank statement storage.
3. Add PDF OCR with Tesseract or a document AI service.
4. Add real eBarimt integration after official registration.
5. Connect a real LLM API in `backend/src/modules/ai/ai.service.js`.
6. Add audit logs for delete/approve actions.
7. Add tests with Vitest/Jest and Supertest.
8. Add Nginx reverse proxy and HTTPS.
