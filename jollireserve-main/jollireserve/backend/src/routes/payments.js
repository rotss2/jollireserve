const express = require("express");
const { getDb } = require("../firebase");
const { v4: uuid } = require("uuid");
const { requireAuth } = require("../middleware/auth");
const axios = require("axios");

const router = express.Router();

// PayMongo Test Keys (SAFE - no real money)
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || "sk_test_PhEp3r4ZXnTNxcn8byqjYqqm";
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY || "pk_test_LTcE8AWZ2R1NKUP1z8MWHCgW";
const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

// Helper for ISO timestamp
function isoNow() {
  return new Date().toISOString();
}

// Create payment intent (TEST MODE)
router.post("/create-intent", requireAuth, async (req, res) => {
  try {
    const { amount, description, reservation_id } = req.body;
    
    if (!amount || !reservation_id) {
      return res.status(400).json({ error: "Amount and reservation_id required" });
    }

    // Convert to centavos (PayMongo uses smallest currency unit)
    const amountInCentavos = Math.round(parseFloat(amount) * 100);

    // Create payment intent with PayMongo
    const response = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_intents`,
      {
        data: {
          attributes: {
            amount: amountInCentavos,
            payment_method_allowed: ["card", "gcash", "grab_pay", "paymaya"],
            payment_method_options: {
              card: { request_three_d_secure: "any" }
            },
            currency: "PHP",
            capture_type: "automatic",
            description: description || `Reservation ${reservation_id} - TEST MODE`,
            metadata: {
              reservation_id,
              user_id: req.user.id,
              test_mode: true
            }
          }
        }
      },
      {
        headers: {
          "Authorization": `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString("base64")}`,
          "Content-Type": "application/json"
        }
      }
    );

    const paymentIntent = response.data.data;
    
    // Save to database
    const db = getDb();
    await db.collection("payments").doc(paymentIntent.id).set({
      id: paymentIntent.id,
      reservation_id,
      user_id: req.user.id,
      amount: amountInCentavos,
      currency: "PHP",
      status: paymentIntent.attributes.status,
      description: paymentIntent.attributes.description,
      client_key: paymentIntent.attributes.client_key,
      test_mode: true,
      created_at: isoNow(),
      updated_at: isoNow()
    });

    console.log("[Payment] Created test intent:", paymentIntent.id);
    
    res.json({
      client_key: paymentIntent.attributes.client_key,
      payment_intent_id: paymentIntent.id,
      amount: amountInCentavos,
      test_mode: true,
      message: "⚠️ TEST MODE - No real money will be charged"
    });
  } catch (err) {
    console.error("Create payment intent error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Failed to create payment intent",
      details: err.response?.data?.errors || err.message
    });
  }
});

// Get payment status
router.get("/status/:id", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const paymentDoc = await db.collection("payments").doc(req.params.id).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    res.json({ payment: paymentDoc.data() });
  } catch (err) {
    console.error("Get payment status error:", err.message);
    res.status(500).json({ error: "Failed to get payment status" });
  }
});

// Webhook handler (for PayMongo to notify us of payment status)
router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;
    console.log("[Payment Webhook] Received:", event.type);
    
    if (event.type === "payment.paid") {
      const payment = event.data.attributes;
      const paymentIntentId = payment.payment_intent?.id;
      
      if (paymentIntentId) {
        const db = getDb();
        await db.collection("payments").doc(paymentIntentId).update({
          status: "paid",
          paid_at: isoNow(),
          updated_at: isoNow()
        });
        console.log("[Payment] Marked as paid:", paymentIntentId);
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Simulate payment success (for testing without actual PayMongo)
router.post("/simulate-success/:id", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.collection("payments").doc(req.params.id).update({
      status: "paid",
      paid_at: isoNow(),
      updated_at: isoNow(),
      simulated: true
    });
    
    console.log("[Payment] Simulated success:", req.params.id);
    res.json({ success: true, message: "Payment simulated successfully" });
  } catch (err) {
    console.error("Simulate payment error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
