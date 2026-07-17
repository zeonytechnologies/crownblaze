require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Cashfree, CFEnvironment } = require('cashfree-pg');

console.log("App ID loaded:", process.env.CASHFREE_APP_ID ? "YES (length: " + process.env.CASHFREE_APP_ID.length + ")" : "NO");
console.log("Secret loaded:", process.env.CASHFREE_SECRET_KEY ? "YES (length: " + process.env.CASHFREE_SECRET_KEY.length + ")" : "NO");

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment.SANDBOX;

const cf = new Cashfree();

let request = {
  order_amount: 100,
  order_currency: "INR",
  order_id: `test_${Date.now()}`,
  customer_details: {
    customer_id: "cust_123",
    customer_phone: "9999999999",
    customer_name: "Test User",
    customer_email: "test@example.com"
  }
};

cf.PGCreateOrder("2023-08-01", request).then((res) => {
  console.log("Success!", res.data);
}).catch((err) => {
  console.log("Auth Error Details:");
  console.log(err.response?.data || err.message);
  
  // Check if credentials actually got attached to the request
  console.log("\nRequest Headers sent by SDK:");
  console.log(err.config?.headers);
});
