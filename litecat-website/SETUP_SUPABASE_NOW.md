# 🗄️ Supabase Database Setup - Quick Guide

## 🎯 Why You Need This
Without a database, your platform can't:
- Track sales
- Remember customers
- Store purchase history
- Generate stats

## ⚡ Quick Setup (15 minutes)

### 1️⃣ Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or Email
4. **It's FREE** for your needs!

### 2️⃣ Create New Project
1. Click "New Project"
2. Fill in:
   - **Name**: `lightcat-db`
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
3. Click "Create Project"
4. Wait 2 minutes for setup

### 3️⃣ Get Your Credentials
1. Go to Settings → API
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon key**: `eyJhbGc...`
   - **service_role key**: `eyJhbGc...` (keep secret!)

### 4️⃣ Update Your Config
```bash
# Edit .env file
nano .env

# Update these lines:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 5️⃣ Run Database Setup
```bash
./scripts/setup-supabase.sh
```

This will:
- Create all tables
- Set up security
- Initialize data

## 📊 What Gets Created

### Tables:
- `purchases` - Track all token purchases
- `game_scores` - Store game results
- `rgb_invoices` - RGB payment tracking
- `lightning_invoices` - Payment records

## 🚀 That's It!

Your database is ready. The platform will now:
- Save all purchases
- Track real stats
- Remember customers
- Work like a real business!

**Time needed: 15 minutes**