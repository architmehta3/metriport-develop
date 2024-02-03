import * as dotenv from "dotenv";
dotenv.config();
// Keep dotenv import and config before everything else
import { MedplumClient } from "@medplum/core";
import { Organization as FHIROrganization, Patient as FHIRPatient } from "@medplum/fhirtypes";
import { PersonalIdentifier } from "@metriport/api-sdk";
import { getEnvVarOrFail } from "@metriport/core/util/env-var";
import { Sequelize } from "sequelize";

/**
 * Migrate existing orgs and patients to FHIR
 *
 * Requires env vars as indicated at start of this function.
 * Its suggested to set those on a .env file so they are not stored on
 * your shell history.
 *
 * Created as part of #521
 */
async function main() {
  const sqlDBCreds = getEnvVarOrFail("DB_CREDS");
  const fhirUrl = getEnvVarOrFail("FHIR_URL");

  const dbCreds = JSON.parse(sqlDBCreds);

  const fhirApi = new MedplumClient({
    baseUrl: fhirUrl,
    fhirUrlPath: "fhir",
  });

  const sequelize = new Sequelize(dbCreds.dbname, dbCreds.username, dbCreds.password, {
    host: dbCreds.host,
    port: dbCreds.port,
    dialect: dbCreds.engine,
  });

  const orgResults = await sequelize.query("SELECT * FROM organization");
  const organizations = orgResults[0];

  for (const org of organizations) {
    const fhirOrg = toFHIROrg(org);
    await fhirApi.updateResource(fhirOrg);
  }

  const patientResults = await sequelize.query("SELECT * FROM patient");
  const patients = patientResults[0];

  for (const patient of patients) {
    const fhirPatient = toFHIRPatient(patient);
    await fhirApi.updateResource(fhirPatient);
  }

  console.log(`Done`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFHIROrg = (org: any): FHIROrganization => {
  return {
    resourceType: "Organization",
    id: org.id,
    active: true,
    type: [
      {
        text: org.data.type,
      },
    ],
    name: org.data.name,
    address: [
      {
        line: [org.data.location.addressLine1],
        city: org.data.location.city,
        state: org.data.location.state,
        postalCode: org.data.location.zip,
        country: org.data.location.country,
      },
    ],
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toFHIRPatient = (patient: any): FHIRPatient => {
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: convertDriversLicenseToIdentifier(patient.data.personalIdentifiers),
    name: [
      {
        family: patient.data.lastName,
        given: [patient.data.firstName],
      },
    ],
    telecom: patient.data.contact
      ? Object.entries(patient.data.contact).map(([key, val]) => {
          return {
            system: key === "phone" ? "phone" : "email",
            value: val as string,
          };
        })
      : undefined,
    gender:
      patient.data.genderAtBirth === "F"
        ? "female"
        : patient.data.genderAtBirth === "M"
        ? "male"
        : "unknown",
    birthDate: patient.data.dob,
    address: [
      {
        line: [patient.data.address.addressLine1],
        city: patient.data.address.city,
        state: patient.data.address.state,
        postalCode: patient.data.address.zip,
        country: patient.data.address.country,
      },
    ],
  };
};

type Identifier = {
  system: string;
  value: string;
};

const convertDriversLicenseToIdentifier = (
  personalIdentifiers: PersonalIdentifier[]
): Identifier[] => {
  return personalIdentifiers.map(identifier => {
    return {
      system: driversLicenseURIs[identifier.state],
      value: identifier.value,
    };
  });
};

const OID_PREFIX = "urn:oid:";

const driversLicenseURIs = {
  AK: `${OID_PREFIX}2.16.840.1.113883.4.3.2`,
  AL: `${OID_PREFIX}2.16.840.1.113883.4.3.1`,
  AR: `${OID_PREFIX}2.16.840.1.113883.4.3.5`,
  AZ: `${OID_PREFIX}2.16.840.1.113883.4.3.4`,
  CA: `${OID_PREFIX}2.16.840.1.113883.4.3.6`,
  CO: `${OID_PREFIX}2.16.840.1.113883.4.3.8`,
  CT: `${OID_PREFIX}2.16.840.1.113883.4.3.9`,
  DC: `${OID_PREFIX}2.16.840.1.113883.4.3.11`,
  DE: `${OID_PREFIX}2.16.840.1.113883.4.3.10`,
  FL: `${OID_PREFIX}2.16.840.1.113883.4.3.12`,
  GA: `${OID_PREFIX}2.16.840.1.113883.4.3.13`,
  HI: `${OID_PREFIX}2.16.840.1.113883.4.3.15`,
  IN: `${OID_PREFIX}2.16.840.1.113883.4.3.18`,
  IA: `${OID_PREFIX}2.16.840.1.113883.4.3.19`,
  ID: `${OID_PREFIX}2.16.840.1.113883.4.3.16`,
  IL: `${OID_PREFIX}2.16.840.1.113883.4.3.17`,
  KS: `${OID_PREFIX}2.16.840.1.113883.4.3.20`,
  KY: `${OID_PREFIX}2.16.840.1.113883.4.3.21`,
  LA: `${OID_PREFIX}2.16.840.1.113883.4.3.22`,
  MA: `${OID_PREFIX}2.16.840.1.113883.4.3.25`,
  MD: `${OID_PREFIX}2.16.840.1.113883.4.3.24`,
  ME: `${OID_PREFIX}2.16.840.1.113883.4.3.23`,
  MI: `${OID_PREFIX}2.16.840.1.113883.4.3.26`,
  MN: `${OID_PREFIX}2.16.840.1.113883.4.3.27`,
  MO: `${OID_PREFIX}2.16.840.1.113883.4.3.29`,
  MS: `${OID_PREFIX}2.16.840.1.113883.4.3.28`,
  MT: `${OID_PREFIX}2.16.840.1.113883.4.3.30`,
  NY: `${OID_PREFIX}2.16.840.1.113883.4.3.36`,
  NC: `${OID_PREFIX}2.16.840.1.113883.4.3.37`,
  ND: `${OID_PREFIX}2.16.840.1.113883.4.3.38`,
  NE: `${OID_PREFIX}2.16.840.1.113883.4.3.31`,
  NH: `${OID_PREFIX}2.16.840.1.113883.4.3.33`,
  NJ: `${OID_PREFIX}2.16.840.1.113883.4.3.34`,
  NM: `${OID_PREFIX}2.16.840.1.113883.4.3.35`,
  NV: `${OID_PREFIX}2.16.840.1.113883.4.3.32`,
  OH: `${OID_PREFIX}2.16.840.1.113883.4.3.39`,
  OK: `${OID_PREFIX}2.16.840.1.113883.4.3.40`,
  OR: `${OID_PREFIX}2.16.840.1.113883.4.3.41`,
  PA: `${OID_PREFIX}2.16.840.1.113883.4.3.42`,
  RI: `${OID_PREFIX}2.16.840.1.113883.4.3.44`,
  SC: `${OID_PREFIX}2.16.840.1.113883.4.3.45`,
  SD: `${OID_PREFIX}2.16.840.1.113883.4.3.46`,
  TN: `${OID_PREFIX}2.16.840.1.113883.4.3.47`,
  TX: `${OID_PREFIX}2.16.840.1.113883.4.3.48`,
  UT: `${OID_PREFIX}2.16.840.1.113883.4.3.49`,
  VA: `${OID_PREFIX}2.16.840.1.113883.4.3.51`,
  VT: `${OID_PREFIX}2.16.840.1.113883.4.3.50`,
  WA: `${OID_PREFIX}2.16.840.1.113883.4.3.53`,
  WI: `${OID_PREFIX}2.16.840.1.113883.4.3.55`,
  WV: `${OID_PREFIX}2.16.840.1.113883.4.3.54`,
  WY: `${OID_PREFIX}2.16.840.1.113883.4.3.56`,
};

main();
