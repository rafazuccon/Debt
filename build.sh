#!/bin/bash
# Script de build para Vercel

# Garantir que DATABASE_URL existe
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:./dev.db"
fi

# Garantir que JWT_SECRET existe  
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="default-jwt-secret-vercel-build"
fi

# Gerar Prisma client
npx prisma generate

# Executar migrations apenas se for PostgreSQL
if [[ "$DATABASE_URL" == postgres* ]]; then
  npx prisma db push
fi

# Build Next.js
npx next build
