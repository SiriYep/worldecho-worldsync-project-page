const METRICS = {
  gated: { label: 'Gated error', direction: 'lower is better', digits: 4 },
  raw: { label: 'Raw NDTW', direction: 'lower is better', digits: 4 },
  visual: { label: 'Visual pass', direction: 'higher is better', digits: 2, suffix: '%' },
};
const COLORS = ['#15806e', '#4575b4', '#b06e24', '#9c5f9e', '#ca6251', '#75823b', '#677b88'];
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
  const colored = models.map((model, i) => ({ ...model, color: COLORS[i % COLORS.length] }));
  const options = keys => keys.map(key => `<option value="${key}">${METRICS[key].label}${key === 'visual' ? ' ↑' : ' ↓'}</option>`).join('');
  root.classList.add('results-explorer');
  root.innerHTML = `
    <div class="rx-heading"><div><p class="kicker">Explore the results</p><h3>Two views of model performance</h3></div><p>Choose a metric. Select a model to inspect its published result.</p></div>
    <div class="rx-grid">
      <figure class="rx-panel">
        <figcaption><div><span class="rx-number">01 / TRADE-OFF</span><h4>Action following × visual integrity</h4></div><label>X axis <select data-rx-scatter aria-label="Scatter plot horizontal metric">${options(['gated', 'raw'])}</select></label></figcaption>
        <svg class="rx-scatter" viewBox="0 0 520 325" role="img" aria-labelledby="${uid}-scatter-title ${uid}-scatter-description">
          <title id="${uid}-scatter-title">Action following and visual integrity by model</title>
          <desc id="${uid}-scatter-description"></desc>
          <g data-rx-scatter-axes></g><g data-rx-scatter-points></g>
        </svg>
        <p class="rx-caption">Each point is one model. Toward the upper left is better.</p>
      </figure>
      <figure class="rx-panel">
        <figcaption><div><span class="rx-number">02 / DISTRIBUTION</span><h4>Where the model averages fall</h4></div><label>Metric <select data-rx-distribution aria-label="Distribution plot metric">${options(Object.keys(METRICS))}</select></label></figcaption>
        <svg class="rx-distribution" viewBox="0 0 520 325" role="img" aria-labelledby="${uid}-distribution-title ${uid}-distribution-description">
          <title id="${uid}-distribution-title">Distribution of displayed model averages</title>
          <desc id="${uid}-distribution-description"></desc>
          <g data-rx-distribution-axes></g><g data-rx-distribution-points></g>
        </svg>
        <p class="rx-caption">One dot per model; vertical offsets separate nearby values. The dashed line marks the median.</p>
      </figure>
    </div>
    <div class="rx-legend" role="group" aria-label="Select a model in both plots"></div>
    <div class="rx-detail" aria-live="polite" aria-atomic="true"></div>
    <p class="rx-source">Published task-macro averages across 50 RoboTwin tasks; ${models.length} displayed models. The distribution is across model averages. Training data and update budgets differ; see the leaderboard above.</p>`;

  const legend = root.querySelector('.rx-legend');
  for (const model of colored) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.rxModel = model.id;
    button.style.setProperty('--model-color', model.color);
    button.innerHTML = `<span class="rx-swatch" aria-hidden="true"></span><span>${escape(model.name)}${model.ours ? ' <small>ours</small>' : ''}</span>`;
    button.addEventListener('click', () => { selected = model.id; updateSelection(); });
    legend.append(button);
  }
  for (const type of ['scatter', 'distribution']) {
    const group = root.querySelector(`[data-rx-${type}-points]`);
    for (const model of colored) {
      const point = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      point.classList.add('rx-point');
      point.dataset.rxModel = model.id;
      point.style.setProperty('--model-color', model.color);
      point.innerHTML = `<circle class="rx-point-halo" r="12"/><circle class="rx-point-dot" r="6"/><title>${escape(model.name)}</title>`;
      point.addEventListener('click', () => { selected = model.id; updateSelection(); });
      group.append(point);
    }
  }

  function drawScatter() {
    const xAxis = niceAxis(colored.map(model => model[scatterMetric]), { includeZero: true });
    const yAxis = niceAxis(colored.map(model => model.visual));
    const x = value => scale(value, xAxis.domain, 62, 485);
    const y = value => scale(value, yAxis.domain, 258, 38);
    root.querySelector('[data-rx-scatter-axes]').innerHTML = `
      ${yAxis.ticks.map(value => `<line class="rx-gridline" x1="62" x2="485" y1="${y(value)}" y2="${y(value)}"/><text x="49" y="${y(value) + 4}" text-anchor="end">${tickLabel(value, yAxis)}</text>`).join('')}
      <line class="rx-axis" x1="62" x2="485" y1="258" y2="258"/>
      ${xAxis.ticks.map(value => `<line class="rx-axis" x1="${x(value)}" x2="${x(value)}" y1="258" y2="264"/><text x="${x(value)}" y="281" text-anchor="middle">${tickLabel(value, xAxis)}</text>`).join('')}
      <text class="rx-axis-label" x="62" y="18">Visual pass (%) ↑</text>
      <text class="rx-axis-label" x="273.5" y="314" text-anchor="middle">${METRICS[scatterMetric].label} ↓</text>`;
    colored.forEach(model => {
      const point = [...root.querySelectorAll('[data-rx-scatter-points] .rx-point')].find(item => item.dataset.rxModel === model.id);
      point.style.transform = `translate(${x(model[scatterMetric])}px, ${y(model.visual)}px)`;
      point.querySelector('title').textContent = `${model.name}: ${format(model[scatterMetric], scatterMetric)}, visual pass ${format(model.visual, 'visual')}`;
    });
    root.querySelector(`#${uid}-scatter-description`).textContent = `${models.length} model averages. Horizontal axis: ${METRICS[scatterMetric].label}, lower is better. Vertical axis: visual pass percentage, higher is better. Use the model buttons below for exact values.`;
  }

  function drawDistribution() {
    const values = colored.map(model => model[distributionMetric]);
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
    // Pack exact x values into a small set of lanes; offsets are not observations.
    const placed = [];
    const offsets = [0, -24, 24, -48, 48, -72, 72];
    for (const model of [...colored].sort((a, b) => a[distributionMetric] - b[distributionMetric])) {
      const position = x(model[distributionMetric]);
      let lane = offsets.findIndex((_, candidate) => !placed.some(item => item.lane === candidate && Math.abs(item.x - position) < 25));
      if (lane < 0) lane = placed.length % offsets.length;
      placed.push({ x: position, lane });
      const point = [...root.querySelectorAll('[data-rx-distribution-points] .rx-point')].find(item => item.dataset.rxModel === model.id);
      point.style.transform = `translate(${position}px, ${173 + offsets[lane]}px)`;
      point.querySelector('title').textContent = `${model.name}: ${format(model[distributionMetric], distributionMetric)}`;
    }
    root.querySelector(`#${uid}-distribution-description`).textContent = `${summary.count} exact model-average values for ${METRICS[distributionMetric].label}. Median ${format(summary.median, distributionMetric)}. Vertical offsets only separate dots; they do not encode data. Use the model buttons below for exact values.`;
  }

  function updateSelection() {
    root.querySelectorAll('[data-rx-model]').forEach(element => {
      const active = element.dataset.rxModel === selected;
      element.classList.toggle('is-selected', active);
      if (element.tagName === 'BUTTON') element.setAttribute('aria-pressed', String(active));
    });
    const model = colored.find(item => item.id === selected);
    root.querySelector('.rx-detail').innerHTML = `<div class="rx-selected-name"><span class="rx-number">SELECTED MODEL</span><strong>${escape(model.name)}</strong><span>${escape(model.training || 'See leaderboard for training budget')}</span></div><dl>${Object.entries(METRICS).map(([key, metric]) => `<div><dt>${metric.label}${key === 'visual' ? ' ↑' : ' ↓'}</dt><dd>${format(model[key], key)}</dd></div>`).join('')}</dl>`;
  }
  root.querySelector('[data-rx-scatter]').addEventListener('change', event => { scatterMetric = event.target.value; drawScatter(); });
  root.querySelector('[data-rx-distribution]').addEventListener('change', event => { distributionMetric = event.target.value; drawDistribution(); });
  drawScatter();
  drawDistribution();
  updateSelection();
  root.hidden = false;
}
