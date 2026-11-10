/* =========================================================
   charts.js — محرك الرسوم البيانية (Chart.js مع بديل آمن)
   لا ينهار أبداً إذا لم تُحمَّل مكتبة Chart
   ========================================================= */
'use strict';

(function () {
  const registry = {};

  const ChartsEngine = {
    COLORS: ['#0091ea', '#16a34a', '#d97706', '#7c3aed', '#e11d48', '#0f766e', '#475569', '#e6c766', '#2563eb', '#ea580c'],

    palette(n) { return Array.from({ length: n }, (_, i) => this.COLORS[i % this.COLORS.length]); },

    /* إنشاء رسم: ChartsEngine.make('canvasId', 'bar'|'line'|'doughnut'|'pie'|'radar', data, options) */
    make(canvasId, type, data, options = {}) {
      const cv = document.getElementById(canvasId);
      if (!cv) return null;
      this.destroy(canvasId);
      if (!window.Chart) {
        cv.replaceWith(Object.assign(document.createElement('div'), {
          className: 'empty-state', innerHTML: `<div class="big">📊</div><p>مكتبة الرسوم غير محمّلة</p>`
        }));
        return null;
      }
      const dark = document.documentElement.dataset.theme === 'dark';
      const gridColor = dark ? 'rgba(255,255,255,.08)' : 'rgba(3,11,26,.07)';
      const txtColor = dark ? '#a9bdd6' : '#42556e';

      Chart.defaults.font.family = "'Cairo', sans-serif";
      Chart.defaults.font.size = 11.5;
      Chart.defaults.color = txtColor;

      const cfg = {
        type,
        data,
        options: Object.assign({
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 650 },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, usePointStyle: true } },
            tooltip: { rtl: true, textDirection: 'rtl', padding: 10, cornerRadius: 9 }
          },
          scales: (type === 'doughnut' || type === 'pie') ? undefined : {
            x: { grid: { color: gridColor }, ticks: { color: txtColor } },
            y: { grid: { color: gridColor }, ticks: { color: txtColor }, beginAtZero: true }
          }
        }, options)
      };
      try {
        registry[canvasId] = new Chart(cv, cfg);
        return registry[canvasId];
      } catch (e) {
        console.error('[Charts]', e);
        return null;
      }
    },

    destroy(canvasId) {
      if (registry[canvasId]) { try { registry[canvasId].destroy(); } catch (e) {} delete registry[canvasId]; }
    },

    destroyAll() { Object.keys(registry).forEach((k) => this.destroy(k)); },

    /* شريط تقدم HTML بديل خفيف */
    progressBar(pct, cls = '') {
      return `<div class="progress ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
    }
  };

  window.ChartsEngine = ChartsEngine;
})();
