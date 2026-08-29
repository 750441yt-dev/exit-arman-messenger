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
      Math.random().toString(36).substring(2, 9) +
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

app.use(
  "/uploads",
  express.static(uploadDir)
);

let running = false;
let startedAt = null;

let lastUpload = null;


// ================================
// HOME
// ================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});


// ================================
// UPLOAD
// ================================

app.post(
  "/api/upload",
  upload.single("file"),
  async (req, res) => {

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
        `${baseUrl}/uploads/${encodeURIComponent(
          req.file.filename
        )}`;

      const mime =
        req.file.mimetype || "";

      let text = null;

      // ----------------------------
      // TEXT FILE
      // ----------------------------

      if (
        mime.startsWith("text/") ||
        req.file.originalname.endsWith(".txt") ||
        req.file.originalname.endsWith(".csv") ||
        req.file.originalname.endsWith(".json")
      ) {

        text = fs.readFileSync(
          req.file.path,
          "utf8"
        );

      }

      // ----------------------------
      // IMAGE
      // ----------------------------

      const isImage =
        mime.startsWith("image/");

      lastUpload = {
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        mimetype: mime,
        size: req.file.size,
        url: fileUrl,
        text: text,
        isImage: isImage,
        uploadedAt: new Date().toISOString()
      };

      console.log(
        "FILE UPLOADED:",
        lastUpload.filename
      );

      res.json({
        success: true,
        filename: req.file.originalname,
        mimetype: mime,
        size: req.file.size,
        url: fileUrl,
        isImage: isImage,
        text: text
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


// ================================
// LAST UPLOAD
// ================================

app.get("/api/last-upload", (req, res) => {

  res.json({
    success: true,
    upload: lastUpload
  });

});


// ================================
// START
// ================================

app.post("/api/start", (req, res) => {

  running = true;
  startedAt = Date.now();

  res.json({
    success: true,
    message: "Server started."
  });

});


// ================================
// STOP
// ================================

app.post("/api/stop", (req, res) => {

  running = false;
  startedAt = null;

  res.json({
    success: true,
    message: "Server stopped."
  });

});


// ================================
// STATUS
// ================================

app.get("/api/status", (req, res) => {

  res.json({
    running: running,
    startedAt: startedAt,
    uptime:
      running && startedAt
        ? Date.now() - startedAt
        : 0
  });

});


// ================================
// FACEBOOK WEBHOOK
// ================================

app.get("/webhook", (req, res) => {

  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.VERIFY_TOKEN
  ) {

    console.log(
      "Facebook webhook verified."
    );

    return res
      .status(200)
      .send(challenge);

  }

  res.sendStatus(403);

});


// ================================
// FACEBOOK EVENTS
// ================================

app.post("/webhook", (req, res) => {

  console.log(
    "Facebook webhook event:"
  );

  console.log(
    JSON.stringify(
      req.body,
      null,
      2
    )
  );

  res.sendStatus(200);

});


// ================================
// HEALTH
// ================================

app.get("/health", (req, res) => {

  res.json({
    online: true,
    service: "EXIT ARMAN Messenger Server"
  });

});


// ================================
// START SERVER
// ================================

app.listen(PORT, () => {

  console.log(
    `EXIT ARMAN server running on port ${PORT}`
  );

});
