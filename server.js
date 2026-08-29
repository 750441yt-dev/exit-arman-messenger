const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName =
      Date.now() + "-" +
      Math.random().toString(36).substring(2, 10) +
      ext;

    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(uploadDir));

let running = false;
let startedAt = null;

// ============================
// HOME
// ============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================
// FILE UPLOAD
// ============================

app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "File select nahi ki gayi."
      });
    }

    const baseUrl =
      `${req.protocol}://${req.get("host")}`;

    const fileUrl =
      `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`;

    console.log("New file uploaded:", fileUrl);

    res.json({
      success: true,
      filename: req.file.originalname,
      url: fileUrl
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Upload failed."
    });
  }
});

// ============================
// START SERVER STATUS
// ============================

app.post("/api/start", (req, res) => {

  running = true;
  startedAt = Date.now();

  res.json({
    success: true,
    message: "Automation server started."
  });
});

// ============================
// STOP
// ============================

app.post("/api/stop", (req, res) => {

  running = false;
  startedAt = null;

  res.json({
    success: true,
    message: "Automation stopped."
  });
});

// ============================
// STATUS
// ============================

app.get("/api/status", (req, res) => {

  res.json({
    running,
    startedAt,
    uptime:
      running && startedAt
        ? Date.now() - startedAt
        : 0
  });
});

// ============================
// FACEBOOK WEBHOOK VERIFY
// ============================

app.get("/webhook", (req, res) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.VERIFY_TOKEN
  ) {
    console.log("Facebook webhook verified.");

    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ============================
// FACEBOOK WEBHOOK EVENTS
// ============================

app.post("/webhook", (req, res) => {

  console.log(
    "Facebook event:",
    JSON.stringify(req.body, null, 2)
  );

  res.sendStatus(200);
});

// ============================
// HEALTH CHECK
// ============================

app.get("/health", (req, res) => {

  res.json({
    online: true,
    service: "EXIT ARMAN Messenger Server"
  });
});

// ============================
// SERVER
// ============================

app.listen(PORT, () => {

  console.log(
    `EXIT ARMAN server running on port ${PORT}`
  );

});
