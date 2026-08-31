import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const BASEURL = "https://api.rawg.io/api";
const RAWG_KEY = process.env.KEY;

// Enable CORS middleware so your React frontend can read this data without errors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

// Endpoint to fetch Deezer charts
app.get("/api/trending", async (req, res) => {
  try {
    // Fetch global charts directly from Deezer on the server side
    const response = await fetch(
      BASEURL + "/games?ordering=-added&page_size=20&key=" + RAWG_KEY,
    );
    if (!response.ok) {
      throw new Error(`Deezer API responded with status: ${response.status}`);
    }

    const fullData = await response.json();

    // Extract ONLY the tracks node object safely
    const data = fullData.results || { data: [] };

    // Return the specific track payload object matching your exact requirements
    res.json({
      data: data,
    });
  } catch (error) {
    console.error("Deezer Server Error:", error);
    res
      .status(500)
      .json({ error: "Failed to extract games data" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
