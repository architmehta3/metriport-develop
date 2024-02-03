import { PatientDiscoveryReqToExternalGW } from "@metriport/ihe-gateway-sdk";
import { sleep } from "@metriport/shared";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { getOrganizationOrFail } from "../../command/medical/organization/get-organization";
import { Patient, PatientExternalData } from "@metriport/core/domain/patient";
import { Product } from "../../domain/product";
import { analytics, EventTypes } from "../../shared/analytics";
import { capture } from "../../shared/notifications";
import { Util } from "../../shared/util";
import { toFHIR } from "@metriport/core/external/fhir/patient/index";
import { makeIheGatewayAPI } from "./api";
import { searchCQDirectoriesAroundPatientAddresses } from "./command/cq-directory/search-cq-directory";
import { createOrUpdateCQPatientData } from "./command/cq-patient-data/create-cq-data";
import { deleteCQPatientData } from "./command/cq-patient-data/delete-cq-data";
import {
  getPatientDiscoveryResultCount,
  getPatientDiscoveryResults,
} from "./command/patient-discovery-result/get-patient-discovery-result";
import { createPatientDiscoveryRequest } from "./create-pd-request";
import { CQLink } from "./cq-patient-data";
import { PatientDiscoveryResult } from "./patient-discovery-result";
import { cqOrgsToXCPDGateways } from "./organization-conversion";
import { MedicalDataSource } from "@metriport/core/external/index";
import { PatientDataCarequality } from "./patient-shared";

dayjs.extend(duration);

export function getCQData(
  data: PatientExternalData | undefined
): PatientDataCarequality | undefined {
  if (!data) return undefined;
  return data[MedicalDataSource.CAREQUALITY] as PatientDataCarequality; // TODO validate the type
}

const createContext = "cq.patient.discover";
export const PATIENT_DISCOVERY_TIMEOUT = dayjs.duration({ minutes: 0.25 });
const CHECK_DB_INTERVAL = dayjs.duration({ seconds: 5 });
type RaceControl = { isRaceInProgress: boolean };

export async function discover(patient: Patient, facilityNPI: string): Promise<void> {
  const { log } = Util.out(`CQ discover - M patientId ${patient.id}`);
  try {
    const iheGateway = makeIheGatewayAPI();
    if (!iheGateway) return;

    const { cxId } = patient;
    const pdRequest = await prepareForPatientDiscovery(patient, facilityNPI);
    const numGateways = pdRequest.gateways.length;

    log(`Kicking off patient discovery. RequestID: ${pdRequest.id}`);
    // Intentionally asynchronous - we will be checking for the results in the database
    iheGateway.startPatientDiscovery(pdRequest);

    const raceControl: RaceControl = { isRaceInProgress: true };
    // Run the patient discovery until it either times out, or all the results are in the database
    const raceResult = await Promise.race([
      controlDuration(),
      checkNumberOfResults(raceControl, pdRequest.id, pdRequest.gateways.length), // TODO: #1372 - set up an event listener for XCPD completion instead of polling
    ]);
    const pdResults = await getPatientDiscoveryResults(pdRequest.id);
    if (raceResult) {
      log(
        `${raceResult}. Got ${pdResults.length} successes out of ${numGateways} gateways for PD. RequestID: ${pdRequest.id}`
      );
      raceControl.isRaceInProgress = false;
    }
    analytics({
      distinctId: cxId,
      event: EventTypes.patientDiscovery,
      properties: {
        numberGateways: numGateways,
        numberLinkedGateways: pdResults.length,
      },
      apiType: Product.medical,
    });

    if (pdResults.length === 0) {
      log(`No patient discovery results found. RequestID: ${pdRequest.id}`);
      return;
    }
    log(`Starting to handle patient discovery results. RequestID: ${pdRequest.id}`);
    await handlePatientDiscoveryResults(patient, pdResults);
  } catch (err) {
    const msg = `Failed to carry out patient discovery - M patient ${patient.id}`;
    log(msg, err);
    capture.message(msg, {
      extra: {
        facilityNPI,
        patientId: patient.id,
        context: createContext,
        error: err,
      },
      level: "error",
    });
  }
}

export async function remove(patient: Patient): Promise<void> {
  console.log(`Deleting CQ data - M patientId ${patient.id}`);
  await deleteCQPatientData({ id: patient.id, cxId: patient.cxId });
}

export async function prepareForPatientDiscovery(
  patient: Patient,
  facilityNPI: string
): Promise<PatientDiscoveryReqToExternalGW> {
  const { cxId } = patient;
  const fhirPatient = toFHIR(patient);
  const [organization, nearbyCQOrgs] = await Promise.all([
    getOrganizationOrFail({ cxId }),
    searchCQDirectoriesAroundPatientAddresses({ patient }),
  ]);

  const xcpdGateways = cqOrgsToXCPDGateways(nearbyCQOrgs);

  const pdRequest = createPatientDiscoveryRequest({
    patient: fhirPatient,
    cxId: patient.cxId,
    xcpdGateways,
    facilityNPI,
    orgName: organization.data.name,
    orgOid: organization.oid,
  });
  return pdRequest;
}

export async function handlePatientDiscoveryResults(
  patient: Patient,
  pdResults: PatientDiscoveryResult[]
): Promise<void> {
  const { id, cxId } = patient;
  const cqLinks = buildCQLinks(pdResults);
  if (cqLinks.length) await createOrUpdateCQPatientData({ id, cxId, cqLinks });
}

export function buildCQLinks(pdResults: PatientDiscoveryResult[]): CQLink[] {
  return pdResults.flatMap(pd => {
    const id = pd.data.externalGatewayPatient?.id;
    const system = pd.data.externalGatewayPatient?.system;
    if (!id || !system) return [];
    return {
      patientId: id,
      systemId: system,
      ...pd.data.gateway,
    };
  });
}

async function controlDuration(): Promise<string> {
  const timeout = PATIENT_DISCOVERY_TIMEOUT.asMilliseconds();
  await sleep(timeout);
  return `Patient discovery reached timeout after ${timeout} ms`;
}

async function checkNumberOfResults(
  raceControl: RaceControl,
  requestId: string,
  numberOfGateways: number
): Promise<string | undefined> {
  while (raceControl.isRaceInProgress) {
    const isComplete = await isPDComplete(requestId, numberOfGateways);
    if (isComplete) {
      const msg = `Patient discovery results came back in full (${numberOfGateways} gateways). RequestID: ${requestId}`;
      raceControl.isRaceInProgress = false;
      return msg;
    }
    await sleep(CHECK_DB_INTERVAL.asMilliseconds());
  }
}

async function isPDComplete(requestId: string, numGatewaysInRequest: number): Promise<boolean> {
  const pdResultCount = await getPatientDiscoveryResultCount(requestId);
  return pdResultCount >= numGatewaysInRequest;
}
