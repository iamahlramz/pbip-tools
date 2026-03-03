export interface SvgTemplateParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color';
  description: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
}

export interface SvgTemplate {
  id: string;
  displayName: string;
  description: string;
  category: string;
  params: SvgTemplateParam[];
  generateDax: (params: Record<string, unknown>) => string;
}

function getParam(params: Record<string, unknown>, name: string, defaultValue: unknown): unknown {
  return params[name] ?? defaultValue;
}

export const SVG_TEMPLATES: SvgTemplate[] = [
  {
    id: 'progress-bar',
    displayName: 'Progress Bar',
    description:
      'Horizontal progress bar with RAG coloring. Requires a measure reference for the value (0-1 range).',
    category: 'KPI',
    params: [
      { name: 'valueMeasure', type: 'string', description: 'DAX measure reference returning 0-1 value', required: true },
      { name: 'width', type: 'number', description: 'SVG width in pixels', defaultValue: 200 },
      { name: 'height', type: 'number', description: 'SVG height in pixels', defaultValue: 20 },
      { name: 'bgColor', type: 'color', description: 'Background bar color', defaultValue: '%23E0E0E0' },
      { name: 'goodColor', type: 'color', description: 'Color when above target', defaultValue: '%2322C55E' },
      { name: 'warningColor', type: 'color', description: 'Color when at risk', defaultValue: '%23F59E0B' },
      { name: 'badColor', type: 'color', description: 'Color when behind target', defaultValue: '%23EF4444' },
      { name: 'warningThreshold', type: 'number', description: 'Threshold for warning color (0-1)', defaultValue: 0.7 },
      { name: 'goodThreshold', type: 'number', description: 'Threshold for good color (0-1)', defaultValue: 0.9 },
      { name: 'cornerRadius', type: 'number', description: 'Bar corner radius', defaultValue: 4 },
    ],
    generateDax: (params) => {
      const vm = params.valueMeasure as string;
      const w = getParam(params, 'width', 200);
      const h = getParam(params, 'height', 20);
      const bg = getParam(params, 'bgColor', '%23E0E0E0');
      const good = getParam(params, 'goodColor', '%2322C55E');
      const warn = getParam(params, 'warningColor', '%23F59E0B');
      const bad = getParam(params, 'badColor', '%23EF4444');
      const warnT = getParam(params, 'warningThreshold', 0.7);
      const goodT = getParam(params, 'goodThreshold', 0.9);
      const cr = getParam(params, 'cornerRadius', 4);

      return `VAR _Value = ${vm}
VAR _Pct = MIN ( MAX ( _Value, 0 ), 1 )
VAR _Width = ${w}
VAR _Height = ${h}
VAR _BarWidth = ROUND ( _Pct * _Width, 0 )
VAR _Color =
    SWITCH (
        TRUE (),
        _Pct >= ${goodT}, "${good}",
        _Pct >= ${warnT}, "${warn}",
        "${bad}"
    )
RETURN
    "data:image/svg+xml;utf8," &
    "<svg xmlns='http://www.w3.org/2000/svg' width='" & _Width & "' height='" & _Height & "'>" &
    "<rect width='" & _Width & "' height='" & _Height & "' rx='${cr}' fill='${bg}'/>" &
    "<rect width='" & _BarWidth & "' height='" & _Height & "' rx='${cr}' fill='" & _Color & "'/>" &
    "</svg>"`;
    },
  },
  {
    id: 'kpi-card',
    displayName: 'KPI Card',
    description:
      'Card showing a KPI value with comparison indicator, optional bullet chart track, and dark/light mode support.',
    category: 'KPI',
    params: [
      { name: 'valueMeasure', type: 'string', description: 'DAX measure reference for current value', required: true },
      { name: 'targetMeasure', type: 'string', description: 'DAX measure reference for target value', required: true },
      { name: 'title', type: 'string', description: 'Card title text', defaultValue: 'KPI' },
      { name: 'format', type: 'string', description: 'FORMAT() pattern for value display', defaultValue: '#,##0' },
      { name: 'goodColor', type: 'color', description: 'Color when above target', defaultValue: '%2322C55E' },
      { name: 'badColor', type: 'color', description: 'Color when below target', defaultValue: '%23EF4444' },
      { name: 'width', type: 'number', description: 'SVG width', defaultValue: 300 },
      { name: 'height', type: 'number', description: 'SVG height', defaultValue: 120 },
    ],
    generateDax: (params) => {
      const vm = params.valueMeasure as string;
      const tm = params.targetMeasure as string;
      const title = getParam(params, 'title', 'KPI');
      const fmt = getParam(params, 'format', '#,##0');
      const good = getParam(params, 'goodColor', '%2322C55E');
      const bad = getParam(params, 'badColor', '%23EF4444');
      const w = getParam(params, 'width', 300);
      const h = getParam(params, 'height', 120);

      return `VAR _Value = ${vm}
VAR _Target = ${tm}
VAR _Pct = DIVIDE ( _Value, _Target, 0 )
VAR _Color = IF ( _Pct >= 1, "${good}", "${bad}" )
VAR _Arrow = IF ( _Pct >= 1, "&#9650;", "&#9660;" )
VAR _FormattedValue = FORMAT ( _Value, "${fmt}" )
VAR _FormattedPct = FORMAT ( _Pct, "0.0%" )
RETURN
    "data:image/svg+xml;utf8," &
    "<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>" &
    "<rect width='${w}' height='${h}' rx='8' fill='%23FFFFFF' stroke='%23E5E7EB'/>" &
    "<text x='16' y='28' font-family='Segoe UI' font-size='12' fill='%236B7280'>${title}</text>" &
    "<text x='16' y='65' font-family='Segoe UI' font-size='28' font-weight='bold' fill='%23111827'>" & _FormattedValue & "</text>" &
    "<text x='16' y='95' font-family='Segoe UI' font-size='14' fill='" & _Color & "'>" & _Arrow & " " & _FormattedPct & " vs target</text>" &
    "</svg>"`;
    },
  },
  {
    id: 'status-icon',
    displayName: 'Status Icon',
    description:
      'Conditional status icon (circle with checkmark, warning, or X) based on a value threshold.',
    category: 'Status',
    params: [
      { name: 'valueMeasure', type: 'string', description: 'DAX measure reference', required: true },
      { name: 'goodThreshold', type: 'number', description: 'Threshold for good status', defaultValue: 0.9 },
      { name: 'warningThreshold', type: 'number', description: 'Threshold for warning status', defaultValue: 0.7 },
      { name: 'size', type: 'number', description: 'Icon diameter in pixels', defaultValue: 24 },
      { name: 'goodColor', type: 'color', description: 'Good status color', defaultValue: '%2322C55E' },
      { name: 'warningColor', type: 'color', description: 'Warning status color', defaultValue: '%23F59E0B' },
      { name: 'badColor', type: 'color', description: 'Bad status color', defaultValue: '%23EF4444' },
    ],
    generateDax: (params) => {
      const vm = params.valueMeasure as string;
      const goodT = getParam(params, 'goodThreshold', 0.9);
      const warnT = getParam(params, 'warningThreshold', 0.7);
      const sz = getParam(params, 'size', 24);
      const good = getParam(params, 'goodColor', '%2322C55E');
      const warn = getParam(params, 'warningColor', '%23F59E0B');
      const bad = getParam(params, 'badColor', '%23EF4444');
      const r = Number(sz) / 2;

      return `VAR _Value = ${vm}
VAR _Color =
    SWITCH (
        TRUE (),
        _Value >= ${goodT}, "${good}",
        _Value >= ${warnT}, "${warn}",
        "${bad}"
    )
VAR _Icon =
    SWITCH (
        TRUE (),
        _Value >= ${goodT}, "<path d='M7 12l3 3 7-7' stroke='white' stroke-width='2' fill='none'/>",
        _Value >= ${warnT}, "<text x='${r}' y='${Number(r) + 5}' text-anchor='middle' fill='white' font-size='16' font-weight='bold'>!</text>",
        "<path d='M8 8l8 8M16 8l-8 8' stroke='white' stroke-width='2'/>"
    )
RETURN
    "data:image/svg+xml;utf8," &
    "<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}'>" &
    "<circle cx='${r}' cy='${r}' r='${r}' fill='" & _Color & "'/>" &
    _Icon &
    "</svg>"`;
    },
  },
  {
    id: 'toggle-switch',
    displayName: 'Toggle Switch',
    description:
      'A toggle switch visual that shows on/off state based on a boolean measure.',
    category: 'Interactive',
    params: [
      { name: 'valueMeasure', type: 'string', description: 'DAX measure returning TRUE/FALSE or 1/0', required: true },
      { name: 'onColor', type: 'color', description: 'Color when ON', defaultValue: '%234F46E5' },
      { name: 'offColor', type: 'color', description: 'Color when OFF', defaultValue: '%23D1D5DB' },
      { name: 'width', type: 'number', description: 'Toggle width', defaultValue: 44 },
      { name: 'height', type: 'number', description: 'Toggle height', defaultValue: 24 },
    ],
    generateDax: (params) => {
      const vm = params.valueMeasure as string;
      const onC = getParam(params, 'onColor', '%234F46E5');
      const offC = getParam(params, 'offColor', '%23D1D5DB');
      const w = getParam(params, 'width', 44);
      const h = getParam(params, 'height', 24);
      const r = Number(h) / 2;
      const knobR = r - 2;

      return `VAR _IsOn = ${vm}
VAR _Color = IF ( _IsOn, "${onC}", "${offC}" )
VAR _KnobX = IF ( _IsOn, ${Number(w) - r}, ${r} )
RETURN
    "data:image/svg+xml;utf8," &
    "<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>" &
    "<rect width='${w}' height='${h}' rx='${r}' fill='" & _Color & "'/>" &
    "<circle cx='" & _KnobX & "' cy='${r}' r='${knobR}' fill='white'/>" &
    "</svg>"`;
    },
  },
  {
    id: 'button',
    displayName: 'Button',
    description:
      'A styled button with rounded corners. Use with image visual and dataCategory ImageUrl.',
    category: 'Interactive',
    params: [
      { name: 'label', type: 'string', description: 'Button text label', required: true },
      { name: 'bgColor', type: 'color', description: 'Background color', defaultValue: '%234F46E5' },
      { name: 'textColor', type: 'color', description: 'Text color', defaultValue: '%23FFFFFF' },
      { name: 'width', type: 'number', description: 'Button width', defaultValue: 120 },
      { name: 'height', type: 'number', description: 'Button height', defaultValue: 36 },
      { name: 'cornerRadius', type: 'number', description: 'Corner radius', defaultValue: 6 },
      { name: 'fontSize', type: 'number', description: 'Font size in pixels', defaultValue: 13 },
    ],
    generateDax: (params) => {
      const label = params.label as string;
      const bg = getParam(params, 'bgColor', '%234F46E5');
      const text = getParam(params, 'textColor', '%23FFFFFF');
      const w = getParam(params, 'width', 120);
      const h = getParam(params, 'height', 36);
      const cr = getParam(params, 'cornerRadius', 6);
      const fs = getParam(params, 'fontSize', 13);
      const cy = Number(h) / 2 + Number(fs) / 3;

      return `"data:image/svg+xml;utf8," &
    "<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>" &
    "<rect width='${w}' height='${h}' rx='${cr}' fill='${bg}'/>" &
    "<text x='${Number(w) / 2}' y='${cy}' text-anchor='middle' font-family='Segoe UI' font-size='${fs}' fill='${text}'>${label}</text>" &
    "</svg>"`;
    },
  },
];

export function getSvgTemplate(templateId: string): SvgTemplate | undefined {
  return SVG_TEMPLATES.find((t) => t.id === templateId);
}

export function listSvgTemplates(): Array<{
  id: string;
  displayName: string;
  description: string;
  category: string;
  params: SvgTemplateParam[];
}> {
  return SVG_TEMPLATES.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    description: t.description,
    category: t.category,
    params: t.params,
  }));
}
