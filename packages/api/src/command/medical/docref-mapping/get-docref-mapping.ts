import { uuidv7 } from "@metriport/core/util/uuid-v7";
import { Op } from "sequelize";
import { DocRefMapping } from "../../../domain/medical/docref-mapping";
import { MedicalDataSource } from "@metriport/core/external/index";
import { DocRefMappingModel } from "../../../models/medical/docref-mapping";

export const getDocRefMapping = async (id: string): Promise<DocRefMapping | undefined> => {
  const docRef = await DocRefMappingModel.findByPk(id);
  return docRef ?? undefined;
};

export const getAllDocRefMapping = async ({
  requestId,
  patientId,
  cxId,
}: {
  requestId: string;
  patientId?: string;
  cxId?: string;
}): Promise<DocRefMapping[]> => {
  const docRefs = await DocRefMappingModel.findAll({
    where: {
      requestId,
      ...(patientId && { patientId }),
      ...(cxId && { cxId }),
    },
  });
  return docRefs;
};

export const getOrCreateDocRefMapping = async ({
  cxId,
  patientId,
  requestId,
  externalId,
  source,
}: {
  cxId: string;
  patientId: string;
  requestId: string;
  externalId: string;
  source: MedicalDataSource;
}): Promise<DocRefMapping> => {
  const docRef = { cxId, patientId, externalId, source };
  const [res] = await DocRefMappingModel.findOrCreate({
    where: docRef,
    defaults: {
      id: uuidv7(),
      requestId,
      ...docRef,
    },
  });

  return res;
};

export const getDocRefMappings = async ({
  cxId,
  ids = [],
  patientId: patientIdParam = [],
  externalId,
  source,
  createdAtRange: { from, to } = {},
}: {
  cxId: string;
  ids?: string[];
  patientId?: string[] | string;
  externalId?: string;
  source?: MedicalDataSource;
  createdAtRange?: { from?: Date; to?: Date };
}): Promise<DocRefMapping[]> => {
  const patientIds = Array.isArray(patientIdParam) ? patientIdParam : [patientIdParam];
  const res = await DocRefMappingModel.findAll({
    where: {
      cxId,
      ...(ids && ids.length ? { id: { [Op.in]: ids } } : {}),
      ...(patientIds.length ? { patientId: { [Op.in]: patientIds } } : {}),
      ...(externalId ? { externalId } : {}),
      ...(source ? { source } : {}),
      ...(from || to
        ? { createdAt: { ...(from && { [Op.gte]: from }), ...(to && { [Op.lte]: to }) } }
        : {}),
    },
  });
  return res;
};
