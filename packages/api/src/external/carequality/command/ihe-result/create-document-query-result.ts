import { DocumentQueryRespFromExternalGW } from "@metriport/ihe-gateway-sdk";
import { DocumentQueryResultModel } from "../../models/document-query-result";
import { DefaultPayload } from "./shared";

export type CreateDocumentQueryPayload = {
  defaultPayload: DefaultPayload;
  status: string;
  response: DocumentQueryRespFromExternalGW;
};

export async function createDocumentQueryResult(
  payload: CreateDocumentQueryPayload
): Promise<DocumentQueryResultModel> {
  return await DocumentQueryResultModel.create({
    ...payload.defaultPayload,
    status: payload.status,
    data: payload.response,
  });
}
