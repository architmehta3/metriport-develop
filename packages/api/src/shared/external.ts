import { Document } from "@metriport/commonwell-sdk";
import { getOrCreateDocRefMapping } from "../command/medical/docref-mapping/get-docref-mapping";
import { MedicalDataSource } from "@metriport/core/external/index";

/**
 * @deprecated Use @metriport/core instead
 */
export const createS3FileName = (cxId: string, patientId: string, fileName: string): string => {
  return `${cxId}/${patientId}/${cxId}_${patientId}_${fileName}`;
};

export const mapDocRefToMetriport = async ({
  cxId,
  patientId,
  requestId,
  document,
  source,
}: {
  cxId: string;
  patientId: string;
  requestId: string;
  document: Document;
  source: MedicalDataSource;
}): Promise<{ originalId: string; metriportId: string }> => {
  const id = document.content?.masterIdentifier?.value || document.id;
  const docRef = { cxId, patientId, requestId, externalId: id, source };
  const existingDocRef = await getOrCreateDocRefMapping(docRef);
  return { originalId: id, metriportId: existingDocRef.id };
};
