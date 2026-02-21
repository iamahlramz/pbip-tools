/**
 * Cross-format field reference — bridges PBIP visual bindings and RDL dataset fields.
 * Both formats resolve to this common type for cross-format operations.
 */
export interface FieldRef {
  /** Table name in the semantic model */
  entity: string;
  /** Measure or column name */
  property: string;
}
