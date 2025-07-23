# 🔴 RGB Token Integration Checklist

## 📋 What We Need From Your RGB Wallet

### 1. **RGB Asset Information**
Please provide:
- **Asset ID**: The RGB asset ID for LIGHTCAT tokens (looks like: `rgb:2bFVTT-qGmxxPDh-...`)
- **Contract ID**: The RGB contract identifier
- **Asset Schema**: Which RGB schema (RGB20, RGB21, etc.)
- **Total Supply**: Confirm 21,000,000 tokens
- **Precision**: Decimal places (usually 0 for meme tokens)

### 2. **RGB Node Details**
- **RGB Node URL**: Where is your RGB node running?
- **Node Type**: RGB-NODE, RGB Core, or other?
- **Network**: Testnet or Mainnet?
- **API Access**: Do you have API keys/credentials?

### 3. **Current Token Distribution**
- **Wallet Address**: Your RGB-compatible Bitcoin address holding the tokens
- **Available Balance**: How many tokens are available for sale?
- **UTXO Information**: Which UTXOs hold the RGB tokens?

### 4. **Technical Setup**
Do you have:
- [ ] RGB node running and synced?
- [ ] Access to create consignments?
- [ ] Ability to sign PSBTs?
- [ ] Bitcoin node for UTXO management?

## 🔧 Integration Steps

### Step 1: Configure Asset Details
```bash
# Update .env with your real RGB asset
RGB_ASSET_ID=<your-actual-asset-id>
RGB_CONTRACT_ID=<your-contract-id>
RGB_NODE_URL=<your-rgb-node-url>
RGB_NODE_API_KEY=<if-required>
```

### Step 2: Invoice Format
RGB invoices typically look like:
- `rgb:utxob:<blinded_utxo>@<transport_endpoints>`
- `rgb:<invoice_data>`

**Question**: What format does your RGB wallet use for invoices?

### Step 3: Consignment Generation
When someone pays, we need to:
1. Receive their RGB invoice
2. Create a consignment file with the token transfer
3. Sign the transfer with your wallet
4. Deliver the consignment file

**Question**: Can your RGB node create consignments via API, or do we need to use command-line tools?

### Step 4: Transfer Authorization
- How do you authorize transfers from your wallet?
- Do you have signing keys accessible to the server?
- Or do you prefer manual approval for each transfer?

## 🚨 Security Considerations

### Option 1: Automated Transfers (Convenient but requires trust)
- Server has access to sign transfers
- Automatic token distribution
- Requires secure key management

### Option 2: Semi-Automated (Recommended)
- Server creates unsigned transfers
- You sign them periodically
- Batch processing possible

### Option 3: Manual Approval (Most secure)
- Each purchase requires your approval
- You manually create consignments
- Maximum security, less convenient

## 📝 Information Needed Now

Please provide:

1. **RGB Asset ID**: `________________________`
2. **RGB Node URL**: `________________________`
3. **Network**: `[ ] Testnet  [ ] Mainnet`
4. **Your RGB wallet software**: `________________________`
5. **Preferred security model**: `[ ] Auto  [ ] Semi-Auto  [ ] Manual`

## 🎯 Next Steps After You Provide Info

1. Update configuration with real asset details
2. Test RGB invoice validation with your format
3. Implement consignment generation
4. Test small transfer (1 token)
5. Verify full payment + transfer flow
6. Go live!

## 💡 Quick Questions

1. **Do you have RGB CLI tools installed?** (rgb-node, rgb-cli, etc.)
2. **Can you generate a test invoice from your wallet?**
3. **What's the exact command/process you use to transfer tokens?**
4. **Do you want to test on testnet first or go straight to mainnet?**

---

**Please share the RGB asset details and we'll configure the system for real token transfers!**