# 🔴 Getting LIGHTCAT Tokens from Tribe Wallet - Step by Step Guide

## 📱 Prerequisites
- Tribe Wallet app installed and open
- Your LIGHTCAT tokens visible in the wallet
- Access to your wallet backup/seed phrase (for safety)

## 🚀 Step-by-Step Instructions

### Step 1: Open Your RGB Asset in Tribe Wallet
1. Open **Tribe Wallet** app
2. Navigate to the **Assets** or **Tokens** tab
3. Find and tap on **LIGHTCAT** token
4. You should see your token balance

### Step 2: Get Asset Information
1. In the LIGHTCAT token screen, look for:
   - **Asset ID** (usually starts with `rgb:`)
   - **Contract ID** 
   - **Total Supply**: Should show 21,000,000
   - **Your Balance**: How many tokens you hold

2. **To Copy Asset ID**:
   - Tap on the asset details or info icon (ℹ️)
   - Look for "Asset ID" or "RGB Asset ID"
   - Tap and hold to copy, or use the copy button
   - Save this somewhere safe

### Step 3: Get Your RGB Invoice/Address
1. In Tribe Wallet, tap **Receive** while viewing LIGHTCAT
2. The wallet will generate an RGB invoice that looks like:
   - `rgb:utxob:...` (long string)
   - Or `rgb:2bFVTT-...` format
3. **Copy this invoice** - this is how others send tokens to you

### Step 4: Export/View Contract Details
1. Look for **Advanced** or **Details** option in the token view
2. Find these important details:
   - **Schema**: (RGB20, RGB21, etc.)
   - **Issue Date**
   - **Issue UTXO**: The Bitcoin UTXO that holds the tokens
   - **Genesis**: The creation transaction

### Step 5: Check Network Settings
1. Go to Tribe Wallet **Settings**
2. Check if you're on:
   - **Mainnet** (real Bitcoin)
   - **Testnet** (for testing)
   - **Signet** (another test network)
3. Note which network your tokens are on

### Step 6: Get Node Information (If Available)
1. In Settings, look for **Node Configuration** or **Advanced**
2. Check if Tribe shows:
   - RGB node endpoint
   - Electrum server
   - Any API endpoints

### Step 7: Prepare for Integration
You'll need to collect:

```
1. Asset ID: rgb:________________________
2. Contract ID: ________________________
3. Network: [ ] Mainnet [ ] Testnet [ ] Signet
4. Your RGB Invoice: rgb:utxob:________________________
5. Token Balance: ________________________
6. Schema Type: [ ] RGB20 [ ] RGB21 [ ] Other: ______
```

## 🔄 Creating Transfers in Tribe Wallet

### To Send Tokens (What We'll Automate):
1. Tap **Send** in LIGHTCAT token view
2. Paste recipient's RGB invoice
3. Enter amount (batches × 700 tokens)
4. Review fee (usually minimal)
5. Confirm with PIN/biometric
6. Wallet creates consignment file
7. Consignment is sent to recipient

## 🔧 Advanced Options

### Export Private Keys (⚠️ Be Careful!):
1. Settings → Security → Export Keys
2. Enter PIN/password
3. Find RGB-related keys
4. **Never share these publicly!**

### Get Consignment History:
1. Transaction History in LIGHTCAT view
2. Tap on any past transfer
3. View/Export consignment details

## 📸 What to Screenshot/Copy

Please get these from your Tribe wallet:
1. **Asset Details Screen** - showing Asset ID
2. **A sample RGB invoice** (from Receive screen)
3. **Network setting** (mainnet/testnet)
4. **Token balance** available for sale

## ❓ Common Locations in Tribe Wallet

- **Asset ID**: Token Details → Information → Asset ID
- **Network**: Settings → Network → Bitcoin Network
- **RGB Invoice**: Receive → RGB Invoice (not regular Bitcoin address)
- **Transfer History**: Token → Transactions

## 🚨 Important Notes

1. **Don't share**:
   - Private keys
   - Seed phrase
   - Wallet backup

2. **Do share**:
   - Asset ID
   - Public RGB invoices (for receiving)
   - Network type
   - Token specifications

## 💡 Quick Test

Once you have the Asset ID:
1. Create a test RGB invoice in Tribe (Receive → Copy)
2. Share it here so I can see the format
3. We'll configure the system to match

## 🤝 What Happens Next

After you provide the information:
1. I'll update the system configuration
2. We'll test generating invoices in your format
3. Implement consignment creation
4. Test with a small transfer
5. Go live with real tokens!

---

**Need help finding any of these? Let me know what screen you're on in Tribe Wallet and I can guide you!**