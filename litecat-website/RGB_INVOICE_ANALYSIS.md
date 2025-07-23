# 📋 RGB Invoice Analysis - LIGHTCAT Integration

## ✅ Information Received

### Asset Details:
- **Asset ID**: `rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po`
- **Network**: Mainnet
- **Balance**: 21,000,000 LIGHTCAT tokens

### Invoice Format:
```
rgb:~/~/~/bc:utxob:~7gWmgoA-22I3w3R-nVaZCVi-855DAIx-GHelWrC-kak2yq4-oICD6?expiry=1753383754&endpoints=rpcs://proxy.iriswallet.com/0.2/json-rpc
```

## 🔍 Invoice Breakdown

1. **Protocol**: `rgb:` - RGB protocol identifier
2. **Beneficiary**: `~/~/~/bc` - Anonymous/private beneficiary on Bitcoin
3. **Transport**: `utxob:` - Blinded UTXO format
4. **Blinded UTXO**: `~7gWmgoA-22I3w3R-nVaZCVi-855DAIx-GHelWrC-kak2yq4-oICD6`
5. **Expiry**: `1753383754` - Unix timestamp (expires in ~30 days)
6. **Endpoint**: `rpcs://proxy.iriswallet.com/0.2/json-rpc` - Iris Wallet proxy for consignment delivery

## 🎯 Key Insights

### 1. Wallet Type
- You're using Iris Wallet proxy infrastructure
- This is good - it handles consignment routing automatically

### 2. Invoice Features
- **Privacy**: Uses blinded UTXOs for privacy
- **Expiry**: Invoices expire after ~30 days
- **Proxy**: Iris Wallet handles consignment delivery

### 3. Integration Requirements
- We'll need to generate invoices in this format
- Consignments will be sent through Iris proxy
- Buyers will use their own RGB wallets to receive

## 🔧 Next Steps for Integration

### 1. Configure RGB Service
```javascript
// Update RGB service to handle Iris format
const invoiceFormat = {
  protocol: 'rgb:',
  beneficiary: '~/~/~/bc',
  transport: 'utxob',
  endpoint: 'rpcs://proxy.iriswallet.com/0.2/json-rpc'
};
```

### 2. Consignment Delivery
- When buyer pays, we create consignment
- Send consignment to Iris proxy endpoint
- Proxy delivers to buyer's wallet

### 3. Implementation Path
1. **Buyer Flow**:
   - Buyer provides their RGB invoice (from their wallet)
   - We validate the format
   - Generate Lightning invoice for payment

2. **Payment Flow**:
   - Buyer pays Lightning invoice
   - We detect payment
   - Generate RGB consignment for token transfer

3. **Delivery Flow**:
   - Create consignment with buyer's invoice
   - Send to endpoint specified in their invoice
   - Buyer receives tokens in their wallet

## ❓ Questions for Implementation

1. **RGB Node Access**:
   - Do you have RGB node running locally?
   - Or should we use Iris Wallet's infrastructure?
   - Can you create consignments from Tribe Wallet?

2. **Transfer Authorization**:
   - How do you approve transfers in Tribe Wallet?
   - Batch transfers possible?
   - API access or manual approval needed?

3. **Testing**:
   - Can you create a test transfer of 1 token?
   - What's the exact process you follow?

## 📝 Configuration Updates Needed

```env
# RGB Configuration
RGB_ASSET_ID=rgb:uQsgEYWo-T6mnwCS-N6mH90J-w6fAeQJ-p53B8gj-UKIY7Po
RGB_NETWORK=mainnet
RGB_INVOICE_FORMAT=iris
RGB_PROXY_ENDPOINT=rpcs://proxy.iriswallet.com/0.2/json-rpc

# Still need:
RGB_NODE_URL=<your-rgb-node-if-you-have-one>
RGB_TRANSFER_METHOD=<manual|api|cli>
```

## 🚀 Ready to Proceed

With this information, I can now:
1. Update the invoice validation to accept Iris format
2. Implement proper consignment generation
3. Set up the proxy delivery system

**Next Question**: How do you currently transfer tokens from Tribe Wallet? Is it:
- Manual (you approve each transfer in the app)
- CLI based (using rgb-node commands)
- API based (programmatic access)

This will determine how we automate the token distribution!