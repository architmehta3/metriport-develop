import { DocumentQueryRespFromExternalGW } from "@metriport/ihe-gateway-sdk";
import { BaseResultDomain } from "./ihe-result";

export interface DocumentQueryResult extends BaseResultDomain {
  data: DocumentQueryRespFromExternalGW;
}
