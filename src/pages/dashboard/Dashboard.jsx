import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, LineElement, PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { workOrderApi } from '../../api/workOrderApi';
import { prodIncentiveApi } from '../../api/prodIncentiveApi';
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
  const [date, setDate] = useState(today());
  const [workOrders, setWorkOrders] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    workOrderApi.getAll({ startDate: date, endDate: date }).then((r) => setWorkOrders(r.data));
  }, [date]);

  useEffect(() => {
    prodIncentiveApi.getAll().then((r) => setIncentives(r.data));
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

  // 작업자별 인센티브 Top5
  const workerMap = incentives.reduce((acc, i) => {
    acc[i.worker] = (acc[i.worker] || 0) + (i.amount || 0);
    return acc;
  }, {});
  const top5 = Object.entries(workerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const incChartData = {
    labels: top5.map(([w]) => w),
    datasets: [{
      label: '인센티브 금액(원)',
      data: top5.map(([, v]) => v),
      backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1'],
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
        <div className="form-group-inline">
          <label>작업지시 조회일자</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
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

        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">작업자별 인센티브 Top 5</h3>
          <Bar
            data={incChartData}
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
