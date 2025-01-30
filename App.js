const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = "secret_key"; // Store in ENV file for security

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/nearby_market", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log(" MongoDB connection error:", err));

// ============================
//  SCHEMAS & MODELS
// ============================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  image: String,
});
const Category = mongoose.model("Category", categorySchema);

// Product Schema
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  condition: String,
  location: String,
  contact: String,
  delivery: String,
  images: [String],
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.model("Product", productSchema);

// ============================
//  MIDDLEWARE FOR AUTH
// ============================

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied. No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ============================
//  AUTH ROUTES
// ============================

// User Signup
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "24h" });

    res.status(200).json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// ============================
//  CATEGORY ROUTES
// ============================

// Get all categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error });
  }
});

// Get a specific category
app.get("/api/categories/:name", async (req, res) => {
  try {
    const category = await Category.findOne({ name: req.params.name });
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error fetching category", error });
  }
});

// Add a new category
app.post("/api/categories", authMiddleware, async (req, res) => {
  console.log("POST /api/categories hit");
  try {
    const { name, description, image } = req.body;
    console.log("Request Body:", { name, description, image });

    const newCategory = new Category({ name, description, image });
    await newCategory.save();

    res.status(201).json({ message: "Category created successfully", category: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Error creating category", error });
  }
});

// ============================
//  PRODUCT ROUTES
// ============================

// Add a new product (Protected)
app.post("/api/products", authMiddleware, async (req, res) => {
  try {
    const { title, category, price, description, condition, location, contact, delivery, images } = req.body;

    // Check if category exists
    const categoryExists = await Category.findOne({ name: category });
    if (!categoryExists) return res.status(400).json({ message: "Invalid category" });

    const newProduct = new Product({ title, category, price, description, condition, location, contact, delivery, images });
    await newProduct.save();

    res.status(201).json({ message: "Product listed successfully", product: newProduct });
  } catch (error) {
    res.status(500).json({ message: "Error adding product", error });
  }
});

// Get products by category
// Assuming all previous code in app.js is correct, but here’s the key part for the product route:

app.get("/api/products/category/:category", async (req, res) => {
  try {
    // Ensure the category parameter is being passed correctly
    const categoryName = req.params.category;
    const products = await Product.find({ category: categoryName });

    if (products.length === 0) {
      return res.status(404).json({ message: `No products found in category: ${categoryName}` });
    }
    
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products", error });
  }
});


// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
});

// Get a specific product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
});

// Delete a product (Protected)
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error });
  }
});

// ============================
//  START SERVER
// ============================
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
