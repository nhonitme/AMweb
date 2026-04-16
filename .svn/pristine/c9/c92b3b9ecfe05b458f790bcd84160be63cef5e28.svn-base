import React from 'react';
import KPICard from './KPICard';
import DataTable from './DataTable';
import ProductTable from './ProductTable';
import AlertPanel from './AlertPanel';
import { KPICard as KPICardType, ChartData, TableData, Product } from '../types';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, ArcElement } from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, ArcElement);

const kpiData: KPICardType[] = [
  {
    title: 'Doanh Thu Tháng',
    value: '4.35B',
    change: '+12.5%',
    trend: 'up',
    icon: 'TrendingUp'
  },
  {
    title: 'Chi Phí Tháng',
    value: '3.25B',
    change: '+8.2%',
    trend: 'up',
    icon: 'TrendingDown'
  },
  {
    title: 'Lợi Nhuận Tháng',
    value: '1.10B',
    change: '+18.7%',
    trend: 'up',
    icon: 'DollarSign'
  },
  {
    title: 'Dòng Tiền',
    value: '850M',
    change: '+5.3%',
    trend: 'up',
    icon: 'TrendingUp'
  }
];

const revenueExpenseData: ChartData[] = [
  { label: 'T1', value: 2800000000 },
  { label: 'T2', value: 3100000000 },
  { label: 'T3', value: 2900000000 },
  { label: 'T4', value: 3300000000 },
  { label: 'T5', value: 3200000000 },
  { label: 'T6', value: 3450000000 },
  { label: 'T7', value: 3800000000 },
  { label: 'T8', value: 4100000000 },
  { label: 'T9', value: 3900000000 },
  { label: 'T10', value: 4300000000 },
  { label: 'T11', value: 4200000000 },
  { label: 'T12', value: 4350000000 }
];

const cashFlowData: ChartData[] = [
  { label: 'T1', value: 3200000000 },
  { label: 'T2', value: 2800000000 },
  { label: 'T3', value: 3100000000 },
  { label: 'T4', value: 2900000000 },
  { label: 'T5', value: 3300000000 },
  { label: 'T6', value: 3200000000 }
];

const profitData: ChartData[] = [
  { label: 'Doanh Thu Thuần', value: 68 },
  { label: 'Chi Phí Hoạt Động', value: 25 },
  { label: 'Lợi Nhuận', value: 7 }
];

const partnerExpenseData: ChartData[] = [
  { label: 'Sản xuất chính', value: 45 },
  { label: 'Bán hàng & Marketing', value: 35 },
  { label: 'Quản lý chung', value: 20 },
  { label: 'Nghiên cứu phát triển', value: 10 }
];

// Chuẩn hóa data cho Pie chart Đối tượng Tập hợp Chi phí
const partnerPieData = {
  labels: partnerExpenseData.map((d) => d.label),
  datasets: [
    {
      label: 'Đối tượng Tập hợp Chi phí',
      data: partnerExpenseData.map((d) => d.value),
      backgroundColor: [
        'rgba(37,99,235,0.7)', // blue
        'rgba(220,38,38,0.7)', // red
        'rgba(251,191,36,0.7)', // yellow
        'rgba(16,185,129,0.7)', // green
      ],
      borderColor: '#fff',
      borderWidth: 2,
    },
  ],
};
const partnerPieOptions = {
  responsive: true,
  plugins: {
    legend: { display: true, position: 'right' as const },
    tooltip: { enabled: true },
  },
  animation: {
    duration: 1200,
    easing: 'easeOutQuart' as const,
  },
};

const receivableData: TableData[] = [
  { id: '1', name: 'Công ty TNHH ABC', amount: 150000000, dueDate: '15/12/2024', status: 'overdue' },
  { id: '2', name: 'Công ty XYZ Ltd', amount: 89000000, dueDate: '20/12/2024', status: 'due-soon' },
  { id: '3', name: 'Công ty DEF Corp', amount: 220000000, dueDate: '25/12/2024', status: 'current' },
  { id: '4', name: 'Doanh nghiệp GHI', amount: 95000000, dueDate: '10/12/2024', status: 'overdue' }
];

const payableData: TableData[] = [
  { id: '1', name: 'NCC Nguyên liệu A', amount: 120000000, dueDate: '18/12/2024', status: 'due-soon' },
  { id: '2', name: 'NCC Thiết bị B', amount: 75000000, dueDate: '22/12/2024', status: 'current' },
  { id: '3', name: 'NCC Dịch vụ C', amount: 180000000, dueDate: '12/12/2024', status: 'overdue' },
  { id: '4', name: 'NCC Vận chuyển D', amount: 45000000, dueDate: '28/12/2024', status: 'current' }
];

const bestSellingProducts: Product[] = [
  { id: '1', name: 'Sản phẩm A1', sold: 1250, revenue: 375000000, stock: 85 },
  { id: '2', name: 'Sản phẩm B2', sold: 980, revenue: 294000000, stock: 8 },
  { id: '3', name: 'Sản phẩm C3', sold: 750, revenue: 225000000, stock: 42 },
  { id: '4', name: 'Sản phẩm D4', sold: 620, revenue: 186000000, stock: 5 },
  { id: '5', name: 'Sản phẩm E5', sold: 580, revenue: 174000000, stock: 67 }
];

export default function DashboardOverview() {
  // Responsive legend position for Pie chart
  const [pieLegendPosition, setPieLegendPosition] = React.useState<'right' | 'bottom'>('right');
  React.useEffect(() => {
    function handleResize() {
      setPieLegendPosition(window.innerWidth < 768 ? 'bottom' : 'right');
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: pieLegendPosition },
      tooltip: { enabled: true },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
  };

  const partnerPieOptions = {
   responsive: true,
    plugins: {
      legend: { display: true, position: pieLegendPosition },
      tooltip: { enabled: true },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
  };
  // Chuẩn hóa data cho Bar chart
  const barData = {
    labels: revenueExpenseData.map((d) => d.label),
    datasets: [
      {
        label: 'Doanh Thu & Chi Phí',
        data: revenueExpenseData.map((d) => d.value),
        backgroundColor: 'rgba(220,38,38,0.7)',
        borderRadius: 6,
        maxBarThickness: 32,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Noto Sans', size: 13 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e0e0e0' },
        ticks: { font: { family: 'Noto Sans', size: 13 } },
      },
    },
  };

  // Chuẩn hóa data cho Line chart
  const lineData = {
    labels: cashFlowData.map((d) => d.label),
    datasets: [
      {
        label: 'Dòng Tiền',
        data: cashFlowData.map((d) => d.value),
        borderColor: 'rgba(37,99,235,1)',
        backgroundColor: 'rgba(37,99,235,0.1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(37,99,235,1)',
        pointBorderColor: '#fff',
        pointRadius: 5,
        fill: true,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Noto Sans', size: 13 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e0e0e0' },
        ticks: { font: { family: 'Noto Sans', size: 13 } },
      },
    },
  };

  // Chuẩn hóa data cho Pie chart
  const pieData = {
    labels: profitData.map((d) => d.label),
    datasets: [
      {
        label: 'Tỷ Lệ Lợi Nhuận',
        data: profitData.map((d) => d.value),
        backgroundColor: [
          'rgba(37,99,235,0.7)', // blue
          'rgba(220,38,38,0.7)', // red
          'rgba(16,185,129,0.7)', // green
        ],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2">Doanh Thu & Chi Phí</h2>
          <Bar data={barData} options={barOptions} height={100} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-2">Dòng Tiền (Quản lý Tài khoản)</h2>
          <Line data={lineData} options={lineOptions} height={100} />
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-center">
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-2 text-center">Tỷ Lệ Lợi Nhuận (Quản lý Tài khoản)</h2>
            <div className="max-w-md mx-auto">
              <Pie data={pieData} options={pieOptions} className="w-full h-auto max-h-[300px]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-center">
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-2 text-center">Đối tượng Tập hợp Chi phí</h2>
            <div className="max-w-md mx-auto">
              <Pie data={partnerPieData} options={partnerPieOptions} className="w-full h-auto max-h-[300px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable title="Công nợ phải thu" data={receivableData} type="receivable" />
        <DataTable title="Công nợ phải trả" data={payableData} type="payable" />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductTable title="Sản phẩm bán chạy nhất" products={bestSellingProducts} />
        </div>
        <div>
          <AlertPanel />
        </div>
      </div>
    </div>
  );
}