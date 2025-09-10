# 💰 Debt Reminder App

Sistema de gerenciamento de cobranças e pagamentos entre amigos com integração PIX.

## ✨ Funcionalidades

- 🔐 **Autenticação completa** (cadastro, login, verificação por email/SMS)
- 💸 **Gestão de dívidas** (registrar quem deve para quem)
- 📱 **PIX integrado** (gerar QR codes, validar chaves)
- 👥 **Contatos** (salvar e validar chaves PIX)
- 📊 **Dashboard** (totais de dívidas e créditos)
- 🔄 **Copia e cola PIX** (parser de códigos EMV)

## 🚀 Como usar

### Desenvolvimento local

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma migrate dev

# Rodar o projeto
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Deploy no Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente (ver `.env.example`)
3. O Vercel fará o deploy automaticamente

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Banco**: PostgreSQL (produção) / SQLite (desenvolvimento)
- **Autenticação**: JWT + cookies httpOnly
- **PIX**: Integração com API EFI (antiga Gerencianet)
- **Email/SMS**: Nodemailer + Twilio

## 📝 Configuração

Copie o arquivo `.env.example` para `.env.local` e configure suas variáveis de ambiente.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request
