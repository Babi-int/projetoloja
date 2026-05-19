require("dotenv").config();

/**
 * Aplicação Express: CORS para o front, JSON, rotas sob /api e tratamento centralizado de erros.
 */
const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/errorMiddleware");

const app = express();

/**
 * CORS: FRONTEND_URL pode conter múltiplas origens separadas por vírgula.
 * Ex.: http://localhost:5173,https://meu-site.vercel.app
 * Em produção defina no painel do Render (Environment > FRONTEND_URL).
 */
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origem não permitida — ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));

/** Health na raiz: expõe erros de inicialização para diagnóstico remoto. */
app.get("/health", (req, res) => {
  const { initError } = require("./database/firebase");
  if (initError) return res.status(500).json({ status: "error", firebase: initError });
  res.json({ status: "ok", app: "Maricota Kids API" });
});

app.get("/", (req, res) => {
  res.json({
    app: "Maricota Kids API",
    health: "/api/health",
    healthAlt: "/health",
    login: "POST /api/auth/login"
  });
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    message: "Not Found",
    hint: "Rotas da API usam o prefixo /api (ex.: GET /api/health)."
  });
});

app.use(errorMiddleware);

module.exports = app;
