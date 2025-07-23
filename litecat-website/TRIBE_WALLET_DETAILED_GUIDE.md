# 📱 Detailed Tribe Wallet Guide - Finding Your RGB Token Info

## Step 1: Finding the Asset ID

### What is an Asset ID?
- It's like a "serial number" for your token type
- Public information - safe to share
- Identifies LIGHTCAT tokens specifically
- Looks like: `rgb:2bFVTT-qGmxxPDh-X3Bq2Tw-xVbZZ1n-fxT3V7E-F9A842E6`

### How to Find It:

1. **Open Tribe Wallet app**

2. **Go to your tokens**:
   - Look for a tab/button that says:
     - "Assets" or
     - "Tokens" or  
     - "RGB" or
     - "Portfolio"
   - Tap it

3. **Find LIGHTCAT**:
   - Scroll through your token list
   - Look for "LIGHTCAT" or "LITECAT"
   - You should see your balance (like "1,000,000 LIGHTCAT")

4. **Tap on LIGHTCAT**:
   - This opens the token details page

5. **Find the Asset ID**:
   - Look for one of these:
     - "Asset ID"
     - "RGB Asset ID"
     - "Token ID"
     - "Contract ID"
     - An info icon (ℹ️) - tap it
     - Three dots menu (...) → "Details"
   
6. **Copy the Asset ID**:
   - It will look like: `rgb:` followed by random letters/numbers
   - Tap and hold to copy
   - Or look for a copy button (📋)

### What You're Looking For:
```
Asset ID: rgb:2bFVTT-qGmxxPDh-X3Bq2Tw-xVbZZ1n-fxT3V7E-F9A842E6
         ^^^^ This part confirms it's RGB
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Unique identifier
```

---

## Step 2: Finding the Network (Mainnet vs Testnet)

### What's the Difference?

**🟢 MAINNET (Main Network)**
- Real Bitcoin network
- Real money/value
- Permanent transactions
- Where real LIGHTCAT tokens live for sale

**🟡 TESTNET (Test Network)**
- Practice Bitcoin network
- Fake money for testing
- Free test coins
- For experimenting safely

**🔵 SIGNET (Another Test Network)**
- Similar to testnet
- More stable for testing

### How to Check Your Network:

1. **Go to Settings**:
   - Look for gear icon ⚙️
   - Or hamburger menu ☰ → Settings
   - Or profile icon → Settings

2. **Find Network Settings**:
   - Look for:
     - "Network"
     - "Bitcoin Network"
     - "Connection"
     - "Node Settings"
     - "Advanced"

3. **Check Current Network**:
   - It will say one of:
     - "Bitcoin Mainnet" or just "Mainnet" = REAL
     - "Bitcoin Testnet" or just "Testnet" = TEST
     - "Signet" = TEST
     - "Regtest" = LOCAL TEST

4. **Look at Your Balance Screen**:
   - Sometimes shows "testnet" in the corner
   - Or uses different colors:
     - Orange/Yellow = Mainnet
     - Green = Testnet
     - Blue = Signet

### Quick Check Method:
- If you bought LIGHTCAT with real money → It's on MAINNET
- If you got free test tokens → It's on TESTNET

### What to Tell Me:
```
Network: Mainnet
(or)
Network: Testnet
```

---

## Step 3: Getting a Sample Receive Invoice

### What is an RGB Invoice?
- Special address for receiving RGB tokens
- Different from regular Bitcoin address
- Changes each time for privacy
- Safe to share (it's for receiving only)

### How to Generate One:

1. **While viewing LIGHTCAT token**:
   - Stay on the LIGHTCAT details page

2. **Tap "Receive"**:
   - Look for:
     - "Receive" button
     - Down arrow ↓
     - QR code icon
     - "Get Address"
     - "Receive LIGHTCAT"

3. **Choose RGB Invoice** (Important!):
   - You might see options:
     - "Bitcoin Address" ❌ (wrong one)
     - "Lightning Invoice" ❌ (wrong one)
     - "RGB Invoice" ✅ (correct!)
     - "RGB Address" ✅ (correct!)
   - Make sure it's RGB-specific

4. **Copy the Invoice**:
   - It will look like one of these formats:
     ```
     rgb:utxob:2PY7Rp-gLKiHb1n-MfLEcm5-iFR5BfG-KgXwW8X-XgLTtTL-AYjdGo
     rgb:2bFVTT-qGmxxPDh-X3Bq2Tw-xVbZZ1n-fxT3V7E-F9A842E6#utxob:...
     rgb:utxob:VeryLongStringOfRandomCharacters...
     ```
   - Tap the copy button 📋
   - Or tap and hold → Copy

5. **What Makes It RGB**:
   - Starts with `rgb:`
   - Contains `utxob` (blinded UTXO)
   - Much longer than Bitcoin address

### What to Share:
```
Sample Invoice: rgb:utxob:2PY7Rp-gLKiHb1n-MfLEcm5-iFR5BfG-KgXwW8X-XgLTtTL-AYjdGo
```

---

## 📋 Complete Checklist

After following these steps, you should have:

```
1. Asset ID: rgb:________________________
   Found in: LIGHTCAT token → Details/Info

2. Network: [Mainnet / Testnet / Signet]
   Found in: Settings → Network

3. Sample Invoice: rgb:utxob:________________________
   Found in: LIGHTCAT token → Receive → RGB Invoice
```

---

## 🤔 Troubleshooting

### Can't Find Asset ID?
- Try tapping the (i) info icon
- Look for "Advanced" or "Details"
- Check three-dots menu (...)
- Sometimes under "Token Information"

### Can't Find Network?
- Check top of main screen
- Look in About section
- See if addresses start with:
  - "bc1" = Mainnet
  - "tb1" = Testnet

### Can't Generate RGB Invoice?
- Make sure you're in LIGHTCAT token view
- Not the main Bitcoin wallet
- Look for RGB-specific receive option
- Try "Advanced Receive" options

### Everything Shows "Testnet"?
- You might have test tokens
- Check if you paid real money for them
- Real purchased tokens = Mainnet
- Free test tokens = Testnet

---

## 💬 What to Send Me

Once you find all three, send me a message like:
```
Asset ID: rgb:2bFVTT-qGmxxPDh-X3Bq2Tw-xVbZZ1n-fxT3V7E-F9A842E6
Network: Mainnet
Sample Invoice: rgb:utxob:2PY7Rp-gLKiHb1n-MfLEcm5-iFR5BfG-KgXwW8X-XgLTtTL-AYjdGo
```

That's all I need to configure your system!

---

## ❓ Need More Help?

Tell me:
1. What screen you're currently on
2. What buttons/options you see
3. Any specific text or labels
4. Screenshots are helpful (but hide any private keys!)

Remember: I only need these 3 pieces of PUBLIC information. Never share your seed phrase or private keys!