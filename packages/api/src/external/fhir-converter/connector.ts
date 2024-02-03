import { MedicalDataSource } from "@metriport/core/external/index";

export enum FHIRConverterSourceDataType {
  cda = "cda",
  hl7v2 = "hl7v2",
}

export type FHIRConverterRequest = {
  cxId: string;
  patientId: string;
  documentId: string;
  sourceType: FHIRConverterSourceDataType;
  payload: string;
  template: string;
  unusedSegments: string;
  invalidAccess: string;
  requestId?: string;
  source?: MedicalDataSource;
};

export interface FHIRConverterConnector {
  requestConvert(req: FHIRConverterRequest): Promise<void>;
}
