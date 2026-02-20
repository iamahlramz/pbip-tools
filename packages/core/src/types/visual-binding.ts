// Reserved for Phase 2 — visual.json types will go here

export interface VisualBinding {
  entity: string;
  property: string;
  queryRef: string;
  nativeQueryRef?: string;
}

export interface VisualInfo {
  visualId: string;
  pageId: string;
  visualType: string;
  bindings: VisualBinding[];
}
