// 月度趋势柱线混合图
export class TrendChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.chart = null;
  }

  render({ labels, incomeData, expenseData, balanceData }) {
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(this.canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '支出',
            data: expenseData,
            backgroundColor: 'rgba(255, 138, 128, 0.75)',
            borderColor: '#FF8A80',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            order: 2,
          },
          {
            label: '收入',
            data: incomeData,
            backgroundColor: 'rgba(184, 230, 208, 0.75)',
            borderColor: '#B8E6D0',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            order: 2,
          },
          {
            label: '结余',
            data: balanceData,
            type: 'line',
            borderColor: '#C599E8',
            backgroundColor: 'rgba(197, 153, 232, 0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: '#C599E8',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: "'Nunito', 'PingFang SC', sans-serif", size: 12 },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(45,45,45,0.9)',
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ¥${Number(ctx.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { size: 11 },
              callback: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v,
            },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
        },
      },
    });
  }

  destroy() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }
}
