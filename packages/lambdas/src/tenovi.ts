import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import * as Sentry from "@sentry/serverless";
import { APIGatewayEvent } from "aws-lambda";
import axios from "axios";
import status from "http-status";
import { capture } from "./shared/capture";
import { getEnvOrFail } from "./shared/env";

// Keep this as early on the file as possible
capture.init();

const apiServerURL = getEnvOrFail("API_URL");
const tenoviAuthHeader = getEnvOrFail("TENOVI_AUTH_HEADER");

const api = axios.create();

const buildResponse = (status: number, body?: unknown) => ({
  statusCode: status,
  body,
});

const defaultResponse = () => buildResponse(status.NO_CONTENT);

export const handler = Sentry.AWSLambda.wrapHandler(async (event: APIGatewayEvent) => {
  if (!event.body) {
    console.log("Event has no body - will not be forwarded to the API");
    return defaultResponse();
  }

  const authHeader: string = (await getSecret(tenoviAuthHeader)) as string;
  if (!authHeader) {
    throw new Error(`Config error - TENOVI_AUTH_HEADER not found`);
  }

  const verificationSuccessful = verifyRequest(event, authHeader);
  console.log("Tenovi WH Verification success: ", verificationSuccessful);
  if (verificationSuccessful) {
    return forwardCallToServer(event);
  }

  capture.message("Tenovi webhooks authentication fail", {
    extra: { context: "webhook.tenovi.tenoviAuthLambda" },
  });
  return buildResponse(status.NOT_FOUND);
});

async function forwardCallToServer(event: APIGatewayEvent) {
  console.log(`Verified! Calling server...`);

  const resp = await api.post(apiServerURL, event.body, { headers: event.headers });

  console.log(`Server response - status: ${resp.status}`);
  console.log(`Server response - body: ${resp.data}`);
  return buildResponse(resp.status, resp.data);
}

/**
 * Checks for authenticity of the webhook notification by comparing the authorization header in the request
 * with the auth header stored in the environment variables.
 *
 * @param event APIGatewayProxyEvent
 * @param authHeader Authorization header for Tenovi
 * @returns boolean
 */
function verifyRequest(event: APIGatewayEvent, authHeader: string): boolean {
  if (event.headers["Authorization"] === authHeader) {
    return true;
  }

  return false;
}
