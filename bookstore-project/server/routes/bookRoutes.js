const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require("../controllers/bookController");

const router = express.Router();

// PUBLIC ROUTES
router.get("/", getBooks);
router.get("/:id", getBookById);

// ADMIN ONLY ROUTES
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createBook
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  updateBook
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteBook
);

module.exports = router;