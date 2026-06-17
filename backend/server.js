import "dotenv/config";
import express from "express";
import connectDB from "./src/config/db.js";
import webhookRoutes from "./src/routes/webhookRoutes.js";
import ordersRoutes from "./src/routes/ordersRoutes.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);
app.use(express.json());

// Rotas
app.use("/webhooks", webhookRoutes);
app.use("/api/orders", ordersRoutes);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});

export default app;
