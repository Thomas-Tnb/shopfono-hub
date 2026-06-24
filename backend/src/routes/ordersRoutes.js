import { Router } from "express";
import {
  getOrders,
  getOrderById,
  reprocessOrder,
  testPutBlingOrder,
} from "../controllers/ordersController.js";

const router = Router();

// RF-016 — lista pedidos (query: status_pedido, pedidosDeHoje)
router.get("/", getOrders);

// RF-017 — detalhes de um pedido
router.get("/:id", getOrderById);

router.post("/:id/reprocess", reprocessOrder);
router.post("/:id/test-put-bling", testPutBlingOrder);

export default router;
