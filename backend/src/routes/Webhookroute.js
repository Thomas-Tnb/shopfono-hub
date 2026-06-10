import { Router } from "express";
import { receberPedidoBagy } from "../controllers/webhookController.js";

const router = Router();

// RF-001
router.post("/bagy/order", receberPedidoBagy);

export default router;
