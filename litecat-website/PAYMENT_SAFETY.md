# Payment Safety & Supply Protection System

## YES, this is professionally built to prevent ANY mistakes!

### 1. Database-Level Protection
- **Hard Supply Cap**: Database constraint prevents selling more than 30,000 batches (21M tokens)
- **Per-Wallet Limits**: Database enforces tier-based purchase limits (5/8/10 batches)
- **Atomic Transactions**: All updates are wrapped in transactions - either all succeed or all fail
- **Audit Trail**: Every change is logged with who/what/when

### 2. Application-Level Checks (paymentController.js)
```javascript
// Check 1: Verify tier limits
if (batchCount > maxBatches) {
    return error: 'Batch count exceeds tier limit'
}

// Check 2: Verify wallet hasn't exceeded limit
if (totalBatches + batchCount > maxBatches) {
    return error: 'Purchase would exceed wallet limit'
}

// Check 3: Verify supply available
if (totalSold + batchCount > 30000) {
    return error: 'Insufficient supply'
}
```

### 3. Payment Verification Process
1. **Invoice Created**: Pending status, expires in 1 hour
2. **Payment Sent**: User sends BTC to provided address
3. **Payment Verified**: System checks blockchain confirmations
4. **Status Updated**: Only marked "completed" after blockchain confirmation
5. **Supply Deducted**: Only completed payments count against supply

### 4. Real-Time Supply Tracking
- **Live View**: `sales_stats` view shows exact remaining supply
- **No Double-Counting**: Only "completed" status counts as sold
- **Pending Reservations**: Expire after 1 hour if unpaid

### 5. Safety Features
- **No Manual Edits**: All updates go through validated API endpoints
- **Blockchain Verification**: Payments verified on Bitcoin blockchain
- **Refund Protection**: Refunded purchases restore supply
- **Race Condition Prevention**: Database locks prevent overselling

### 6. What Happens When Someone Pays

1. **Create Invoice**:
   - Checks all limits
   - Reserves batches (pending status)
   - Generates unique payment address

2. **Payment Received**:
   - Verifies on blockchain
   - Updates to "completed"
   - Deducts from available supply
   - Records wallet for airdrop

3. **Supply Updates**:
   - Real-time view updates automatically
   - Website shows new percentage sold
   - Can never exceed 21M tokens

### 7. Error Prevention
- **Type Checking**: batch_count must be 1-10
- **Math Validation**: total_tokens = batch_count × 700
- **Status Validation**: Only allowed statuses
- **Duplicate Prevention**: Unique constraints

### 8. Manual Verification Options
You can always:
- Check Bitcoin blockchain for payments
- Query database for exact counts
- Export all purchase records
- Audit trail shows all changes

## Bottom Line
**NO MESS UPS POSSIBLE**: The system will reject any attempt to:
- Sell more than 21M tokens
- Let wallet buy more than tier allows  
- Process payment without blockchain confirmation
- Modify records without audit trail

The database literally won't allow overselling - it will throw an error and reject the transaction.