import { Patient } from "@metriport/core/domain/patient";
import { Coordinates } from "@metriport/core/external/aws/location";
import convert from "convert-units";
import { Sequelize } from "sequelize";
import { CQDirectoryEntryModel } from "../../models/cq-directory";

export const DEFAULT_RADIUS_IN_MILES = 50;

export type CQOrgBasicDetails = {
  name: string | undefined;
  id: string;
  lon: number | undefined;
  lat: number | undefined;
  urlXCPD: string;
  urlDQ: string | undefined;
  urlDR: string | undefined;
};

/**
 * Searches the Carequality Directory for organizations within a specified radius of all patient's addresses.
 *
 * @param patient The patient whose addresses to search around.
 * @param radiusInMiles Optional, the radius in miles within which to search for organizations. Defaults to 50 miles.
 *
 * @returns Returns the details of organizations within the specified radius of the patient's addresses.
 */
export async function searchCQDirectoriesAroundPatientAddresses({
  patient,
  radiusInMiles = DEFAULT_RADIUS_IN_MILES,
}: {
  patient: Patient;
  radiusInMiles?: number;
}): Promise<CQOrgBasicDetails[]> {
  const radiusInMeters = convert(radiusInMiles).from("mi").to("m");

  const coordinates = patient.data.address.flatMap(address => address.coordinates ?? []);
  if (!coordinates.length) throw new Error("Failed to get patient coordinates");

  const orgs = await searchCQDirectoriesByRadius({
    coordinates,
    radiusInMeters,
  });

  return orgs.map(toBasicOrgAttributes);
}

/**
 * Searches the Carequality Directory for organizations within a specified radius around geographic coordinates.
 *
 * @param coordinates The latitude and longitude around which to search for organizations.
 * @param radiusInMeters The radius in meters within which to search for organizations.
 * @returns Returns organizations within the specified radius of the patient's address.
 */
export async function searchCQDirectoriesByRadius({
  coordinates,
  radiusInMeters,
}: {
  coordinates: Coordinates[];
  radiusInMeters: number;
}): Promise<CQDirectoryEntryModel[]> {
  const orgs: CQDirectoryEntryModel[] = [];

  for (const coord of coordinates) {
    const orgsForAddress = await CQDirectoryEntryModel.findAll({
      attributes: {
        include: [
          [
            Sequelize.literal(
              `ROUND(earth_distance(ll_to_earth(${coord.lat}, ${coord.lon}), point)::NUMERIC, 2)`
            ),
            "distance",
          ],
        ],
      },
      where:
        Sequelize.literal(`earth_box(ll_to_earth (${coord.lat}, ${coord.lon}), ${radiusInMeters}) @> point
        AND earth_distance(ll_to_earth (${coord.lat}, ${coord.lon}), point) < ${radiusInMeters}`),
      order: Sequelize.literal("distance"),
    });

    orgs.push(...orgsForAddress);
  }

  return orgs;
}

export function toBasicOrgAttributes(org: CQDirectoryEntryModel): CQOrgBasicDetails {
  return {
    name: org.name,
    id: org.id,
    lon: org.lon,
    lat: org.lat,
    urlXCPD: org.urlXCPD,
    urlDQ: org.urlDQ,
    urlDR: org.urlDR,
  };
}
