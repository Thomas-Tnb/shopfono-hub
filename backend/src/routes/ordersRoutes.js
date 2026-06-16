import { Router } from "express";
import { getOrders, getOrderById } from "../controllers/ordersController.js";

const router = Router();

// RF-016 — lista pedidos (query: status_pedido, pedidosDeHoje)
router.get("/", getOrders);

// RF-017 — detalhes de um pedido
router.get("/:id", getOrderById);

export default router;
