const express = require("express");
const pool = require("./config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Book Store Backend 🚀");
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [name, email, hashedPassword];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "User Registered Successfully",
      user: result.rows[0],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login Successful",
      token,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.post("/books", async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      price,
      stock,
      category,
      image_url,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO books
      (title, author, description, price, stock, category, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [title, author, description, price, stock, category, image_url]
    );

    res.status(201).json({
      message: "Book Added Successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.get("/books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books");

    res.status(200).json({
      message: "Books fetched successfully",
      books: result.rows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.get("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM books WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    res.status(200).json({
      message: "Book fetched successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.put("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      author,
      description,
      price,
      stock,
      category,
      image_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE books
       SET title = $1,
           author = $2,
           description = $3,
           price = $4,
           stock = $5,
           category = $6,
           image_url = $7
       WHERE id = $8
       RETURNING *`,
      [
        title,
        author,
        description,
        price,
        stock,
        category,
        image_url,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    res.status(200).json({
      message: "Book Updated Successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.delete("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM books WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    res.status(200).json({
      message: "Book Deleted Successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.post("/cart", async (req, res) => {
  try {
    const { user_id, book_id, quantity } = req.body;

    const result = await pool.query(
      `INSERT INTO cart (user_id, book_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, book_id, quantity]
    );

    res.status(201).json({
      message: "Book added to cart successfully",
      cart: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.get("/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

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
      [userId]
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
});

app.put("/cart/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const result = await pool.query(
      `UPDATE cart
       SET quantity = $1
       WHERE id = $2
       RETURNING *`,
      [quantity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    res.status(200).json({
      message: "Cart updated successfully",
      cart: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.post("/checkout", async (req, res) => {
  try {
    const { user_id, total_amount } = req.body;

    const result = await pool.query(
      `INSERT INTO orders (user_id, total_amount)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, total_amount]
    );

    res.status(201).json({
      message: "Order created successfully",
      order: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

app.post("/order-items", async (req, res) => {
  try {
    const { order_id, book_id, quantity, price } = req.body;

    const result = await pool.query(
      `INSERT INTO order_items
      (order_id, book_id, quantity, price)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [order_id, book_id, quantity, price]
    );

    res.status(201).json({
      message: "Order Item Added Successfully",
      orderItem: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

module.exports = app;