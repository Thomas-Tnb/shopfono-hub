import "dotenv/config";
import express from "express";
import connectDB from "./src/config/db.js";
import webhookRoutes from "./src/routes/webhookRoutes.js";

const app = express();

app.use(express.json());

// Rotas
app.use("/webhooks", webhookRoutes);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});

export default app;
