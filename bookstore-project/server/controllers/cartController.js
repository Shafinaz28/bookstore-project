const pool = require("../config/db");

// ADD TO CART
const addToCart = async (req, res) => {
  try {
    const { book_id, quantity } = req.body;
    const user_id = req.user.id;

    const quantityNumber = Number(quantity);

    // VALIDATE INPUT
    if (
      !book_id ||
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return res.status(400).json({
        message: "Valid book_id and quantity are required",
      });
    }

    // CHECK IF BOOK EXISTS
    const bookResult = await pool.query(
      `
      SELECT id, title, stock
      FROM books
      WHERE id = $1
      `,
      [book_id]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    const book = bookResult.rows[0];

    // CHECK STOCK
    if (book.stock <= 0) {
      return res.status(400).json({
        message: "Book is out of stock",
      });
    }

    // CHECK CURRENT CART QUANTITY
    const cartResult = await pool.query(
      `
      SELECT quantity
      FROM cart
      WHERE user_id = $1
      AND book_id = $2
      `,
      [user_id, book_id]
    );

    const currentQuantity =
      cartResult.rows.length > 0
        ? cartResult.rows[0].quantity
        : 0;

    const newQuantity =
      currentQuantity + quantityNumber;

    // CHECK TOTAL QUANTITY AGAINST STOCK
    if (newQuantity > book.stock) {
      return res.status(400).json({
        message: `Only ${book.stock} copies available`,
        available_stock: book.stock,
        current_cart_quantity: currentQuantity,
      });
    }

    // ADD OR UPDATE CART
    const result = await pool.query(
      `
      INSERT INTO cart
      (user_id, book_id, quantity)

      VALUES ($1, $2, $3)

      ON CONFLICT (user_id, book_id)

      DO UPDATE
      SET quantity = EXCLUDED.quantity

      RETURNING *
      `,
      [
        user_id,
        book_id,
        newQuantity,
      ]
    );

    return res.status(201).json({
      message: "Cart updated successfully",
      cart: result.rows[0],
    });

  } catch (error) {
    console.error("ADD TO CART ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// GET CART
const getCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    console.log("LOGGED IN USER ID:", user_id);
console.log("JWT USER:", req.user);

    const result = await pool.query(
      `
      SELECT
        cart.id,
        cart.quantity,
        books.id AS book_id,
        books.title,
        books.author,
        books.price,
        books.image_url

      FROM cart

      JOIN books
      ON cart.book_id = books.id

      WHERE cart.user_id = $1
      `,
      [user_id]
    );

    res.status(200).json({
      message: "Cart fetched successfully",
      cart: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// UPDATE CART QUANTITY
const updateCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const user_id = req.user.id;
    const quantityNumber = Number(quantity);

    // VALIDATE QUANTITY
    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return res.status(400).json({
        message: "Quantity must be a positive whole number",
      });
    }

    // FIND CART ITEM + BOOK STOCK
    const cartItemResult = await pool.query(
      `
      SELECT
        cart.id,
        cart.book_id,
        books.title,
        books.stock

      FROM cart

      JOIN books
      ON cart.book_id = books.id

      WHERE cart.id = $1
      AND cart.user_id = $2
      `,
      [id, user_id]
    );

    if (cartItemResult.rows.length === 0) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    const cartItem = cartItemResult.rows[0];

    // CHECK STOCK
    if (quantityNumber > cartItem.stock) {
      return res.status(400).json({
        message: `Only ${cartItem.stock} copies available`,
        available_stock: cartItem.stock,
      });
    }

    // UPDATE CART
    const result = await pool.query(
      `
      UPDATE cart

      SET quantity = $1

      WHERE id = $2
      AND user_id = $3

      RETURNING *
      `,
      [
        quantityNumber,
        id,
        user_id,
      ]
    );

    return res.status(200).json({
      message: "Cart updated successfully",
      cart: result.rows[0],
    });

  } catch (error) {
    console.error("UPDATE CART ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// DELETE CART ITEM
const deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;

    const user_id = req.user.id;

    const result = await pool.query(
      `
      DELETE FROM cart

      WHERE id = $1
      AND user_id = $2

      RETURNING *
      `,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    res.status(200).json({
      message: "Cart item removed successfully",
      cart: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCart,
  deleteCartItem,
};