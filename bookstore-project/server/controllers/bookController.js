const pool = require("../config/db");

// VALIDATE BOOK DATA
const validateBook = ({
  title,
  author,
  price,
  stock,
}) => {
  if (!title || !author || price === undefined || stock === undefined) {
    return "Title, author, price and stock are required";
  }

  if (Number(price) <= 0) {
    return "Price must be greater than 0";
  }

  if (Number(stock) < 0) {
    return "Stock cannot be negative";
  }

  return null;
};


// CREATE BOOK
const createBook = async (req, res) => {
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

    // VALIDATE BOOK
    const validationError = validateBook({
      title,
      author,
      price,
      stock,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO books
      (title, author, description, price, stock, category, image_url)

      VALUES ($1, $2, $3, $4, $5, $6, $7)

      RETURNING *
      `,
      [
        title,
        author,
        description,
        price,
        stock,
        category,
        image_url,
      ]
    );

    return res.status(201).json({
      message: "Book Added Successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error("CREATE BOOK ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// GET ALL BOOKS + SEARCH + CATEGORY + PRICE + SORT + PAGINATION
const getBooks = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    const minPriceValue =
      minPrice !== undefined ? Number(minPrice) : null;

    const maxPriceValue =
      maxPrice !== undefined ? Number(maxPrice) : null;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      minPriceValue !== null &&
      (Number.isNaN(minPriceValue) || minPriceValue < 0)
    ) {
      return res.status(400).json({
        message: "Invalid minimum price",
      });
    }

    if (
      maxPriceValue !== null &&
      (Number.isNaN(maxPriceValue) || maxPriceValue < 0)
    ) {
      return res.status(400).json({
        message: "Invalid maximum price",
      });
    }

    if (
      minPriceValue !== null &&
      maxPriceValue !== null &&
      minPriceValue > maxPriceValue
    ) {
      return res.status(400).json({
        message: "Minimum price cannot be greater than maximum price",
      });
    }

    if (
      Number.isNaN(pageNumber) ||
      pageNumber < 1
    ) {
      return res.status(400).json({
        message: "Page must be greater than 0",
      });
    }

    if (
      Number.isNaN(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        message: "Limit must be between 1 and 100",
      });
    }

    let orderBy = "id DESC";

    if (sort === "price_asc") {
      orderBy = "price ASC";
    } else if (sort === "price_desc") {
      orderBy = "price DESC";
    } else if (sort === "newest") {
      orderBy = "id DESC";
    } else if (sort === "oldest") {
      orderBy = "id ASC";
    } else {
      return res.status(400).json({
        message: "Invalid sort option",
      });
    }

    const offset = (pageNumber - 1) * limitNumber;

    const values = [
      `%${search}%`,
      category ? `%${category}%` : "",
      minPriceValue,
      maxPriceValue,
    ];

    const whereClause = `
      WHERE
        (
          title ILIKE $1
          OR author ILIKE $1
        )

      AND
        (
          $2 = ''
          OR category ILIKE $2
        )

      AND
        (
          $3::numeric IS NULL
          OR price >= $3::numeric
        )

      AND
        (
          $4::numeric IS NULL
          OR price <= $4::numeric
        )
    `;

    // GET TOTAL NUMBER OF MATCHING BOOKS
    const countResult = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM books
      ${whereClause}
      `,
      values
    );

    const totalBooks = Number(
      countResult.rows[0].total
    );

    const totalPages = Math.ceil(
      totalBooks / limitNumber
    );

    // GET BOOKS FOR CURRENT PAGE
    const result = await pool.query(
      `
      SELECT *
      FROM books

      ${whereClause}

      ORDER BY ${orderBy}

      LIMIT $5
      OFFSET $6
      `,
      [
        ...values,
        limitNumber,
        offset,
      ]
    );

    return res.status(200).json({
      message: "Books fetched successfully",

      books: result.rows,

      pagination: {
        currentPage: pageNumber,
        limit: limitNumber,
        totalBooks,
        totalPages,
      },
    });

  } catch (error) {
    console.error("GET BOOKS ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// GET SINGLE BOOK
const getBookById = async (req, res) => {
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

    return res.status(200).json({
      message: "Book fetched successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error("GET BOOK ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};


// UPDATE BOOK
const updateBook = async (req, res) => {
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

    // VALIDATE BOOK
    const validationError = validateBook({
      title,
      author,
      price,
      stock,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const result = await pool.query(
      `
      UPDATE books

      SET
        title = $1,
        author = $2,
        description = $3,
        price = $4,
        stock = $5,
        category = $6,
        image_url = $7

      WHERE id = $8

      RETURNING *
      `,
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

    return res.status(200).json({
      message: "Book Updated Successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error("UPDATE BOOK ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};


// DELETE BOOK
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM books
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(200).json({
      message: "Book Deleted Successfully",
      book: result.rows[0],
    });

  } catch (error) {
    console.error("DELETE BOOK ERROR:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};


module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
};