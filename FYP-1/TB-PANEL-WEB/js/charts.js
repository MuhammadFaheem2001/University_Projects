/* ==========================================================================
   charts.js — minimal SVG chart builders. No dependencies.
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/**
 * Horizontal bar chart.
 * data: [{label, value, color}], opts: {width,height,max,suffix}
 */
function drawHBarChart(container, data, opts = {}) {
  const width = opts.width || 640;
  const rowH = opts.rowH || 34;
  const gap = 10;
  const labelW = opts.labelW || 170;
  const height = data.length * (rowH + gap) + gap;
  const max = opts.max || Math.max(...data.map(d => d.value)) * 1.15;
  const chartW = width - labelW - 60;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': opts.ariaLabel || 'bar chart' });

  data.forEach((d, i) => {
    const y = gap + i * (rowH + gap);
    const barW = Math.max(2, (d.value / max) * chartW);

    const label = svgEl('text', { x: labelW - 12, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'chart-label' });
    label.textContent = d.label;
    label.setAttribute('font-family', 'IBM Plex Mono, monospace');
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', '#59695F');
    svg.appendChild(label);

    const track = svgEl('rect', { x: labelW, y, width: chartW, height: rowH, fill: '#ECF1EF', rx: 3 });
    svg.appendChild(track);

    const bar = svgEl('rect', { x: labelW, y, width: barW, height: rowH, fill: d.color || '#2F6F62', rx: 3 });
    svg.appendChild(bar);

    const valText = svgEl('text', { x: labelW + barW + 10, y: y + rowH / 2 + 4, 'font-size': '12.5', fill: '#142420', 'font-family': 'IBM Plex Mono, monospace', 'font-weight': '600' });
    valText.textContent = (opts.format ? opts.format(d.value) : d.value) + (opts.suffix || '');
    svg.appendChild(valText);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

/**
 * Simple ROC-style line chart with diagonal reference line.
 * points: [{x,y}] each 0..1. opts: {width,height,color,label}
 */
function drawLineChart(container, series, opts = {}) {
  const width = opts.width || 420;
  const height = opts.height || 320;
  const pad = 44;
  const plotW = width - pad * 1.6;
  const plotH = height - pad * 1.6;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': opts.ariaLabel || 'line chart' });

  // axes
  const axisColor = '#B9C6BF';
  svg.appendChild(svgEl('line', { x1: pad, y1: pad, x2: pad, y2: pad + plotH, stroke: axisColor }));
  svg.appendChild(svgEl('line', { x1: pad, y1: pad + plotH, x2: pad + plotW, y2: pad + plotH, stroke: axisColor }));

  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const yy = pad + plotH - t * plotH;
    const gridline = svgEl('line', { x1: pad, y1: yy, x2: pad + plotW, y2: yy, stroke: '#ECF1EF' });
    svg.appendChild(gridline);
    const lab = svgEl('text', { x: pad - 8, y: yy + 4, 'text-anchor': 'end', 'font-size': '10', fill: '#59695F', 'font-family': 'IBM Plex Mono, monospace' });
    lab.textContent = t.toFixed(2);
    svg.appendChild(lab);
    const xx = pad + t * plotW;
    const labx = svgEl('text', { x: xx, y: pad + plotH + 16, 'text-anchor': 'middle', 'font-size': '10', fill: '#59695F', 'font-family': 'IBM Plex Mono, monospace' });
    labx.textContent = t.toFixed(2);
    svg.appendChild(labx);
  });

  // diagonal reference (random classifier)
  const diag = svgEl('line', {
    x1: pad, y1: pad + plotH, x2: pad + plotW, y2: pad,
    stroke: '#DBE3DE', 'stroke-dasharray': '4 4'
  });
  svg.appendChild(diag);

  series.forEach(s => {
    const pathD = s.points.map((p, i) => {
      const x = pad + p.x * plotW;
      const y = pad + plotH - p.y * plotH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    svg.appendChild(svgEl('path', { d: pathD, fill: 'none', stroke: s.color || '#2F6F62', 'stroke-width': 2.4 }));
  });

  // axis titles
  const xt = svgEl('text', { x: pad + plotW / 2, y: height - 4, 'text-anchor': 'middle', 'font-size': '11', fill: '#142420', 'font-family': 'Inter, sans-serif' });
  xt.textContent = opts.xLabel || 'False Positive Rate';
  svg.appendChild(xt);

  const yt = svgEl('text', { x: -(pad + plotH / 2), y: 14, 'text-anchor': 'middle', 'font-size': '11', fill: '#142420', transform: 'rotate(-90)', 'font-family': 'Inter, sans-serif' });
  yt.textContent = opts.yLabel || 'True Positive Rate';
  svg.appendChild(yt);

  container.innerHTML = '';
  container.appendChild(svg);
}

/**
 * Donut chart. data: [{label, value, color}]
 */
function drawDonut(container, data, opts = {}) {
  const size = opts.size || 220;
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  let angle = -90;

  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': opts.ariaLabel || 'donut chart' });

  data.forEach(d => {
    const frac = d.value / total;
    const sweep = frac * 360;
    const large = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(angle * Math.PI / 180);
    const y1 = cy + r * Math.sin(angle * Math.PI / 180);
    const end = angle + sweep;
    const x2 = cx + r * Math.cos(end * Math.PI / 180);
    const y2 = cy + r * Math.sin(end * Math.PI / 180);
    const path = svgEl('path', {
      d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`,
      fill: d.color
    });
    svg.appendChild(path);
    angle = end;
  });

  const hole = svgEl('circle', { cx, cy, r: r * 0.58, fill: '#FFFFFF' });
  svg.appendChild(hole);

  const centerLabel = svgEl('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', 'font-size': '22', 'font-weight': '600', fill: '#142420', 'font-family': 'IBM Plex Mono, monospace' });
  centerLabel.textContent = total;
  svg.appendChild(centerLabel);
  const centerSub = svgEl('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', 'font-size': '10', fill: '#59695F', 'font-family': 'Inter, sans-serif' });
  centerSub.textContent = opts.centerLabel || 'patients';
  svg.appendChild(centerSub);

  container.innerHTML = '';
  container.appendChild(svg);
}

/**
 * SHAP-style waterfall bar chart (contribution left/right of zero).
 * data: [{label, value}] value can be negative.
 */
function drawWaterfall(container, data, opts = {}) {
  const width = opts.width || 640;
  const rowH = 32, gap = 10;
  const labelW = 150;
  const height = data.length * (rowH + gap) + gap;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value))) * 1.3 || 1;
  const midX = labelW + (width - labelW - 40) / 2;
  const halfW = (width - labelW - 40) / 2;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': opts.ariaLabel || 'waterfall chart' });
  svg.appendChild(svgEl('line', { x1: midX, y1: 0, x2: midX, y2: height, stroke: '#DBE3DE' }));

  data.forEach((d, i) => {
    const y = gap + i * (rowH + gap);
    const label = svgEl('text', { x: labelW - 12, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': '12', fill: '#59695F', 'font-family': 'IBM Plex Mono, monospace' });
    label.textContent = d.label;
    svg.appendChild(label);

    const w = (Math.abs(d.value) / maxAbs) * halfW;
    const x = d.value >= 0 ? midX : midX - w;
    const color = d.value >= 0 ? '#B5482F' : '#2F6F62';
    svg.appendChild(svgEl('rect', { x, y, width: w, height: rowH, fill: color, rx: 2 }));

    const valText = svgEl('text', {
      x: d.value >= 0 ? midX + w + 8 : midX - w - 8,
      y: y + rowH / 2 + 4,
      'text-anchor': d.value >= 0 ? 'start' : 'end',
      'font-size': '12', 'font-weight': '600', fill: '#142420', 'font-family': 'IBM Plex Mono, monospace'
    });
    valText.textContent = (d.value >= 0 ? '+' : '') + d.value.toFixed(2);
    svg.appendChild(valText);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

window.drawHBarChart = drawHBarChart;
window.drawLineChart = drawLineChart;
window.drawDonut = drawDonut;
window.drawWaterfall = drawWaterfall;
