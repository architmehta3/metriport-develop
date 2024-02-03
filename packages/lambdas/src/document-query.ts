import { documentQueryReqFromExternalGWSchema } from "@metriport/ihe-gateway-sdk";
import * as Sentry from "@sentry/serverless";
import { processIncomingRequest } from "@metriport/core/external/carequality/dq/process-incoming-dq";
import { APIGatewayProxyEvent } from "aws-lambda";

export const handler = Sentry.AWSLambda.wrapHandler(async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return buildResponse(400, { message: "Request body is missing" });
  }
  const payload = JSON.parse(event.body);
  const baseRequest = documentQueryReqFromExternalGWSchema.parse({
    id: payload.id,
    timestamp: payload.timestamp,
    samlAttributes: payload.samlAttributes,
    externalGatewayPatient: payload.externalGatewayPatient,
  });
  const result = await processIncomingRequest(baseRequest);
  return buildResponse(200, result);
});

const buildResponse = (status: number, body?: unknown) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
