import { z } from 'zod';
import { HeadLine } from './line-head';
import { PinLine } from './line-pin';
import { AttrLine } from './line-attr';
import { FontStyleLine } from './line-fontstyle';
import {
	DoctypeLine,
	LineStyleLine,
	CircleLine,
	RectLine,
	EllipseLine,
	ArcLine,
	PolyLine,
	PartLine,
	TableLine,
	TabelCellLine,
	ObjLine,
} from './line-graphics';
import { parseNdjsonSource, serializeParsedLines } from './parser';
import type { ParsedLine, ValidationReport } from './types';

export const EsymLine = z.union([
	DoctypeLine,
	HeadLine,
	PinLine,
	AttrLine,
	FontStyleLine,
	LineStyleLine,
	PartLine,
	RectLine,
	CircleLine,
	EllipseLine,
	ArcLine,
	PolyLine,
	TableLine,
	TabelCellLine,
	ObjLine,
]);

export type EsymLine = z.infer<typeof EsymLine>;

const ESYM_SCHEMAS = {
	DOCTYPE: DoctypeLine,
	HEAD: HeadLine,
	PIN: PinLine,
	ATTR: AttrLine,
	FONTSTYLE: FontStyleLine,
	LINESTYLE: LineStyleLine,
	PART: PartLine,
	RECT: RectLine,
	CIRCLE: CircleLine,
	ELLIPSE: EllipseLine,
	ARC: ArcLine,
	POLY: PolyLine,
	TABLE: TableLine,
	TABEL_CELL: TabelCellLine,
	OBJ: ObjLine,
};

export function parseEsymSource(source: string): {
	lines: ParsedLine<EsymLine>[];
	report: ValidationReport;
} {
	return parseNdjsonSource<EsymLine>(source, {
		schemaMap: ESYM_SCHEMAS,
		docType: 'esym',
	});
}

export function serializeEsymLines(lines: ParsedLine<EsymLine>[]): string {
	return serializeParsedLines(lines);
}
