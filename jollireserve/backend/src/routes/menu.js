const express = require("express");
const { getDb } = require("../firebase");
const { v4: uuid } = require("uuid");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Helper for ISO timestamp
function isoNow() {
  return new Date().toISOString();
}

// Get all menu items (public - for customers)
router.get("/items", async (req, res) => {
  try {
    const db = getDb();
    // Try with ordering first, fall back to simple query if index missing
    let snapshot;
    try {
      snapshot = await db.collection("menu_items")
        .where("is_available", "==", true)
        .orderBy("category")
        .orderBy("name")
        .get();
    } catch (indexErr) {
      console.warn("[Menu] Index missing, using fallback query:", indexErr.message);
      // Fallback: get all and filter/sort in memory
      const allSnapshot = await db.collection("menu_items").get();
      const items = allSnapshot.docs
        .map(doc => doc.data())
        .filter(item => item.is_available)
        .sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return a.name.localeCompare(b.name);
        });
      return res.json({ items });
    }
    
    const items = snapshot.docs.map(doc => doc.data());
    res.json({ items });
  } catch (err) {
    console.error("Menu items error:", err.message);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Admin: Get all menu items (including unavailable)
router.get("/admin/items", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("menu_items")
      .orderBy("category")
      .orderBy("name")
      .get();
    
    const items = snapshot.docs.map(doc => doc.data());
    res.json({ items });
  } catch (err) {
    console.error("Admin menu items error:", err.message);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// Admin: Add menu item
router.post("/admin/items", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;
    
    if (!name || !price || !category) {
      return res.status(400).json({ error: "Name, price, and category are required" });
    }

    const db = getDb();
    const id = uuid();
    const itemData = {
      id,
      name,
      description: description || "",
      price: Number(price),
      category,
      image_url: image_url || "",
      is_available: true,
      created_at: isoNow(),
      updated_at: isoNow(),
      created_by: req.user.id,
      created_by_name: req.user.name || req.user.email
    };

    await db.collection("menu_items").doc(id).set(itemData);
    console.log("[Menu] Created item:", id, name);
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: req.user.id,
      action: "menu_item_created",
      details: { item_id: id, name, price, category },
      created_at: isoNow()
    });
    
    res.json({ item: itemData });
  } catch (err) {
    console.error("Create menu item error:", err.message);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

// Admin: Update menu item
router.patch("/admin/items/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, description, price, category, image_url, is_available } = req.body;
    const db = getDb();
    
    // Get current item for logging
    const currentDoc = await db.collection("menu_items").doc(req.params.id).get();
    const currentItem = currentDoc.exists ? currentDoc.data() : { name: "Unknown" };
    
    const updateData = {
      updated_at: isoNow(),
      updated_by: req.user.id,
      updated_by_name: req.user.name || req.user.email
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_available !== undefined) updateData.is_available = is_available;

    await db.collection("menu_items").doc(req.params.id).update(updateData);
    console.log("[Menu] Updated item:", req.params.id);
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: req.user.id,
      action: "menu_item_updated",
      details: { 
        item_id: req.params.id, 
        name: name || currentItem.name,
        changes: Object.keys(req.body).join(", ")
      },
      created_at: isoNow()
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error("Update menu item error:", err.message);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

// Admin: Delete menu item
router.delete("/admin/items/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const db = getDb();
    
    // Get item name before deleting for logging
    const doc = await db.collection("menu_items").doc(req.params.id).get();
    const itemName = doc.exists ? doc.data().name : "Unknown";
    
    await db.collection("menu_items").doc(req.params.id).delete();
    console.log("[Menu] Deleted item:", req.params.id);
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: req.user.id,
      action: "menu_item_deleted",
      details: { item_id: req.params.id, name: itemName },
      created_at: isoNow()
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete menu item error:", err.message);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

module.exports = router;
