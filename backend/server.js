const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================
   Servir FRONTEND pelo backend
   ========================= */
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_PATH));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

/* =========================
   Arquivo simples pra salvar inscritos
   ========================= */
const SUBS_PATH = path.join(__dirname, "data", "subscribers.json");

function ensureSubsFile() {
  fs.mkdirSync(path.dirname(SUBS_PATH), { recursive: true });

  if (!fs.existsSync(SUBS_PATH)) {
    fs.writeFileSync(SUBS_PATH, JSON.stringify({ subscribers: [] }, null, 2), "utf-8");
    return;
  }

  // compat: se o arquivo antigo era array puro, converte
  try {
    const raw = fs.readFileSync(SUBS_PATH, "utf-8");
    const parsed = JSON.parse(raw || "{}");

    if (Array.isArray(parsed)) {
      fs.writeFileSync(SUBS_PATH, JSON.stringify({ subscribers: parsed }, null, 2), "utf-8");
      return;
    }

    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.subscribers)) {
      fs.writeFileSync(SUBS_PATH, JSON.stringify({ subscribers: [] }, null, 2), "utf-8");
    }
  } catch {
    fs.writeFileSync(SUBS_PATH, JSON.stringify({ subscribers: [] }, null, 2), "utf-8");
  }
}

function readSubsList() {
  ensureSubsFile();
  const db = JSON.parse(fs.readFileSync(SUBS_PATH, "utf-8"));
  return db.subscribers || [];
}

function saveSubsList(list) {
  ensureSubsFile();
  fs.writeFileSync(SUBS_PATH, JSON.stringify({ subscribers: list }, null, 2), "utf-8");
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================
   Email transporter
   ========================= */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =========================
   Conteúdo do e-mail
   ========================= */
function buildWelcomeEmail({ name, lang }) {
  const firstName = name ? name.trim().split(/\s+/)[0] : "";
  const isEN = lang === "en";

  const book = {
    pt: {
      month: "Janeiro",
      title: "Noites Brancas",
      author: "Fiódor Dostoiévski",
      line: "Uma leitura sensível e introspectiva sobre encontros breves, solidão e a esperança silenciosa de ser amado.",
      questions: [
        "Você considera o narrador um sonhador ou alguém em fuga da realidade?",
        "A solidão apresentada no livro é escolhida ou imposta?",
        "O final trouxe conforto ou melancolia para você?",
      ],
      highlights:
        "Clássicos: Frankenstein, Crime e Castigo. Romance: Flores para Algernon. Terror: It, Misery.",
    },
    en: {
      month: "January",
      title: "White Nights",
      author: "Fyodor Dostoevsky",
      line: "A sensitive and introspective story about brief encounters, loneliness, and the quiet hope of being loved.",
      questions: [
        "Do you see the narrator as a dreamer, or someone escaping reality?",
        "Is the loneliness in the story chosen, or imposed?",
        "Did the ending feel comforting, or melancholic to you?",
      ],
      highlights:
        "Classics: Frankenstein, Crime and Punishment. Romance: Flowers for Algernon. Horror: It, Misery.",
    },
  };

  const content = isEN ? book.en : book.pt;

  const greeting = isEN
    ? (firstName ? `Hi, ${firstName}!` : "Hi!")
    : (firstName ? `Oi, ${firstName}!` : "Oi!");

  const subject = isEN
    ? "Welcome to Casa da Leitura ✨"
    : "Bem-vinda à Casa da Leitura ✨";

  const text = isEN
    ? `${greeting}

Welcome to Casa da Leitura. I’m glad you’re here.

Book of the month: ${content.title} (${content.author})
${content.line}

Discussion questions
1) ${content.questions[0]}
2) ${content.questions[1]}
3) ${content.questions[2]}

Highlights and previous picks
${content.highlights}

With care,
Casa da Leitura ©
`
    : `${greeting}

Boas-vindas à Casa da Leitura. Que bom ter você por aqui.

Livro do mês: ${content.title} (${content.author})
${content.line}

Perguntas para discussão
1) ${content.questions[0]}
2) ${content.questions[1]}
3) ${content.questions[2]}

Destaques e leituras anteriores
${content.highlights}

Com carinho,
Casa da Leitura ©
`;

  const nameLine = firstName ? `, ${firstName}` : "";

  const html = `
  <div style="font-family: Georgia, 'Times New Roman', serif; background:#f6f1ea; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#fff7f0; border-radius:18px; padding:28px; border:1px solid rgba(0,0,0,.06);">
      <h1 style="margin:0 0 10px; font-size:28px; color:#1f1f1f;">
        ${isEN ? "Welcome to Casa da Leitura" : "Bem-vinda à Casa da Leitura"}${nameLine}
      </h1>

      <p style="margin:0 0 14px; color:#2a2a2a; line-height:1.6;">
        ${
          isEN
            ? "I’m glad you’re here. A space to read without rushing, share impressions, and let stories stay."
            : "Que bom ter você por aqui. Um espaço para ler sem pressa, trocar impressões e deixar as histórias ficarem."
        }
      </p>

      <div style="margin:18px 0; padding:16px; background:#fbf4ed; border-radius:14px; border:1px solid rgba(0,0,0,.06);">
        <p style="margin:0 0 8px; font-weight:700; color:#1f1f1f;">
          ${isEN ? "Book of the month" : "Livro do mês"} • ${content.month}
        </p>
        <p style="margin:0; color:#1f1f1f; line-height:1.6;">
          <strong>${content.title}</strong>, ${content.author}<br/>
          ${content.line}
        </p>
      </div>

      <h2 style="margin:18px 0 10px; font-size:18px; color:#1f1f1f;">
        ${isEN ? "Discussion questions" : "Perguntas para discussão"}
      </h2>

      <ol style="margin:0 0 18px; padding-left:18px; color:#2a2a2a; line-height:1.7;">
        <li>${content.questions[0]}</li>
        <li>${content.questions[1]}</li>
        <li>${content.questions[2]}</li>
      </ol>

      <div style="margin:18px 0; padding:16px; background:#ffffff; border-radius:14px; border:1px solid rgba(0,0,0,.06);">
        <p style="margin:0 0 8px; font-weight:700; color:#1f1f1f;">
          ${isEN ? "Highlights and previous picks" : "Destaques e leituras anteriores"}
        </p>
        <p style="margin:0; color:#2a2a2a; line-height:1.6;">
          ${content.highlights}
        </p>
      </div>

      <p style="margin:18px 0 0; color:#2a2a2a; line-height:1.6;">
        ${isEN ? "With care" : "Com carinho"},<br/>
        <strong>Casa da Leitura</strong>
      </p>
    </div>
  </div>`;

  return { subject, text, html };
}

/* =========================
   Subscribe endpoint
   ========================= */
app.post("/subscribe", async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const lang = (req.body?.lang || "pt").trim().toLowerCase();

    console.log("[/subscribe] payload:", { name, email, lang });

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "E-mail inválido." });
    }

    const list = readSubsList();
    const exists = list.some((s) => normalizeEmail(s.email) === email);

    // se já existe, não envia e-mail de novo (evita spam)
    if (exists) {
      return res.json({ ok: true, duplicated: true });
    }

    list.push({ name, email, createdAt: new Date().toISOString() });
    saveSubsList(list);

    const { subject, text, html } = buildWelcomeEmail({ name, lang });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject,
      text,
      html,
    });

    return res.json({ ok: true, duplicated: false });
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    return res.status(500).json({
      ok: false,
      error: "Falha ao enviar e-mail.",
      details: err?.message || String(err),
    });
  }
});

const BOOKS_PATH = path.join(__dirname, "data", "books.json");

function readBooks() {
  try {
    if (!fs.existsSync(BOOKS_PATH)) return null;
    return JSON.parse(fs.readFileSync(BOOKS_PATH, "utf-8") || "null");
  } catch {
    return null;
  }
}

app.get("/api/book", (req, res) => {
  const db = readBooks();
  if (!db || !db.currentKey || !db.books?.[db.currentKey]) {
    return res.status(404).json({ ok: false, error: "Livro do mês não configurado." });
  }
  return res.json({ ok: true, key: db.currentKey, book: db.books[db.currentKey] });
});

/* =========================
   Start
   ========================= */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});