// ============================ //  Backend Express + GitHub DB (Secure Version)
// ============================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { Buffer } from "buffer";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
app.use(express.json());

// ============================ //  Security: CORS STRICT
// ============================
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "password"],
}));

// ============================ //  Security: Rate Limit
// ============================
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Terlalu banyak request, coba lagi nanti!",
  })
);

// ============================ //  ENV CONFIG
// ============================
const ADMIN_PW = process.env.ADMIN_PW;
const G_OWNER = process.env.G_OWNER;
const G_REPO = process.env.G_REPO;
const G_TOKEN = process.env.G_TOKEN;
const G_FILE = process.env.G_FILE || "database.json";

if (!ADMIN_PW || !G_OWNER || !G_REPO || !G_TOKEN) {
  console.error("❌ ENV belum lengkap!");
  process.exit(1);
}

// ============================ //  FETCH DB FROM GITHUB
// ============================
async function fetchDB() {
  try {
    const url = `https://api.github.com/repos/${G_OWNER}/${G_REPO}/contents/${G_FILE}`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `token ${G_TOKEN}`,
        "User-Agent": "Secure-WA-Panel",
      },
    });

    const json = Buffer.from(data.content, "base64").toString("utf8");
    return { db: JSON.parse(json), sha: data.sha };
  } catch (e) {
    console.error("Gagal membaca DB:", e.message);
    return { db: { nomor: [] }, sha: null };
  }
}

// ============================ //  UPDATE DB TO GITHUB
// ============================
async function updateDB(newDB, sha) {
  const url = `https://api.github.com/repos/${G_OWNER}/${G_REPO}/contents/${G_FILE}`;

  await axios.put(
    url,
    {
      message: "Update nomor via Admin Panel",
      content: Buffer.from(JSON.stringify(newDB, null, 2)).toString("base64"),
      sha,
    },
    {
      headers: {
        Authorization: `token ${G_TOKEN}`,
        "User-Agent": "Secure-WA-Panel",
      },
    }
  );
}

// ============================ //  MIDDLEWARE PASSWORD + ANTI BRUTEFORCE
// ============================
function checkPW(req, res, next) {
  const pw = req.headers.password;

  setTimeout(() => {
    if (!pw) return res.status(401).send("Password diperlukan!");
    if (pw !== ADMIN_PW) return res.status(403).send("Password salah!");
    next();
  }, 250); // anti brute-force delay
}

// ============================ //  ROUTES
// ============================
app.get("/list", checkPW, async (req, res) => {
  const { db } = await fetchDB();
  res.json(db);
});

app.post("/add", checkPW, async (req, res) => {
  const num = req.body.number;
  if (!num) return res.send("Nomor kosong!");

  const { db, sha } = await fetchDB();

  if (db.nomor.includes(num)) return res.send("Nomor sudah ada!");

  db.nomor.push(num);
  await updateDB(db, sha);

  res.send("Nomor berhasil ditambah ✔");
});

app.post("/delete", checkPW, async (req, res) => {
  const num = req.body.number;
  if (!num) return res.send("Nomor kosong!");

  const { db, sha } = await fetchDB();

  db.nomor = db.nomor.filter((n) => n !== num);
  await updateDB(db, sha);

  res.send("Nomor dihapus ✔");
});

// ============================ //  START SERVER
// ============================
app.listen(3000, () => console.log("API Ready on port 3000 (Secure Mode)"));