// --- Visual Binding Types ---

export type BindingLocation =
  | { type: 'projection'; role: string }
  | { type: 'sort' }
  | { type: 'visualObject'; objectName: string; propertyName: string }
  | { type: 'containerObject'; objectName: string; propertyName: string }
  | { type: 'referenceLine'; objectName: string }
  | { type: 'filter' };

export interface VisualBinding {
  entity: string;
  property: string;
  queryRef: string;
  nativeQueryRef?: string;
  fieldType?: 'Measure' | 'Column' | 'Aggregation' | 'HierarchyLevel';
  location: BindingLocation;
}

export interface VisualInfo {
  visualId: string;
  pageId: string;
  pagePath: string;
  visualType: string;
  title?: string;
  bindings: VisualBinding[];
}

export interface PageInfo {
  pageId: string;
  displayName?: string;
  visuals: VisualInfo[];
}

// --- Binding Operations ---

export interface BindingUpdateOp {
  oldEntity: string;
  oldProperty: string;
  newEntity: string;
  newProperty: string;
}

export interface BindingAuditResult {
  visual: { visualId: string; pageId: string; visualType: string };
  binding: VisualBinding;
  issue: 'missing_table' | 'missing_measure' | 'missing_column';
}
