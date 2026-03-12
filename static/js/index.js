function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
  const button = document.querySelector('.scroll-to-top');
  if (!button) return;
  if (window.pageYOffset > 260) {
    button.classList.add('visible');
  } else {
    button.classList.remove('visible');
  }
});

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function labelMap(typeKey) {
  const map = {
    translation: 'Failure Type: Translation',
    gripper_force_open: 'Failure Type: Gripper Force Open',
    gripper_delay_close: 'Failure Type: Gripper Delay Close',
    gripper_weak_close: 'Failure Type: Gripper Weak Close'
  };
  return map[typeKey] || typeKey;
}

function shuffleSamples(samples) {
  const arr = samples.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderLabelFields(fields) {
  const entries = Object.entries(fields || {});
  if (entries.length === 0) {
    return '<div class="label-item"><span class="label-key">Label</span><span class="label-value">N/A</span></div>';
  }

  return entries
    .map(([key, value]) => {
      return `
        <div class="label-item">
          <span class="label-key">${escapeHtml(key)}</span>
          <span class="label-value">${escapeHtml(String(value))}</span>
        </div>
      `;
    })
    .join('');
}

function updateCard(card, sample) {
  const failVideo = card.querySelector('.video-fail');
  const gtVideo = card.querySelector('.video-gt');
  const labelGrid = card.querySelector('.label-grid');
  const summaryBox = card.querySelector('.summary-box');

  failVideo.src = sample.fail_video;
  gtVideo.src = sample.gt_video;
  failVideo.load();
  gtVideo.load();

  labelGrid.innerHTML = renderLabelFields(sample.label_fields);
  summaryBox.textContent = sample.summary || 'No summary available.';
}

function createTypeCard(typeData) {
  const card = document.createElement('article');
  card.className = 'failure-card';
  const displayedSamples = shuffleSamples(typeData.samples || []);

  card.innerHTML = `
    <div class="failure-card-head">
      <h3>${escapeHtml(labelMap(typeData.type_key))}</h3>
    </div>
    <div class="failure-card-body">
      <div class="control-row">
        <label>Task Instruction</label>
        <select class="instruction-select"></select>
      </div>

      <div class="compare-grid">
        <div class="video-card">
          <p class="video-label">Fail</p>
          <video class="video-fail" controls preload="metadata" muted loop playsinline></video>
        </div>
        <div class="video-card">
          <p class="video-label">Success (GT)</p>
          <video class="video-gt" controls preload="metadata" muted loop playsinline></video>
        </div>
      </div>

      <div class="label-block">
        <div class="label-grid"></div>
        <div class="summary-box"></div>
      </div>
    </div>
  `;

  const select = card.querySelector('.instruction-select');
  displayedSamples.forEach((sample, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${index + 1}. ${sample.instruction}`;
    select.appendChild(option);
  });

  select.addEventListener('change', function () {
    const chosen = displayedSamples[Number(select.value)] || displayedSamples[0];
    updateCard(card, chosen);
  });

  if (displayedSamples.length > 0) {
    updateCard(card, displayedSamples[0]);
  }
  return card;
}

async function setupFailureExplorer() {
  const root = document.getElementById('failure-explorer-root');
  if (!root) return;

  try {
    let manifest = null;
    let fetchError = null;

    try {
      const response = await fetch('static/webpage_data/manifest.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      manifest = await response.json();
    } catch (error) {
      fetchError = error;
      if (window.DREAM2FIX_MANIFEST) {
        manifest = window.DREAM2FIX_MANIFEST;
      }
    }

    if (!manifest) {
      const hint = window.location.protocol === 'file:' ? ' Open via a local web server or keep using manifest.js fallback.' : '';
      throw new Error(`Failed to load manifest.${hint} ${fetchError ? fetchError.message : ''}`.trim());
    }

    const types = manifest.types || [];

    root.innerHTML = '';

    const desiredOrder = [
      'translation',
      'gripper_force_open',
      'gripper_delay_close',
      'gripper_weak_close'
    ];

    const sortedTypes = desiredOrder
      .map((key) => types.find((t) => t.type_key === key))
      .filter(Boolean);

    sortedTypes.forEach((typeData) => {
      root.appendChild(createTypeCard(typeData));
    });
  } catch (error) {
    root.innerHTML = `<div class="loading-state">Failed to load explorer data. ${escapeHtml(error.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setupFailureExplorer();
});
