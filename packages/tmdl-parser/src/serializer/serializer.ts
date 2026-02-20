import type {
  DatabaseNode,
  ModelNode,
  TableNode,
  RelationshipNode,
  ExpressionNode,
  CultureNode,
  RoleNode,
  ColumnNode,
  MeasureNode,
  PartitionNode,
  HierarchyNode,
  HierarchyLevelNode,
  CalculationGroupNode,
  CalculationItemNode,
  AnnotationNode,
  ChangedPropertyNode,
} from '@pbip-tools/core';

function indent(level: number): string {
  return '\t'.repeat(level);
}

function serializeAnnotations(annotations: AnnotationNode[], level: number): string[] {
  return annotations.map((a) => `${indent(level)}annotation ${a.name} = ${a.value}`);
}

function serializeChangedProperties(props: ChangedPropertyNode[], level: number): string[] {
  return props.map((p) => `${indent(level)}changedProperty = ${p.name}`);
}

function quoteName(name: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return name;
  }
  return `'${name}'`;
}

export function serializeDatabase(node: DatabaseNode): string {
  const lines: string[] = [];
  lines.push(`database ${quoteName(node.name)}`);
  lines.push(`${indent(1)}compatibilityLevel: ${node.compatibilityLevel}`);
  if (node.annotations) {
    lines.push('');
    lines.push(...serializeAnnotations(node.annotations, 1));
  }
  return lines.join('\n') + '\n';
}

export function serializeModel(node: ModelNode): string {
  const lines: string[] = [];
  lines.push(`model ${quoteName(node.name)}`);

  if (node.culture) lines.push(`${indent(1)}culture: ${node.culture}`);
  if (node.defaultPowerBIDataSourceVersion) {
    lines.push(
      `${indent(1)}defaultPowerBIDataSourceVersion: ${node.defaultPowerBIDataSourceVersion}`,
    );
  }
  if (node.discourageImplicitMeasures) {
    lines.push(`${indent(1)}discourageImplicitMeasures`);
  }
  if (node.dataAccessOptions && Object.keys(node.dataAccessOptions).length > 0) {
    lines.push(`${indent(1)}dataAccessOptions`);
    for (const [key, val] of Object.entries(node.dataAccessOptions)) {
      if (val === true) {
        lines.push(`${indent(2)}${key}`);
      } else {
        lines.push(`${indent(2)}${key}: ${val}`);
      }
    }
  }

  if (node.queryGroups) {
    lines.push('');
    for (const qg of node.queryGroups) {
      if (qg.docComment) {
        lines.push(`${indent(1)}/// ${qg.docComment}`);
      }
      lines.push(`${indent(1)}queryGroup ${quoteName(qg.name)}`);
    }
  }

  if (node.tableRefs) {
    lines.push('');
    for (const ref of node.tableRefs) {
      lines.push(`${indent(1)}ref table ${quoteName(ref.name)}`);
    }
  }

  if (node.annotations) {
    lines.push('');
    lines.push(...serializeAnnotations(node.annotations, 1));
  }

  return lines.join('\n') + '\n';
}

export function serializeTable(node: TableNode): string {
  const lines: string[] = [];
  lines.push(`table ${quoteName(node.name)}`);

  if (node.dataCategory) lines.push(`${indent(1)}dataCategory: ${node.dataCategory}`);
  if (node.lineageTag) lines.push(`${indent(1)}lineageTag: ${node.lineageTag}`);
  if (node.isHidden) lines.push(`${indent(1)}isHidden`);

  for (const col of node.columns) {
    lines.push('');
    lines.push(...serializeColumn(col, 1));
  }

  for (const measure of node.measures) {
    lines.push('');
    lines.push(...serializeMeasure(measure, 1));
  }

  for (const hier of node.hierarchies) {
    lines.push('');
    lines.push(...serializeHierarchy(hier, 1));
  }

  if (node.calculationGroup) {
    lines.push('');
    lines.push(...serializeCalculationGroup(node.calculationGroup, 1));
  }

  for (const part of node.partitions) {
    lines.push('');
    lines.push(...serializePartition(part, 1));
  }

  if (node.annotations) {
    lines.push('');
    lines.push(...serializeAnnotations(node.annotations, 1));
  }

  if (node.changedProperties) {
    lines.push(...serializeChangedProperties(node.changedProperties, 1));
  }

  return lines.join('\n') + '\n';
}

function serializeColumn(col: ColumnNode, level: number): string[] {
  const lines: string[] = [];

  if (col.docComment) {
    lines.push(`${indent(level)}/// ${col.docComment}`);
  }

  lines.push(`${indent(level)}column ${quoteName(col.name)}`);
  lines.push(`${indent(level + 1)}dataType: ${col.dataType}`);

  if (col.isKey) lines.push(`${indent(level + 1)}isKey`);
  if (col.isHidden) lines.push(`${indent(level + 1)}isHidden`);
  if (col.isNameInferred) lines.push(`${indent(level + 1)}isNameInferred`);
  if (col.isDataTypeInferred) lines.push(`${indent(level + 1)}isDataTypeInferred`);
  if (col.formatString) lines.push(`${indent(level + 1)}formatString: ${col.formatString}`);
  if (col.lineageTag) lines.push(`${indent(level + 1)}lineageTag: ${col.lineageTag}`);
  if (col.summarizeBy) lines.push(`${indent(level + 1)}summarizeBy: ${col.summarizeBy}`);
  if (col.sortByColumn) lines.push(`${indent(level + 1)}sortByColumn: ${col.sortByColumn}`);
  if (col.dataCategory) lines.push(`${indent(level + 1)}dataCategory: ${col.dataCategory}`);
  if (col.sourceColumn) lines.push(`${indent(level + 1)}sourceColumn: ${col.sourceColumn}`);

  if (col.annotations) {
    lines.push('');
    lines.push(...serializeAnnotations(col.annotations, level + 1));
  }

  if (col.changedProperties) {
    lines.push('');
    lines.push(...serializeChangedProperties(col.changedProperties, level + 1));
  }

  return lines;
}

function serializeMeasure(measure: MeasureNode, level: number): string[] {
  const lines: string[] = [];

  if (measure.docComment) {
    lines.push(`${indent(level)}/// ${measure.docComment}`);
  }

  const exprLines = measure.expression.split('\n');
  if (exprLines.length === 1 && !measure.expression.includes('\n')) {
    // Inline expression
    lines.push(`${indent(level)}measure ${quoteName(measure.name)} = ${measure.expression}`);
  } else {
    // Multi-line expression
    lines.push(`${indent(level)}measure ${quoteName(measure.name)} =`);
    for (const el of exprLines) {
      lines.push(`${indent(level + 1)}${el}`);
    }
  }

  if (measure.formatString !== undefined) {
    lines.push(`${indent(level + 1)}formatString: ${measure.formatString}`);
  }
  if (measure.lineageTag) lines.push(`${indent(level + 1)}lineageTag: ${measure.lineageTag}`);
  if (measure.displayFolder) {
    lines.push(`${indent(level + 1)}displayFolder: ${measure.displayFolder}`);
  }
  if (measure.isHidden) lines.push(`${indent(level + 1)}isHidden`);
  if (measure.description) lines.push(`${indent(level + 1)}description: ${measure.description}`);

  if (measure.annotations) {
    lines.push(...serializeAnnotations(measure.annotations, level + 1));
  }

  return lines;
}

function serializePartition(part: PartitionNode, level: number): string[] {
  const lines: string[] = [];
  const partType = part.source.type === 'calculated' ? 'calculated' : 'm';
  lines.push(`${indent(level)}partition ${quoteName(part.name)} = ${partType}`);

  if (part.mode) lines.push(`${indent(level + 1)}mode: ${part.mode}`);

  if (part.source.type === 'mCode' || part.source.type === 'calculated') {
    lines.push(`${indent(level + 1)}source =`);
    const sourceLines = part.source.expression.split('\n');
    for (const sl of sourceLines) {
      lines.push(`${indent(level + 2)}${sl}`);
    }
  }

  if (part.annotations) {
    lines.push(...serializeAnnotations(part.annotations, level + 1));
  }

  return lines;
}

function serializeHierarchy(hier: HierarchyNode, level: number): string[] {
  const lines: string[] = [];

  if (hier.docComment) {
    lines.push(`${indent(level)}/// ${hier.docComment}`);
  }

  lines.push(`${indent(level)}hierarchy ${quoteName(hier.name)}`);
  if (hier.lineageTag) lines.push(`${indent(level + 1)}lineageTag: ${hier.lineageTag}`);
  if (hier.isHidden) lines.push(`${indent(level + 1)}isHidden`);

  for (const lvl of hier.levels) {
    lines.push('');
    lines.push(...serializeHierarchyLevel(lvl, level + 1));
  }

  return lines;
}

function serializeHierarchyLevel(lvl: HierarchyLevelNode, level: number): string[] {
  const lines: string[] = [];
  lines.push(`${indent(level)}level ${quoteName(lvl.name)}`);
  lines.push(`${indent(level + 1)}ordinal: ${lvl.ordinal}`);
  lines.push(`${indent(level + 1)}column: ${lvl.column}`);
  if (lvl.lineageTag) lines.push(`${indent(level + 1)}lineageTag: ${lvl.lineageTag}`);
  return lines;
}

function serializeCalculationGroup(cg: CalculationGroupNode, level: number): string[] {
  const lines: string[] = [];
  lines.push(`${indent(level)}calculationGroup`);

  if (cg.precedence !== undefined) {
    lines.push(`${indent(level + 1)}precedence: ${cg.precedence}`);
  }

  for (const item of cg.items) {
    lines.push('');
    lines.push(...serializeCalculationItem(item, level + 1));
  }

  if (cg.columns) {
    for (const col of cg.columns) {
      lines.push('');
      lines.push(...serializeColumn(col, level));
    }
  }

  return lines;
}

function serializeCalculationItem(item: CalculationItemNode, level: number): string[] {
  const lines: string[] = [];

  const exprLines = item.expression.split('\n');
  if (exprLines.length === 1) {
    lines.push(`${indent(level)}calculationItem ${quoteName(item.name)} =`);
    lines.push(`${indent(level + 1)}${item.expression}`);
  } else {
    lines.push(`${indent(level)}calculationItem ${quoteName(item.name)} =`);
    for (const el of exprLines) {
      lines.push(`${indent(level + 1)}${el}`);
    }
  }

  if (item.ordinal !== undefined) {
    lines.push(`${indent(level + 1)}ordinal: ${item.ordinal}`);
  }

  if (item.formatStringExpression) {
    const fseLines = item.formatStringExpression.split('\n');
    if (fseLines.length === 1) {
      lines.push(`${indent(level + 1)}formatStringExpression = ${item.formatStringExpression}`);
    } else {
      lines.push(`${indent(level + 1)}formatStringExpression =`);
      for (const fl of fseLines) {
        lines.push(`${indent(level + 2)}${fl}`);
      }
    }
  }

  if (item.annotations) {
    lines.push(...serializeAnnotations(item.annotations, level + 1));
  }

  return lines;
}

export function serializeRelationships(nodes: RelationshipNode[]): string {
  const lines: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i > 0) lines.push('');
    lines.push(...serializeRelationship(nodes[i]));
  }
  return lines.join('\n') + '\n';
}

function serializeRelationship(rel: RelationshipNode): string[] {
  const lines: string[] = [];
  lines.push(`relationship ${quoteName(rel.name)}`);
  lines.push(`${indent(1)}fromColumn: ${rel.fromTable}.${rel.fromColumn}`);
  lines.push(`${indent(1)}toColumn: ${rel.toTable}.${rel.toColumn}`);

  if (rel.toCardinality) lines.push(`${indent(1)}toCardinality: ${rel.toCardinality}`);
  if (rel.crossFilteringBehavior) {
    lines.push(`${indent(1)}crossFilteringBehavior: ${rel.crossFilteringBehavior}`);
  }
  if (rel.isActive === false) lines.push(`${indent(1)}isActive: false`);
  if (rel.joinOnDateBehavior) {
    lines.push(`${indent(1)}joinOnDateBehavior: ${rel.joinOnDateBehavior}`);
  }
  if (rel.relyOnReferentialIntegrity) {
    lines.push(`${indent(1)}relyOnReferentialIntegrity`);
  }

  if (rel.annotations) {
    lines.push('');
    lines.push(...serializeAnnotations(rel.annotations, 1));
  }

  return lines;
}

export function serializeExpressions(nodes: ExpressionNode[]): string {
  const lines: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (i > 0) lines.push('');
    lines.push(...serializeExpression(nodes[i]));
  }
  return lines.join('\n') + '\n';
}

function serializeExpression(expr: ExpressionNode): string[] {
  const lines: string[] = [];

  const exprLines = expr.expression.split('\n');
  if (exprLines.length === 1) {
    lines.push(`expression ${quoteName(expr.name)} =`);
    lines.push(`${indent(2)}${expr.expression}`);
  } else {
    lines.push(`expression ${quoteName(expr.name)} =`);
    for (const el of exprLines) {
      lines.push(`${indent(2)}${el}`);
    }
  }

  if (expr.lineageTag) lines.push(`${indent(1)}lineageTag: ${expr.lineageTag}`);
  if (expr.queryGroup) lines.push(`${indent(1)}queryGroup: ${expr.queryGroup}`);
  if (expr.resultType) lines.push(`${indent(1)}resultType: ${expr.resultType}`);

  if (expr.annotations) {
    lines.push(...serializeAnnotations(expr.annotations, 1));
  }

  return lines;
}

export function serializeCulture(node: CultureNode): string {
  const lines: string[] = [];
  lines.push(`culture ${node.name}`);

  if (node.linguisticMetadata) {
    lines.push('');
    lines.push(`${indent(1)}linguisticMetadata =`);
    const metaLines = node.linguisticMetadata.split('\n');
    for (const ml of metaLines) {
      lines.push(`${indent(2)}${ml}`);
    }
  }

  return lines.join('\n') + '\n';
}

export function serializeRole(node: RoleNode): string {
  const lines: string[] = [];
  lines.push(`role ${quoteName(node.name)}`);
  lines.push(`${indent(1)}modelPermission: ${node.modelPermission}`);

  for (const tp of node.tablePermissions) {
    lines.push('');
    const expr = tp.filterExpression;
    if (expr.includes('\n')) {
      lines.push(`${indent(1)}tablePermission ${quoteName(tp.tableName)} =`);
      for (const exprLine of expr.split('\n')) {
        lines.push(`${indent(2)}${exprLine}`);
      }
    } else {
      lines.push(`${indent(1)}tablePermission ${quoteName(tp.tableName)} = ${expr}`);
    }

    if (tp.annotations && tp.annotations.length > 0) {
      for (const ann of tp.annotations) {
        lines.push(`${indent(2)}annotation ${ann.name} = ${ann.value}`);
      }
    }
  }

  if (node.members && node.members.length > 0) {
    for (const member of node.members) {
      lines.push('');
      lines.push(`${indent(1)}member ${quoteName(member.memberName)}`);
      if (member.identityProvider) {
        lines.push(`${indent(2)}identityProvider: ${member.identityProvider}`);
      }
    }
  }

  if (node.annotations && node.annotations.length > 0) {
    lines.push('');
    for (const ann of node.annotations) {
      lines.push(`${indent(1)}annotation ${ann.name} = ${ann.value}`);
    }
  }

  return lines.join('\n') + '\n';
}
