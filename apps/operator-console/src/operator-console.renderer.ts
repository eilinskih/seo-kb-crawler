import { OperatorConsoleViewModel } from './operator-console.types';

export function renderOperatorConsoleHtml(
  model: OperatorConsoleViewModel,
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(model.title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f8fa; color: #17202a; }
    header { padding: 24px 32px 18px; border-bottom: 1px solid #d8dee7; background: #ffffff; }
    main { padding: 24px 32px 40px; }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; }
    h2 { margin: 0; font-size: 16px; }
    p { margin: 0; color: #526173; }
    .warnings { display: grid; gap: 8px; margin: 18px 0 24px; }
    .warning { padding: 10px 12px; border: 1px solid #d8dee7; background: #ffffff; border-left: 4px solid #2f80ed; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .wide { margin-bottom: 16px; }
    section { background: #ffffff; border: 1px solid #d8dee7; border-radius: 8px; overflow: hidden; }
    .section-head { display: flex; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid #edf0f4; }
    .badge { font-size: 12px; text-transform: uppercase; letter-spacing: 0; color: #344054; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #edf0f4; text-align: left; vertical-align: top; }
    th { color: #526173; font-weight: 600; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; }
    .disabled { color: #8a97a8; }
    .enabled { color: #126b42; font-weight: 600; }
    .topic-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; padding: 16px; border-bottom: 1px solid #edf0f4; }
    label { display: grid; gap: 6px; color: #526173; font-size: 12px; font-weight: 600; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #cbd3df; border-radius: 6px; padding: 8px 10px; font: inherit; color: #17202a; }
    textarea { resize: vertical; }
    button { border: 1px solid #1f6feb; background: #1f6feb; color: #ffffff; border-radius: 6px; padding: 8px 10px; font: inherit; font-weight: 600; cursor: pointer; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions form { margin: 0; }
    .empty { padding: 16px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(model.title)}</h1>
    <p>${escapeHtml(model.subtitle)}</p>
    <p>Generated ${escapeHtml(model.generatedAt)}</p>
  </header>
  <main>
    <div class="warnings">
      ${model.flash ? `<div class="warning">${escapeHtml(model.flash)}</div>` : ''}
      ${model.warnings.map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join('')}
    </div>
    ${renderTopicWorkflow(model)}
    <div class="grid">
      ${model.sections.map(renderSection).join('')}
    </div>
  </main>
</body>
</html>`;
}

function renderTopicWorkflow(model: OperatorConsoleViewModel): string {
  return `<section id="topic-workflows" class="wide">
  <div class="section-head">
    <div>
      <h2>Topic Workflows</h2>
      <p>Create topics and run bounded lifecycle actions through the Topic API.</p>
    </div>
    <span class="badge">available</span>
  </div>
  <form method="post" action="/topics" class="topic-form">
    <label>Slug<input name="slug" required placeholder="laser-hair-removal-poland"></label>
    <label>Name<input name="name" required placeholder="Laser Hair Removal Poland"></label>
    <label>Language<input name="language" value="en" required></label>
    <label>Country<input name="countryCode" value="US" required></label>
    <label>Max pages<input name="maxPages" type="number" min="1" max="10000" value="100" required></label>
    <label>Description<input name="description" placeholder="Internal research topic"></label>
    <label>Seed URLs<textarea name="seedUrls" rows="3" placeholder="https://example.com/"></textarea></label>
    <label>Seed keywords<textarea name="seedKeywords" rows="3" placeholder="laser hair removal&#10;laser hair removal cost"></textarea></label>
    <button type="submit">Create topic</button>
  </form>
  ${renderTopicTable(model)}
</section>`;
}

function renderTopicTable(model: OperatorConsoleViewModel): string {
  if (model.topics.length === 0) {
    return '<p class="empty">No topics loaded from the Topic API.</p>';
  }
  return `<table>
    <thead>
      <tr><th>Topic</th><th>Status</th><th>Version</th><th>Updated</th><th>Actions</th></tr>
    </thead>
    <tbody>
      ${model.topics.map((topic) => `<tr>
        <td><strong>${escapeHtml(topic.name)}</strong><br><code>${escapeHtml(topic.slug)}</code><br><small>${escapeHtml(topic.description ?? '')}</small></td>
        <td>${escapeHtml(topic.status)}</td>
        <td>${escapeHtml(String(topic.configurationVersion))}</td>
        <td>${escapeHtml(topic.updatedAt)}</td>
        <td class="actions">${renderTopicActions(topic.id, topic.status)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderTopicActions(topicId: string, status: string): string {
  const encoded = encodeURIComponent(topicId);
  const actions = [
    status === 'active'
      ? formButton(`/topics/${encoded}/pause`, 'Pause')
      : '',
    status !== 'archived'
      ? formButton(`/topics/${encoded}/archive`, 'Archive')
      : '',
    status === 'paused' || status === 'archived'
      ? formButton(`/topics/${encoded}/reactivate`, 'Reactivate')
      : '',
  ].filter(Boolean);
  return actions.length > 0
    ? actions.join('')
    : '<span class="disabled">No lifecycle action</span>';
}

function formButton(action: string, label: string): string {
  return `<form method="post" action="${escapeHtml(action)}"><button type="submit">${escapeHtml(label)}</button></form>`;
}

function renderSection(section: OperatorConsoleViewModel['sections'][number]): string {
  return `<section id="${escapeHtml(section.id)}">
  <div class="section-head">
    <div>
      <h2>${escapeHtml(section.title)}</h2>
      <p>${escapeHtml(section.summary)}</p>
    </div>
    <span class="badge">${escapeHtml(section.status)}</span>
  </div>
  <table>
    <thead>
      <tr><th>Action</th><th>Endpoint</th><th>Owner</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${section.actions.map((action) => `<tr>
        <td>${escapeHtml(action.label)}<br><small>${escapeHtml(action.note)}</small></td>
        <td><code>${escapeHtml(action.method)} ${escapeHtml(action.path)}</code></td>
        <td>${escapeHtml(action.owner)}</td>
        <td class="${action.enabled ? 'enabled' : 'disabled'}">${action.enabled ? 'Enabled' : 'Planned'}${action.bounded ? '<br><small>Bounded</small>' : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</section>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}
