import { validateDax } from '@pbip-tools/dax-formatter';

export function validateDaxTool(expression: string) {
  return validateDax(expression);
}
