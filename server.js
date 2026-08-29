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

    const filename =
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 10) +
      ext;

    cb(null, filename);
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

app.use(
  express.static(path.join(__dirname, "public"))
);

app.use(
  "/uploads",
  express.static(uploadDir)
);

let running = false;
let startedAt = null;
let lastUpload = null;


// HOME
app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});


// UPLOAD
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

      const fileUrl =
        `${baseUrl}/uploads/${encodeURIComponent(
          req.file.filename
        )}`;

      let text = null;

      const name =
        req.file.originalname.toLowerCase();

      const isText =
        req.file.mimetype.startsWith("text/") ||
        name.endsWith(".txt") ||
        name.endsWith(".csv") ||
        name.endsWith(".json");

      if (isText) {
        text = fs.readFileSync(
          req.file.path,
          "utf8"
        );
      }

      const isImage =
        req.file.mimetype.startsWith("image/");

      lastUpload = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        text: text,
        isImage: isImage,
        uploadedAt: Date.now()
      };

      console.log(
        "Uploaded:",
        req.file.originalname
      );

      res.json({
        success: true,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        text: text,
        isImage: isImage
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


// START
app.post("/api/start", (req, res) => {

  running = true;
  startedAt = Date.now();

  res.json({
    success: true,
    message: "Test server started."
  });

});


// STOP
app.post("/api/stop", (req, res) => {

  running = false;
  startedAt = null;

  res.json({
    success: true,
    message: "Test server stopped."
  });

});


// STATUS
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


// LAST UPLOAD
app.get("/api/last-upload", (req, res) => {

  res.json({
    success: true,
    upload: lastUpload
  });

});


// HEALTH
app.get("/health", (req, res) => {

  res.json({
    online: true,
    service: "EXIT ARMAN INSIDE"
  });

});


// FACEBOOK WEBHOOK VERIFY
app.get("/webhook", (req, res) => {

  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.VERIFY_TOKEN
  ) {

    return res
      .status(200)
      .send(challenge);

  }

  return res.sendStatus(403);
});


// FACEBOOK WEBHOOK EVENT
app.post("/webhook", (req, res) => {

  console.log(
    "Webhook event:",
    JSON.stringify(
      req.body,
      null,
      2
    )
  );

  res.sendStatus(200);

});


// SERVER
app.listen(PORT, () => {

  console.log(
    `EXIT ARMAN INSIDE running on port ${PORT}`
  );

});
