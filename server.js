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

    const name =
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 9) +
      ext;

    cb(null, name);
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

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

let running = false;
let startedAt = null;
let lastUpload = null;
let targetUrl = "";

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/start", (req, res) => {

  const url = String(req.body.url || "").trim();

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL enter karo."
    });
  }

  running = true;
  startedAt = Date.now();
  targetUrl = url;

  res.json({
    success: true,
    message: "Server started.",
    url: targetUrl
  });
});

app.post("/api/stop", (req, res) => {

  running = false;
  startedAt = null;

  res.json({
    success: true,
    message: "Server stopped."
  });
});

app.get("/api/status", (req, res) => {

  res.json({
    running,
    startedAt,
    targetUrl,
    uptime:
      running && startedAt
        ? Date.now() - startedAt
        : 0
  });
});

app.post(
  "/api/upload",
  upload.single("file"),
  (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "File select nahi ki gayi."
        });
      }

      const baseUrl =
        `${req.protocol}://${req.get("host")}`;

      const url =
        `${baseUrl}/uploads/${encodeURIComponent(
          req.file.filename
        )}`;

      let text = null;

      const name =
        req.file.originalname.toLowerCase();

      if (
        req.file.mimetype.startsWith("text/") ||
        name.endsWith(".txt") ||
        name.endsWith(".csv") ||
        name.endsWith(".json")
      ) {
        text = fs.readFileSync(
          req.file.path,
          "utf8"
        );
      }

      const isImage =
        req.file.mimetype.startsWith("image/");

      lastUpload = {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url,
        text,
        isImage,
        uploadedAt: Date.now()
      };

      res.json({
        success: true,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url,
        text,
        isImage
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: "Upload failed."
      });
    }
  }
);

app.get("/api/last-upload", (req, res) => {
  res.json({
    success: true,
    upload: lastUpload
  });
});

app.get("/health", (req, res) => {
  res.json({
    online: true,
    service: "EXIT ARMAN"
  });
});

app.listen(PORT, () => {
  console.log(
    `EXIT ARMAN running on port ${PORT}`
  );
});
