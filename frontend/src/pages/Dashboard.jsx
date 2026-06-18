import { useEffect, useState } from "react";
import buscarPedidos from "./../services/ordersService";

function Dashboard() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    buscarPedidos(setPedidos);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Pedidos</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 font-medium">
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Natureza Op.</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3">Correio</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr
                key={pedido._id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-gray-800">
                  #{pedido.numero_pedido_bagy}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {pedido.cliente?.nome}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {pedido.natureza_operacao}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {pedido.forma_pagamento === "pix" ? (
                    <span>PIX</span>
                  ) : (
                    <span>
                      {pedido.forma_pagamento} ·{" "}
                      <span className="text-gray-400">
                        {pedido.transaction_id}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-800">{pedido.correio}</td>
                <td className="px-4 py-3 text-gray-800">
                  {Number(pedido.valor_total).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                    {pedido.status_pedido_bagy}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(pedido.createdAt).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pedidos.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            Nenhum pedido encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
