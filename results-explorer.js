import { layoutLogoMarkers } from "./results-marker-layout.js";

const METRICS = {
  gated: { label: 'Gated error', direction: 'lower is better', digits: 4 },
  raw: { label: 'Raw NDTW', direction: 'lower is better', digits: 4 },
  visual: { label: 'Visual pass', direction: 'higher is better', digits: 2, suffix: '%' },
};
let instance = 0;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const format = (value, metric) => `${value.toFixed(METRICS[metric].digits)}${METRICS[metric].suffix || ''}`;

/** Exact summary of model averages; no interpolation or per-task inference. */
export function summarizeDistribution(values) {
  if (!values.length || values.some(value => !Number.isFinite(value))) {
    throw new TypeError('A distribution requires finite observed values.');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted.at(-1),
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
  };
}

/** Rounded 1/2/5 tick increments retain all observations and room around marks. */
export function niceAxis(values, { includeZero = false } = {}) {
  const { min, max } = summarizeDistribution(values);
  const lower = includeZero ? Math.min(0, min) : min;
  const upper = includeZero ? Math.max(0, max) : max;
  const span = upper - lower || Math.abs(upper) || 1;
  let paddedLower = includeZero && lower === 0 ? 0 : lower - span * .08;
  const paddedUpper = includeZero && upper === 0 && max < 0 ? 0 : upper + span * .08;
  if (min >= 0) paddedLower = Math.max(0, paddedLower);
  const roughStep = (paddedUpper - paddedLower) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].find(value => value >= roughStep / magnitude) * magnitude;
  const clean = value => Number(value.toPrecision(12));
  const start = clean(Math.floor(paddedLower / step) * step);
  const end = clean(Math.ceil(paddedUpper / step) * step);
  const ticks = Array.from({ length: Math.round((end - start) / step) + 1 }, (_, index) => clean(start + index * step));
  return { domain: [start, end], ticks, step: clean(step) };
}
const scale = (value, range, start, end) => start + (value - range[0]) / (range[1] - range[0]) * (end - start);
const tickLabel = (value, axis) => value.toFixed(Math.max(0, -Math.floor(Math.log10(axis.step))));

export function setupResultsExplorer(root, models) {
  if (!root || !models?.length || new Set(models.map(model => model.id)).size !== models.length ||
      models.some(model => Object.keys(METRICS).some(metric => !Number.isFinite(model[metric])))) return;
  const uid = `results-explorer-${++instance}`;
  let selected = models.find(model => model.ours)?.id || models[0].id;
  let scatterMetric = 'gated';
  let distributionMetric = 'gated';
  const logoKey = model => model.logo?.getAttribute('src') || model.logo?.getAttribute('aria-label');
  const entries = models.map(model => ({
    ...model,
    markerLabel: models.filter(other => logoKey(other) === logoKey(model)).length > 1
      ? model.name.replace('Cosmos-Predict', 'Predict') : '',
  }));
  let logoInstance = 0;
  function createLogo(model, inPlot = false) {
    const source = model.logo;
    const isVector = source.tagName.toLowerCase() === 'svg';
    const width = isVector ? 44 : 24;
    let logo;
    if (inPlot && !isVector) {
      logo = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      logo.setAttribute('href', source.getAttribute('src'));
      logo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    } else {
      logo = source.cloneNode(true);
      // The official SVG uses a clipPath. Give every reused logo its own IDs.
      for (const node of logo.querySelectorAll('[id]')) {
        const before = node.id;
        const after = `${uid}-logo-${++logoInstance}`;
        node.id = after;
        for (const target of [logo, ...logo.querySelectorAll('*')]) {
          for (const attribute of [...target.attributes]) {
            if (attribute.value.includes(`url(#${before})`)) {
              target.setAttribute(attribute.name, attribute.value.replaceAll(`url(#${before})`, `url(#${after})`));
            }
          }
        }
      }
    }
    logo.classList.add('rx-model-logo');
    logo.setAttribute('aria-hidden', 'true');
    logo.removeAttribute('aria-label');
    logo.removeAttribute('role');
    if (logo.tagName === 'IMG') logo.alt = '';
    logo.setAttribute('width', String(width));
    logo.setAttribute('height', '24');
    if (inPlot) { logo.setAttribute('x', String(-width / 2)); logo.setAttribute('y', '-12'); }
    return logo;
  }
  const options = keys => keys.map(key => `<option value="${key}">${METRICS[key].label}${key === 'visual' ? ' ↑' : ' ↓'}</option>`).join('');
  root.classList.add('results-explorer');
  root.innerHTML = `
    <div class="rx-heading"><div><p class="kicker">Explore the results</p><h3>Two views of model performance</h3></div><p>Choose a metric. Select a logo to inspect the model’s published result.</p></div>
    <div class="rx-grid">
      <figure class="rx-panel">
        <figcaption><div><span class="rx-number">01 / TRADE-OFF</span><h4>Action following × visual integrity</h4></div><label>X axis <select data-rx-scatter aria-label="Scatter plot horizontal metric">${options(['gated', 'raw'])}</select></label></figcaption>
        <svg class="rx-scatter" viewBox="0 0 520 325" role="img" aria-labelledby="${uid}-scatter-title ${uid}-scatter-description">
          <title id="${uid}-scatter-title">Action following and visual integrity by model</title>
          <desc id="${uid}-scatter-description"></desc>
          <g data-rx-scatter-axes></g><g data-rx-scatter-leaders></g><g data-rx-scatter-points></g>
        </svg>
        <p class="rx-caption">Each logo is one model. Upper left is better; line endpoints preserve exact values.</p>
      </figure>
      <figure class="rx-panel">
        <figcaption><div><span class="rx-number">02 / DISTRIBUTION</span><h4>Where the model averages fall</h4></div><label>Metric <select data-rx-distribution aria-label="Distribution plot metric">${options(Object.keys(METRICS))}</select></label></figcaption>
        <svg class="rx-distribution" viewBox="0 0 520 325" role="img" aria-labelledby="${uid}-distribution-title ${uid}-distribution-description">
          <title id="${uid}-distribution-title">Distribution of displayed model averages</title>
          <desc id="${uid}-distribution-description"></desc>
          <g data-rx-distribution-axes></g><g data-rx-distribution-leaders></g><g data-rx-distribution-points></g>
        </svg>
        <p class="rx-caption">One logo per model. Line endpoints mark exact values; offsets separate labels. Dashed line: median.</p>
      </figure>
    </div>
    <div class="rx-legend" role="group" aria-label="Select a model in both plots"></div>
    <div class="rx-detail" aria-live="polite" aria-atomic="true"></div>
    <p class="rx-source">Published task-macro averages across 50 RoboTwin tasks; ${models.length} displayed models. The distribution is across model averages. Training data and update budgets differ; see the leaderboard above.</p>`;

  const legend = root.querySelector('.rx-legend');
  for (const model of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.rxModel = model.id;
    const logoSlot = document.createElement('span');
    logoSlot.className = 'rx-legend-logo';
    logoSlot.append(createLogo(model));
    button.innerHTML = `<span>${escape(model.name)}${model.ours ? ' <small>ours</small>' : ''}</span>`;
    button.prepend(logoSlot);
    button.addEventListener('click', () => { selected = model.id; updateSelection(); });
    legend.append(button);
  }
  for (const type of ['scatter', 'distribution']) {
    const group = root.querySelector(`[data-rx-${type}-points]`);
    for (const model of entries) {
      const point = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      point.classList.add('rx-point');
      point.dataset.rxModel = model.id;
      const width = model.markerLabel ? 80 : model.logo.tagName.toLowerCase() === 'svg' ? 52 : 32;
      point.innerHTML = `<rect class="rx-marker-hit" x="${-width / 2}" y="-16" width="${width}" height="${model.markerLabel ? 48 : 32}"/><title>${escape(model.name)}</title>`;
      point.append(createLogo(model, true));
      if (model.markerLabel) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.classList.add('rx-point-label');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('y', '27');
        label.textContent = model.markerLabel;
        point.append(label);
      }
      const leader = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      leader.classList.add('rx-marker-leader');
      leader.dataset.rxModel = model.id;
      root.querySelector(`[data-rx-${type}-leaders]`).append(leader);
      point.addEventListener('click', () => { selected = model.id; updateSelection(); });
      group.append(point);
    }
  }

  function positionMarkers(type, coordinates) {
    const anchors = coordinates.map(({ model, x, y }) => ({
      id: model.id, x, y: y + (model.markerLabel ? 8 : 0),
      width: model.markerLabel ? 80 : model.logo.tagName.toLowerCase() === 'svg' ? 52 : 32,
      height: model.markerLabel ? 48 : 32,
    }));
    const arranged = layoutLogoMarkers(anchors, { left: 62, right: 485, top: 38, bottom: 258 });
    arranged.forEach((marker, index) => {
      const { model, x, y } = coordinates[index];
      const displayY = marker.displayY - (model.markerLabel ? 8 : 0);
      const point = [...root.querySelectorAll(`[data-rx-${type}-points] .rx-point`)].find(node => node.dataset.rxModel === model.id);
      point.style.transform = `translate(${marker.displayX}px, ${displayY}px)`;
      const leader = [...root.querySelectorAll(`[data-rx-${type}-leaders] line`)].find(node => node.dataset.rxModel === model.id);
      leader.setAttribute('x1', x);
      leader.setAttribute('y1', y);
      leader.setAttribute('x2', marker.displayX);
      leader.setAttribute('y2', displayY);
      leader.classList.toggle('is-displaced', Math.hypot(marker.displayX - x, displayY - y) > 1);
    });
  }

  function drawScatter() {
    const xAxis = niceAxis(entries.map(model => model[scatterMetric]), { includeZero: true });
    const yAxis = niceAxis(entries.map(model => model.visual));
    const x = value => scale(value, xAxis.domain, 62, 485);
    const y = value => scale(value, yAxis.domain, 258, 38);
    root.querySelector('[data-rx-scatter-axes]').innerHTML = `
      ${yAxis.ticks.map(value => `<line class="rx-gridline" x1="62" x2="485" y1="${y(value)}" y2="${y(value)}"/><text x="49" y="${y(value) + 4}" text-anchor="end">${tickLabel(value, yAxis)}</text>`).join('')}
      <line class="rx-axis" x1="62" x2="485" y1="258" y2="258"/>
      ${xAxis.ticks.map(value => `<line class="rx-axis" x1="${x(value)}" x2="${x(value)}" y1="258" y2="264"/><text x="${x(value)}" y="281" text-anchor="middle">${tickLabel(value, xAxis)}</text>`).join('')}
      <text class="rx-axis-label" x="62" y="18">Visual pass (%) ↑</text>
      <text class="rx-axis-label" x="273.5" y="314" text-anchor="middle">${METRICS[scatterMetric].label} ↓</text>`;
    positionMarkers('scatter', entries.map(model => ({ model, x: x(model[scatterMetric]), y: y(model.visual) })));
    entries.forEach(model => {
      const point = [...root.querySelectorAll('[data-rx-scatter-points] .rx-point')].find(item => item.dataset.rxModel === model.id);
      point.querySelector('title').textContent = `${model.name}: ${format(model[scatterMetric], scatterMetric)}, visual pass ${format(model.visual, 'visual')}`;
    });
    root.querySelector(`#${uid}-scatter-description`).textContent = `${models.length} model averages. Horizontal axis: ${METRICS[scatterMetric].label}, lower is better. Vertical axis: visual pass percentage, higher is better. Use the logo buttons below for exact values.`;
  }

  function drawDistribution() {
    const values = entries.map(model => model[distributionMetric]);
    const summary = summarizeDistribution(values);
    const axis = niceAxis(values, { includeZero: distributionMetric !== 'visual' });
    const x = value => scale(value, axis.domain, 62, 485);
    const medianX = x(summary.median);
    root.querySelector('[data-rx-distribution-axes]').innerHTML = `
      <text class="rx-axis-label" x="62" y="18">${summary.count} model averages · ${METRICS[distributionMetric].direction}</text>
      <line class="rx-gridline" x1="62" x2="485" y1="173" y2="173"/>
      <line class="rx-median" x1="${medianX}" x2="${medianX}" y1="96" y2="241"/>
      <text class="rx-median-label" x="${medianX}" y="69" text-anchor="middle">Median ${format(summary.median, distributionMetric)}</text>
      <line class="rx-axis" x1="62" x2="485" y1="258" y2="258"/>
      ${axis.ticks.map(value => `<line class="rx-axis" x1="${x(value)}" x2="${x(value)}" y1="258" y2="264"/><text x="${x(value)}" y="281" text-anchor="middle">${tickLabel(value, axis)}</text>`).join('')}
      <text class="rx-axis-label" x="273.5" y="314" text-anchor="middle">${METRICS[distributionMetric].label}${distributionMetric === 'visual' ? ' (%) ↑' : ' ↓'}</text>`;
    positionMarkers('distribution', entries.map(model => ({ model, x: x(model[distributionMetric]), y: 173 })));
    for (const model of entries) {
      const point = [...root.querySelectorAll('[data-rx-distribution-points] .rx-point')].find(item => item.dataset.rxModel === model.id);
      point.querySelector('title').textContent = `${model.name}: ${format(model[distributionMetric], distributionMetric)}`;
    }
    root.querySelector(`#${uid}-distribution-description`).textContent = `${summary.count} exact model-average values for ${METRICS[distributionMetric].label}. Median ${format(summary.median, distributionMetric)}. Logos may be offset for readability; connecting line endpoints retain the exact values. Use the logo buttons below for exact values.`;
  }

  function updateSelection() {
    root.querySelectorAll('[data-rx-model]').forEach(element => {
      const active = element.dataset.rxModel === selected;
      element.classList.toggle('is-selected', active);
      if (element.tagName === 'BUTTON') element.setAttribute('aria-pressed', String(active));
    });
    const model = entries.find(item => item.id === selected);
    root.querySelector('.rx-detail').innerHTML = `<div class="rx-selected-name"><span class="rx-number">SELECTED MODEL</span><strong>${escape(model.name)}</strong><span>${escape(model.training || 'See leaderboard for training budget')}</span></div><dl>${Object.entries(METRICS).map(([key, metric]) => `<div><dt>${metric.label}${key === 'visual' ? ' ↑' : ' ↓'}</dt><dd>${format(model[key], key)}</dd></div>`).join('')}</dl>`;
  }
  root.querySelector('[data-rx-scatter]').addEventListener('change', event => { scatterMetric = event.target.value; drawScatter(); });
  root.querySelector('[data-rx-distribution]').addEventListener('change', event => { distributionMetric = event.target.value; drawDistribution(); });
  drawScatter();
  drawDistribution();
  updateSelection();
  root.hidden = false;
}
