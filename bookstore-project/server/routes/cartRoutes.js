const express = require("express");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const {
  addToCart,
  getCart,
  updateCart,
  deleteCartItem,
} = require("../controllers/cartController");

const router = express.Router();

// ADD TO CART
router.post(
  "/",
  authMiddleware,
  addToCart
);

// GET CART
router.get(
  "/",
  authMiddleware,
  getCart
);

// UPDATE CART
router.put(
  "/:id",
  authMiddleware,
  updateCart
);

// DELETE CART ITEM
router.delete(
  "/:id",
  authMiddleware,
  deleteCartItem
);

module.exports = router;