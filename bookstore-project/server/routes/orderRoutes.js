const express = require("express");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const {
  checkout,
  getOrders,
  getOrderItems,
} = require("../controllers/orderController");

const router = express.Router();

// CHECKOUT
router.post(
  "/checkout",
  authMiddleware,
  checkout
);

// GET USER ORDERS
router.get(
  "/orders",
  authMiddleware,
  getOrders
);

// GET ITEMS OF ONE ORDER
router.get(
  "/orders/:orderId/items",
  authMiddleware,
  getOrderItems
);

module.exports = router;