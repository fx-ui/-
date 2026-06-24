// 分类饼图（Chart.js 环形图）
const COLORS = [
  '#FFB6C1', '#FF8A80', '#FFD166', '#B8E6D0', '#C599E8',
  '#FFD6E0', '#FF9AAE', '#FFAB91', '#A5D6A7', '#90CAF9',
  '#F48FB1', '#CE93D8', '#80DEEA', '#FFF176', '#BCAAA4',
];

export class PieChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.chart = null;
    this.onClick = null; // callback(categoryId)
  }

  render({ labels, data, centerText = '' }) {
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(this.canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: COLORS.slice(0, labels.length),
          borderColor: '#fff',
          borderWidth: 3,
          borderRadius: 4,
          hoverBorderWidth: 4,
        }],
      },
      options: {
        cutout: '62%',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { family: "'Nunito', 'PingFang SC', sans-serif", size: 12 },
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => ({
                  text: `${label}  ${ds.data[i]}`,
                  fillStyle: ds.backgroundColor[i],
                  strokeStyle: ds.backgroundColor[i],
                  lineWidth: 0,
                  hidden: false,
                  index: i,
                  pointStyle: 'circle',
                  pointStyleWidth: 8,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(45,45,45,0.9)',
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ¥${ctx.parsed.toFixed(2)} (${((ctx.parsed / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`,
            },
          },
        },
        onClick: (e, elements) => {
          if (elements.length > 0 && this.onClick) {
            const idx = elements[0].index;
            this.onClick(idx);
          }
        },
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, chartArea: { width, height, top, left } } = chart;
          ctx.save();
          ctx.font = "600 14px 'PingFang SC', sans-serif";
          ctx.fillStyle = '#888';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(centerText, left + width / 2, top + height / 2);
          ctx.restore();
        },
      }],
    });
  }

  destroy() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
  }
}
