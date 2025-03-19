export interface ArrangerConfig {
  documentType: "file" | "analysis";
  extendedFields?: string[];
  tableColumns?: string[];
  facetFields?: string[];
}

export interface ArrangerBaseConfig {
  documentType: "file" | "analysis";
  index: string;
}

export interface ExtendedField {
  displayName: string;
  fieldName: string;
  isArray?: boolean;
}

export interface ArrangerExtendedConfig {
  extended: ExtendedField[];
}

export interface TableColumn {
  canChangeShow: boolean;
  fieldName: string;
  show: boolean;
  sortable: boolean;
  jsonPath?: string;
  query?: string;
  displayType?: string;
}

export interface ArrangerTableConfig {
  table: {
    columns: TableColumn[];
  };
}

export interface FacetAggregation {
  active: boolean;
  fieldName: string;
  show: boolean;
}

export interface ArrangerFacetsConfig {
  facets: {
    aggregations: FacetAggregation[];
  };
}
