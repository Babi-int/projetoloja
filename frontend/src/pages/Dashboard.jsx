import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import {
  IconLowStock,
  IconProducts,
  IconProfit,
  IconRevenue,
  IconSales,
  IconSoldOut
} from "../components/icons/DashboardStatIcons";
import DashboardSalesCharts from "../components/DashboardSalesCharts";
import SoldOutProductsModal from "../components/SoldOutProductsModal";
import { formatCurrency, formatDate } from "../utils/formatters";

/** Formato AAAA-MM-DD para querystring; backend interpreta no fuso local do servidor. */
function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Padrão alinhado ao financeService: primeiro dia do mês até hoje. */
function defaultDateRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
}

export default function Dashboard() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soldOutModalOpen, setSoldOutModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Resumo agregado (contagens, receita, lucro estimado) só para o intervalo escolhido.
      const { data } = await api.get("/finance/dashboard", {
        params: { startDate, endDate }
      });
      setSummary(data);
    } catch (err) {
      setSummary(null);
      const apiMsg = err.response?.data?.message;
      const isOffline =
        !err.response && (err.code === "ERR_NETWORK" || err.message === "Network Error");
      const isTimeout = err.code === "ECONNABORTED";
      setError(
        apiMsg ||
          (isOffline || isTimeout
            ? "Não foi possível conectar ao servidor. O sistema pode estar sendo iniciado — aguarde 30 segundos e tente novamente."
            : "Não foi possível carregar o dashboard.")
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const lowStockHint = useMemo(() => {
    const n = summary?.lowStockThreshold;
    if (n == null) return "Ate 5 unidades (padrao)";
    return `Ate ${n} unidade${n === 1 ? "" : "s"} (configurado em Configuracoes)`;
  }, [summary?.lowStockThreshold]);

  const soldOutList = Array.isArray(summary?.soldOutProducts) ? summary.soldOutProducts : [];
  const soldOutPreviewNames = soldOutList.slice(0, 5).map((p) => p.name);
  const soldOutMoreCount = Math.max(0, soldOutList.length - 5);

  const cards = [
    {
      title: "Produtos cadastrados",
      value: summary?.productsCount ?? 0,
      tone: "pink",
      icon: <IconProducts />,
      hint: "Total de itens no catalogo (inclui ativos e inativos)."
    },
    {
      title: "Estoque baixo",
      value: summary?.lowStockCount ?? 0,
      hint: lowStockHint,
      tone: "yellow",
      icon: <IconLowStock />
    },
    {
      title: "Produtos esgotados",
      value: summary?.soldOutCount ?? 0,
      tone: "blue",
      icon: <IconSoldOut />,
      hint: "Estoque zero ou marcados como esgotados no cadastro.",
      iconHoverList: soldOutPreviewNames.length > 0 ? soldOutPreviewNames : undefined,
      iconHoverFooter:
        soldOutMoreCount > 0
          ? `Mais ${soldOutMoreCount} produto${soldOutMoreCount === 1 ? "" : "s"}.`
          : undefined,
      iconHoverOnMaisClick: soldOutList.length > 0 ? () => setSoldOutModalOpen(true) : undefined
    },
    {
      title: "Vendas no periodo",
      value: summary?.periodSalesCount ?? 0,
      hint: summary?.filter
        ? `De ${formatDate(summary.filter.startDate)} ate ${formatDate(summary.filter.endDate)}`
        : undefined,
      tone: "mint",
      icon: <IconSales />
    },
    {
      title: "Receita no periodo",
      value: formatCurrency(summary?.periodRevenue),
      tone: "pink",
      icon: <IconRevenue />,
      hint: "Soma dos totais das vendas validas no intervalo abaixo."
    },
    {
      title: "Lucro estimado (periodo)",
      value: formatCurrency(summary?.periodEstimatedProfit),
      tone: "mint",
      icon: <IconProfit />,
      hint: "Aproximacao: diferenca entre venda e custo de compra dos itens."
    }
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visao rapida do negocio. O intervalo de datas afeta apenas vendas, receita e lucro; contagens de estoque sao sempre do cadastro atual. Use Mes atual para alinhar ao relatorio financeiro. Os graficos abaixo usam sempre os ultimos 30 dias e 12 meses (vendas validas; devolucoes descontam)."
      />

      <div className="card mb-6 grid gap-4 md:grid-cols-4 md:items-end">
        <label>
          <span className="mb-2 block text-sm font-semibold">Data inicial</span>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Data final</span>
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
          />
        </label>
        <div className="md:col-span-2">
          <p className="mb-2 text-xs text-slate-500">
            As datas usam o calendario; o servidor interpreta o fim do intervalo no horario da API.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" disabled={loading} onClick={load}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={loading}
              onClick={() => {
                setRange(defaultDateRange());
              }}
            >
              Mes atual
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      {summary && !loading && (
        <DashboardSalesCharts daily={summary.dailySalesChart} monthly={summary.monthlySalesChart} />
      )}

      {summary?.periodDiscounts > 0 && (
        <p className="mt-4 text-sm text-slate-600">
          Descontos concedidos no periodo:{" "}
          <strong>{formatCurrency(summary.periodDiscounts)}</strong>
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-maricota-text">
          Vendas no periodo
          {summary?.filter && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({formatDate(summary.filter.startDate)} a {formatDate(summary.filter.endDate)})
            </span>
          )}
        </h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Ultimas ate 20 vendas do intervalo; cancele ou devolva itens pelo menu Historico de vendas.
        </p>
        {!summary?.recentSales?.length ? (
          <p className="rounded-2xl border border-pink-100 bg-pink-50/50 px-4 py-6 text-center text-sm text-slate-500">
            Nenhuma venda neste periodo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-pink-100 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-pink-50 text-left text-sm">
                <thead className="bg-maricota-rose text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Itens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {summary.recentSales.map((row) => (
                    <tr key={row.id} className="hover:bg-pink-50/50">
                      <td className="px-4 py-3">{formatDate(row.soldAt)}</td>
                      <td className="px-4 py-3">{row.customerName || "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">{row.status || "COMPLETED"}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(row.totalAmount)}</td>
                      <td className="px-4 py-3">{row.itemsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <SoldOutProductsModal
        open={soldOutModalOpen}
        onClose={() => setSoldOutModalOpen(false)}
        products={soldOutList}
      />
    </>
  );
}
