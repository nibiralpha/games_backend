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
    res.status(500).json({ error: "Failed to extract games data" });
  }
});

app.get("/api/recent-games", async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        error: "start and end dates are required",
      });
    }

    const response = await fetch(
      `${BASEURL}/games?dates=${start},${end}&ordering=-added&page_size=20&key=${RAWG_KEY}`,
    );

    if (!response.ok) {
      throw new Error(`RAWG API responded with status: ${response.status}`);
    }

    const fullData = await response.json();

    res.json({
      data: fullData.results || [],
    });
  } catch (error) {
    console.error("RAWG Server Error:", error);

    res.status(500).json({
      error: "Failed to fetch recent games data",
    });
  }
});

app.get("/api/release-calendar", async (req, res) => {
  try {
    if (!RAWG_KEY) {
      return res.status(500).json({
        error: "RAWG_KEY is not configured",
      });
    }

    // -----------------------------------
    // Date formatter
    // -----------------------------------

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    // -----------------------------------
    // TODAY
    // -----------------------------------

    const today = new Date();

    const todayDate = formatDate(today);

    // -----------------------------------
    // LAST 60 DAYS
    // -----------------------------------

    const last60Date = new Date(today);

    last60Date.setDate(today.getDate() - 60);

    const last60FromDate = formatDate(last60Date);

    // -----------------------------------
    // NEXT 60 DAYS
    // -----------------------------------

    const next60Date = new Date(today);

    next60Date.setDate(today.getDate() + 60);

    const next60EndDate = formatDate(next60Date);

    // -----------------------------------
    // NEXT 365 DAYS
    // Used for Most Anticipated
    // -----------------------------------

    const anticipatedEndDate = new Date(today);

    anticipatedEndDate.setDate(today.getDate() + 365);

    const anticipatedEnd = formatDate(anticipatedEndDate);

    // -----------------------------------
    // LAST 60 DAYS URL
    // -----------------------------------

    const last60Url =
      `${BASEURL}/games` +
      `?dates=${last60FromDate},${todayDate}` +
      `&ordering=-released` +
      `&page_size=40` +
      `&key=${RAWG_KEY}`;

    // -----------------------------------
    // NEXT 60 DAYS URL
    // -----------------------------------

    const next60Url =
      `${BASEURL}/games` +
      `?dates=${todayDate},${next60EndDate}` +
      `&ordering=released` +
      `&page_size=40` +
      `&key=${RAWG_KEY}`;

    // -----------------------------------
    // MOST ANTICIPATED URL
    // -----------------------------------

    const anticipatedUrl =
      `${BASEURL}/games` +
      `?dates=${todayDate},${anticipatedEnd}` +
      `&ordering=-added` +
      `&page_size=20` +
      `&key=${RAWG_KEY}`;

    // -----------------------------------
    // Fetch all three at the same time
    // -----------------------------------

    const [
      last60Response,
      next60Response,
      anticipatedResponse,
    ] = await Promise.all([
      fetch(last60Url),
      fetch(next60Url),
      fetch(anticipatedUrl),
    ]);

    // -----------------------------------
    // Check API responses
    // -----------------------------------

    if (!last60Response.ok) {
      throw new Error(
        `RAWG Last 60 Days error: ${last60Response.status}`
      );
    }

    if (!next60Response.ok) {
      throw new Error(
        `RAWG Next 60 Days error: ${next60Response.status}`
      );
    }

    if (!anticipatedResponse.ok) {
      throw new Error(
        `RAWG Most Anticipated error: ${anticipatedResponse.status}`
      );
    }

    // -----------------------------------
    // Convert responses to JSON
    // -----------------------------------

    const last60Data = await last60Response.json();
    const next60Data = await next60Response.json();
    const anticipatedData = await anticipatedResponse.json();

    // -----------------------------------
    // Send response to frontend
    // -----------------------------------

    res.json({
      last60Days: {
        fromDate: last60FromDate,
        endDate: todayDate,
        data: last60Data.results || [],
      },

      next60Days: {
        fromDate: todayDate,
        endDate: next60EndDate,
        data: next60Data.results || [],
      },

      mostAnticipated: {
        fromDate: todayDate,
        endDate: anticipatedEnd,
        data: anticipatedData.results || [],
      },
    });
  } catch (error) {
    console.error("RAWG Release Calendar Error:", error);

    res.status(500).json({
      error: "Failed to fetch release calendar",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
