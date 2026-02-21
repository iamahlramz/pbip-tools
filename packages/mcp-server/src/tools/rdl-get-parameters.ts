import { parseRdl } from '@pbip-tools/rdl-parser';

export function rdlGetParameters(rdlXml: string, filePath: string) {
  const report = parseRdl(rdlXml, filePath);

  return report.parameters.map((p) => ({
    name: p.name,
    dataType: p.dataType,
    prompt: p.prompt,
    defaultValue: p.defaultValue,
    allowBlank: p.allowBlank,
    nullable: p.nullable,
    multiValue: p.multiValue,
    hidden: p.hidden,
    validValues: p.validValues
      ? {
          type: p.validValues.type,
          values: p.validValues.values,
          dataSetName: p.validValues.dataSetName,
          valueField: p.validValues.valueField,
          labelField: p.validValues.labelField,
        }
      : undefined,
  }));
}
