import * as z from "zod";
import {
  BaseResponse,
  baseResponseSchema,
  baseErrorResponseSchema,
  xcaGatewaySchema,
  documentReferenceSchema,
  DocumentReference,
} from "../shared";

// TO EXTERNAL GATEWAY
const documentQueryRespToExternalGWSuccessfulSchema = baseResponseSchema.extend({
  extrinsicObjectXmls: z.array(z.string()),
});

export type DocumentQueryRespToExternalGWSuccessful = z.infer<
  typeof documentQueryRespToExternalGWSuccessfulSchema
>;

const documentQueryRespToExternalGWFaultSchema = baseErrorResponseSchema;

export type DocumentQueryRespToExternalGWFault = z.infer<
  typeof documentQueryRespToExternalGWFaultSchema
>;

export const documentQueryRespToExternalGWSchema = z.union([
  documentQueryRespToExternalGWSuccessfulSchema,
  documentQueryRespToExternalGWFaultSchema,
]);

export type DocumentQueryRespToExternalGW = z.infer<typeof documentQueryRespToExternalGWSchema>;

// FROM EXTERNAL GATEWAY
const documentQueryRespFromExternalSuccessfulSchema = baseResponseSchema.extend({
  documentReference: z.array(documentReferenceSchema),
  gateway: xcaGatewaySchema,
});

const documentQueryRespFromExternalFaultSchema = baseErrorResponseSchema.extend({
  documentReference: z.never(),
  gateway: xcaGatewaySchema,
});

export const documentQueryRespFromExternalGWSchema = z.union([
  documentQueryRespFromExternalSuccessfulSchema,
  documentQueryRespFromExternalFaultSchema,
]);

export type DocumentQueryRespFromExternalGW = z.infer<typeof documentQueryRespFromExternalGWSchema>;

export function isDocumentQueryResponse(
  obj: BaseResponse
): obj is DocumentQueryRespFromExternalGW & { documentReference: DocumentReference[] } {
  return "documentReference" in obj;
}
