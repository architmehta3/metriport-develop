import { DocumentReference } from "@medplum/fhirtypes";
import { chunk } from "lodash";
import { capture } from "../../../shared/notifications";
import { makeFhirApi } from "../api/api-factory";
import {
  isoDateToFHIRDateQueryFrom,
  isoDateToFHIRDateQueryTo,
} from "@metriport/core/external/fhir/shared/index";

export async function getDocuments({
  cxId,
  patientId,
  from,
  to,
  documentIds,
}: {
  cxId: string;
  patientId?: string | string[];
  from?: string;
  to?: string;
  documentIds?: string[];
}): Promise<DocumentReference[]> {
  try {
    const api = makeFhirApi(cxId);
    const docs: DocumentReference[] = [];
    const chunksDocIds = documentIds && documentIds.length > 0 ? chunk(documentIds, 150) : [[]];

    for (const docIds of chunksDocIds) {
      const filtersAsStr = getFilters({ patientId, documentIds: docIds, from, to });
      for await (const page of api.searchResourcePages("DocumentReference", filtersAsStr)) {
        docs.push(...page);
      }
    }
    return docs;
  } catch (error) {
    const msg = `Error getting documents from FHIR server`;
    console.log(`${msg} - patientId: ${patientId}, error: ${error}`);
    capture.message(msg, { extra: { patientId, error }, level: "error" });
    throw error;
  }
}

export function getFilters({
  patientId: patientIdParam,
  documentIds = [],
  from,
  to,
}: {
  patientId?: string | string[];
  documentIds?: string[];
  from?: string;
  to?: string;
} = {}) {
  const filters = new URLSearchParams();
  const patientIds = Array.isArray(patientIdParam) ? patientIdParam : [patientIdParam];
  const patientIdsFiltered = patientIds.flatMap(id =>
    id && id.trim().length > 0 ? id.trim() : []
  );
  patientIdsFiltered.length && filters.append("patient", patientIdsFiltered.join(","));
  documentIds.length && filters.append(`_id`, documentIds.join(","));
  from && filters.append("date", isoDateToFHIRDateQueryFrom(from));
  to && filters.append("date", isoDateToFHIRDateQueryTo(to));
  const filtersAsStr = filters.toString();
  return filtersAsStr;
}
