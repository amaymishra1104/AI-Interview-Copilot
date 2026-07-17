const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { extractResumeContext } = require("../ai/resumeParser");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  }
});

router.post("/parse", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const data = await pdfParse(req.file.buffer);
    const userApiKey = req.body.userApiKey || null;
    const context = await extractResumeContext(data.text, userApiKey);
    res.json({ context });
  } catch (err) {
    console.error("Resume route error:", err.message);
    res.status(500).json({ error: "Failed to parse resume" });
  }
});

module.exports = router;
