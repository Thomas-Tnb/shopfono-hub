import { useEffect, useState } from "react";
import buscarPedidos, { sincronizarTodos } from "./../services/ordersService";

const mapaPagamentos = {
  billet: "Boleto",
  creditcard: "Cartão de Crédito",
};

function Dashboard() {
  const [pedidos, setPedidos] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null); // { sucesso, erro }

  useEffect(() => {
    buscarPedidos(setPedidos);
  }, []);

  const handleSincronizarTodos = async () => {
    setSincronizando(true);
    setResultado(null);

    try {
      const res = await sincronizarTodos(pedidos);
      setResultado(res);
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Pedidos</h1>

        <div className="flex items-center gap-3">
          {resultado && (
            <span className="text-sm text-gray-500">
              <span className="text-green-600 font-medium">
                {resultado.sucesso} sincronizados
              </span>
              {resultado.erro > 0 && (
                <span className="text-red-500 font-medium">
                  {" "}
                  · {resultado.erro} com erro
                </span>
              )}
            </span>
          )}

          <button
            onClick={handleSincronizarTodos}
            disabled={sincronizando || pedidos.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sincronizando ? "Sincronizando..." : "Sincronizar com Bling"}
          </button>
        </div>
      </div>

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
                      {mapaPagamentos[pedido.forma_pagamento]} ·{" "}
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
