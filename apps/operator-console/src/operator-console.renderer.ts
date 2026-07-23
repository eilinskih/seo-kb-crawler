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
    section { background: #ffffff; border: 1px solid #d8dee7; border-radius: 8px; overflow: hidden; }
    .section-head { display: flex; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid #edf0f4; }
    .badge { font-size: 12px; text-transform: uppercase; letter-spacing: 0; color: #344054; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #edf0f4; text-align: left; vertical-align: top; }
    th { color: #526173; font-weight: 600; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; }
    .disabled { color: #8a97a8; }
    .enabled { color: #126b42; font-weight: 600; }
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
      ${model.warnings.map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join('')}
    </div>
    <div class="grid">
      ${model.sections.map(renderSection).join('')}
    </div>
  </main>
</body>
</html>`;
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
