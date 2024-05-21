const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Sample data
const books = [
  { id: 1, title: "Book 1", author: "Author 1" },
  { id: 2, title: "Book 2", author: "Author 2" },
  { id: 3, title: "Book 3", author: "Author 3" },
];
const books2 = [
  { id: 1, title: "Book 1", author: "Author 1" },
];

// Routes
app.get("/api", (req, res) => {
  res.json(books);
});
app.get("/", (req, res) => {
  res.json(books2);
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
