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

/** CORS: no Render (ou .env local) defina FRONTEND_URL = origem exata do front, sem barra no final. */
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(morgan("dev"));

/** Health na raiz: alguns paineis (Render) configuram path /health sem /api. */
app.get("/health", (req, res) => {
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
