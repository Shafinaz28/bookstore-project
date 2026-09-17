const pool = require("../config/db");

// CHECKOUT
const checkout = async (req, res) => {
  const client = await pool.connect();

  try {
    const user_id = req.user.id;

    await client.query("BEGIN");

    // FETCH USER CART
    const cartResult = await client.query(
      `
      SELECT
        cart.id,
        cart.user_id,
        cart.book_id,
        cart.quantity,
        books.title,
        books.price,
        books.stock

      FROM cart

      JOIN books
      ON cart.book_id = books.id

      WHERE cart.user_id = $1
      `,
      [user_id]
    );

    const cartItems = cartResult.rows;

    // CHECK EMPTY CART
    if (cartItems.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    // CHECK STOCK
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: `Not enough stock for ${item.title}`,
          available_stock: item.stock,
          requested_quantity: item.quantity,
        });
      }
    }

    // CALCULATE TOTAL AMOUNT
    let totalAmount = 0;

    for (const item of cartItems) {
      totalAmount +=
        Number(item.price) * item.quantity;
    }

    // CREATE ORDER
    const orderResult = await client.query(
      `
      INSERT INTO orders
      (user_id, total_amount)

      VALUES ($1, $2)

      RETURNING *
      `,
      [user_id, totalAmount]
    );

    const order = orderResult.rows[0];

    // CREATE ORDER ITEMS
    for (const item of cartItems) {
      await client.query(
        `
        INSERT INTO order_items
        (order_id, book_id, quantity, price)

        VALUES ($1, $2, $3, $4)
        `,
        [
          order.id,
          item.book_id,
          item.quantity,
          item.price,
        ]
      );

      // REDUCE BOOK STOCK
      await client.query(
        `
        UPDATE books

        SET stock = stock - $1

        WHERE id = $2
        `,
        [
          item.quantity,
          item.book_id,
        ]
      );
    }

    // CLEAR USER CART
    await client.query(
      `
      DELETE FROM cart

      WHERE user_id = $1
      `,
      [user_id]
    );

    // SAVE EVERYTHING
    await client.query("COMMIT");

    res.status(201).json({
      message: "Checkout completed successfully",
      order,
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      message: "Checkout failed",
    });

  } finally {

    client.release();

  }
};


// GET LOGGED-IN USER ORDERS
const getOrders = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `
      SELECT *

      FROM orders

      WHERE user_id = $1

      ORDER BY created_at DESC
      `,
      [user_id]
    );

    res.status(200).json({
      message: "Orders fetched successfully",
      orders: result.rows,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });

  }
};


// GET ITEMS INSIDE ONE ORDER
const getOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;

    const user_id = req.user.id;

    const result = await pool.query(
      `
      SELECT
        order_items.id,
        books.title,
        books.author,
        order_items.quantity,
        order_items.price

      FROM order_items

      JOIN books
      ON order_items.book_id = books.id

      JOIN orders
      ON order_items.order_id = orders.id

      WHERE order_items.order_id = $1
      AND orders.user_id = $2
      `,
      [
        orderId,
        user_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found or access denied",
      });
    }

    res.status(200).json({
      message: "Order Items fetched successfully",
      items: result.rows,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });

  }
};


module.exports = {
  checkout,
  getOrders,
  getOrderItems,
};