# 🧪 PayFast Sandbox Testing Plan

## 🎯 Goal: Verify entries are automatically created after successful payment

### **TEST SCENARIO 1: Normal Payment Flow**
1. **Create multiple entries** (2-3 entries in competition form)
2. **Proceed to PayFast payment**
3. **Complete sandbox payment** using test credentials
4. **DO NOT visit success page** (close browser tab)
5. **Check admin panel** - entries should exist automatically!

### **TEST SCENARIO 2: Success Page Backup**
1. **Create entries** and pay via PayFast sandbox
2. **Visit success page** normally
3. **Verify entries** are not duplicated

### **TEST SCENARIO 3: Payment Failure**
1. **Create entries** and initiate payment
2. **Cancel payment** in PayFast sandbox
3. **Verify entries** are NOT created

---

## 🧪 **PayFast Sandbox Test Credentials**

### **Test Cards (Sandbox Only):**
- **Successful Payment:** Use any valid card format
- **Failed Payment:** Card number ending in 0001
- **Cancelled Payment:** Close payment window

### **Test Bank Accounts:**
- **Bank:** Any bank selection will work
- **Account:** Any valid account format

---

## ✅ **What to Check After Each Test:**

### **1. Database Verification:**
```sql
-- Check recent payments
SELECT payment_id, status, payment_status, amount, created_at 
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent entries
SELECT id, item_name, payment_status, payment_id, submitted_at
FROM event_entries 
ORDER BY submitted_at DESC 
LIMIT 5;

-- Check payment logs
SELECT event_type, event_data, created_at
FROM payment_logs 
WHERE event_type IN ('auto_entries_created', 'entries_created')
ORDER BY created_at DESC 
LIMIT 5;
```

### **2. Admin Panel Check:**
- Navigate to `/portal/admin`
- Check "Event Entries" section
- Verify entries show as "paid" and "approved"
- Check entry details match what was submitted

### **3. Console Logs:**
Look for these success messages:
```
🎯 Auto-approving entries for payment: ENTRY_xxx
🔄 Creating entries automatically for batch payment: ENTRY_xxx
✅ Auto-created entry {id} successfully
🎉 Successfully auto-created X entries for payment ENTRY_xxx
```

---

## 🚨 **Expected Results:**

### **✅ SUCCESS CRITERIA:**
- Entries created **automatically** by webhook
- Payment status = "completed" 
- Entry payment_status = "paid"
- Entry approved = true
- No duplicate entries
- Payment logs show "auto_entries_created"

### **❌ FAILURE INDICATORS:**
- No entries after successful payment
- Entries only created when visiting success page
- Payment successful but entries have payment_status = "pending"
- Error logs in webhook processing

---

## 🔧 **Debugging Commands:**

### **Check Webhook Calls:**
```sql
SELECT payment_id, event_type, event_data, created_at
FROM payment_logs 
WHERE payment_id = 'YOUR_PAYMENT_ID'
ORDER BY created_at;
```

### **Check Entry Creation:**
```sql
SELECT ee.*, p.status as payment_status_table
FROM event_entries ee
LEFT JOIN payments p ON ee.payment_id = p.payment_id
WHERE ee.payment_id = 'YOUR_PAYMENT_ID';
```

---

## 🎉 **Test Success Confirmation:**

When sandbox testing is successful, you'll see:
1. **Webhook logs** showing automatic entry creation
2. **Database entries** with correct payment linking
3. **Admin panel** showing approved, paid entries
4. **No manual intervention** required

The bug is **FIXED** when entries are created **even without visiting the success page**!
