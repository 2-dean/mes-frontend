import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, LineElement, PointElement,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { workOrderApi } from '../../api/workOrderApi';
import { prodResultApi } from '../../api/prodResultApi';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, LineElement, PointElement,
);

const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const today = () => toLocalDateStr(new Date());

export default function Dashboard() {
  const [workOrders, setWorkOrders] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    workOrderApi.getAll({ startDate: today(), endDate: today() }).then((r) => setWorkOrders(r.data));
    prodResultApi.getAll().then((r) => setResults(r.data));
  }, []);

  // 작업지시 상태별 집계
  const statusCount = workOrders.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = {
    labels: ['대기', '진행중', '완료'],
    datasets: [{
      data: [statusCount.WAIT || 0, statusCount.IN_PROGRESS || 0, statusCount.DONE || 0],
      backgroundColor: ['#6c757d', '#0d6efd', '#198754'],
    }],
  };

  // 최근 7일 생산량
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toLocalDateStr(d);
  });

  const dailyQty = last7.map((date) =>
    results.filter((r) => r.prodDate === date).reduce((s, r) => s + (r.totalQty || 0), 0)
  );

  const prodChartData = {
    labels: last7.map((d) => d.slice(5)),
    datasets: [{
      label: '일별 생산수량',
      data: dailyQty,
      backgroundColor: 'rgba(13,110,253,0.5)',
      borderColor: '#0d6efd',
      borderWidth: 2,
      fill: true,
    }],
  };

  const summaryCards = [
    { label: '당일 작업지시', value: workOrders.length, color: '#0d6efd' },
    { label: '진행중', value: statusCount.IN_PROGRESS || 0, color: '#ffc107' },
    { label: '완료', value: statusCount.DONE || 0, color: '#198754' },
    { label: '오늘 생산수량', value: dailyQty[6] || 0, color: '#dc3545' },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar" style={{ marginBottom: 20 }}>
        <h2 className="page-title">대시보드</h2>
      </div>

      <div className="summary-cards">
        {summaryCards.map((c) => (
          <div key={c.label} className="summary-card" style={{ borderTop: `4px solid ${c.color}` }}>
            <div className="card-value" style={{ color: c.color }}>{c.value.toLocaleString()}</div>
            <div className="card-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">작업지시 현황</h3>
          <Doughnut
            data={statusChartData}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
          />
        </div>

        <div className="chart-card">
          <h3 className="chart-title">최근 7일 생산수량</h3>
          <Line
            data={prodChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
