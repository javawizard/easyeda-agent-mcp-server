import { z } from 'zod';
import { HeadLine } from './line-head';
import { ComponentLine } from './line-component';
import { AttrLine } from './line-attr';
import { WireLine } from './line-wire';
import { FontStyleLine } from './line-fontstyle';
import {
	DoctypeLine,
	LineStyleLine,
	TextLine,
	CircleLine,
} from './line-graphics';
import { parseNdjsonSource, serializeParsedLines } from './parser';
import type { ParsedLine, ValidationReport } from './types';

export const EschLine = z.union([
	DoctypeLine,
	HeadLine,
	ComponentLine,
	AttrLine,
	WireLine,
	FontStyleLine,
	LineStyleLine,
	TextLine,
	CircleLine,
]);

export type EschLine = z.infer<typeof EschLine>;

const ESCH_SCHEMAS = {
	DOCTYPE: DoctypeLine,
	HEAD: HeadLine,
	COMPONENT: ComponentLine,
	ATTR: AttrLine,
	WIRE: WireLine,
	FONTSTYLE: FontStyleLine,
	LINESTYLE: LineStyleLine,
	TEXT: TextLine,
	CIRCLE: CircleLine,
};

export function parseEschSource(source: string): {
	lines: ParsedLine<EschLine>[];
	report: ValidationReport;
} {
	return parseNdjsonSource<EschLine>(source, {
		schemaMap: ESCH_SCHEMAS,
		docType: 'esch',
	});
}

export function serializeEschLines(lines: ParsedLine<EschLine>[]): string {
	return serializeParsedLines(lines);
}
