const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db"); // Import DB 

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    const allowed = [
      "http://localhost:3000",
      "https://ai-interview-platform-nr7v.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (allowed.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));
app.use(express.json());

// Connect Server to MongoDB
connectDB();

const interviewRoute = require("./routes/interview");
const mentorRoute = require("./routes/mentor");
const resumeRoute = require("./routes/resume");
const coachRoute = require("./routes/coach");
app.use("/interview", interviewRoute);
app.use("/mentor", mentorRoute);
app.use("/resume", resumeRoute);
app.use("/coach", coachRoute);

app.get("/", (req, res) => {
  res.send("NEXUS.AI API + MongoDB Running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
