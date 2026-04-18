import { z } from 'zod';
import { DoctypeLine } from './line-graphics';
import { parseNdjsonSource, serializeParsedLines } from './parser';
import type { ParsedLine, ValidationReport } from './types';

/**
 * .eins (instance override) NDJSON schema. Two-line format:
 *   ["DOCTYPE","INSTANCE","1.0"]
 *   ["OVERRIDE", instancePath, attrOverrideMap]
 *
 * `instancePath` is a triple [schematicUuid, parentInstance, leafInstance] used
 * to address a specific instance of a component within a schematic hierarchy.
 * `attrOverrideMap` is `{ elementId: { attrName: value, ... } }`.
 */
export const InsOverrideLine = z.tuple([
	z.literal('OVERRIDE'),
	z.array(z.string()),                                                       // instance path (typically length 3)
	z.record(z.string(), z.record(z.string(), z.unknown())),                   // overrides keyed by elementId
]).rest(z.unknown());
export type InsOverrideLine = z.infer<typeof InsOverrideLine>;

export const EinsLine = z.union([DoctypeLine, InsOverrideLine]);
export type EinsLine = z.infer<typeof EinsLine>;

const EINS_SCHEMAS = {
	DOCTYPE: DoctypeLine,
	OVERRIDE: InsOverrideLine,
};

export function parseEinsSource(source: string): {
	lines: ParsedLine<EinsLine>[];
	report: ValidationReport;
} {
	return parseNdjsonSource<EinsLine>(source, {
		schemaMap: EINS_SCHEMAS,
		docType: 'eins',
	});
}

export function serializeEinsLines(lines: ParsedLine<EinsLine>[]): string {
	return serializeParsedLines(lines);
}
