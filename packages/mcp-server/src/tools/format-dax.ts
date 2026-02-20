import { formatDax } from '@pbip-tools/dax-formatter';
import type { DaxFormatOptions } from '@pbip-tools/dax-formatter';

export async function formatDaxTool(
  expression: string,
  listSeparator?: ',' | ';',
  decimalSeparator?: '.' | ',',
  lineStyle?: 'long' | 'short',
  spacingStyle?: 'spaceAfterFunction' | 'noSpaceAfterFunction',
) {
  const options: DaxFormatOptions = {};
  if (listSeparator) options.listSeparator = listSeparator;
  if (decimalSeparator) options.decimalSeparator = decimalSeparator;
  if (lineStyle) options.lineStyle = lineStyle;
  if (spacingStyle) options.spacingStyle = spacingStyle;

  return formatDax(expression, options);
}
