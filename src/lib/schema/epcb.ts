import { z } from 'zod';
import { HeadLine } from './line-head';
import { DoctypeLine } from './line-graphics';
import {
	PcbCanvasLine,
	PcbLayerLine,
	PcbLayerPhysLine,
	PcbActiveLayerLine,
	PcbPrimitiveLine,
	PcbSilkOptsLine,
	PcbPropLine,
	PcbPreferenceLine,
	PcbNetLine,
	PcbPadNetLine,
	PcbComponentLine,
	PcbAttrLine,
	PcbLineLine,
	PcbViaLine,
	PcbPourLine,
	PcbPouredLine,
	PcbPolyLine,
	PcbRegionLine,
	PcbStringLine,
	PcbDimensionLine,
	PcbFontLine,
	PcbRuleTemplateLine,
	PcbRuleLine,
	PcbRuleSelectorLine,
	PcbPanelizeLine,
	PcbPanelizeStampLine,
	PcbPanelizeSideLine,
} from './line-pcb';
import { parseNdjsonSource, serializeParsedLines } from './parser';
import type { ParsedLine, ValidationReport } from './types';

export const EpcbLine = z.union([
	DoctypeLine,
	HeadLine,
	PcbCanvasLine,
	PcbLayerLine,
	PcbLayerPhysLine,
	PcbActiveLayerLine,
	PcbPrimitiveLine,
	PcbSilkOptsLine,
	PcbPropLine,
	PcbPreferenceLine,
	PcbNetLine,
	PcbPadNetLine,
	PcbComponentLine,
	PcbAttrLine,
	PcbLineLine,
	PcbViaLine,
	PcbPourLine,
	PcbPouredLine,
	PcbPolyLine,
	PcbRegionLine,
	PcbStringLine,
	PcbDimensionLine,
	PcbFontLine,
	PcbRuleTemplateLine,
	PcbRuleLine,
	PcbRuleSelectorLine,
	PcbPanelizeLine,
	PcbPanelizeStampLine,
	PcbPanelizeSideLine,
]);

export type EpcbLine = z.infer<typeof EpcbLine>;

const EPCB_SCHEMAS = {
	DOCTYPE: DoctypeLine,
	HEAD: HeadLine,
	CANVAS: PcbCanvasLine,
	LAYER: PcbLayerLine,
	LAYER_PHYS: PcbLayerPhysLine,
	ACTIVE_LAYER: PcbActiveLayerLine,
	PRIMITIVE: PcbPrimitiveLine,
	SILK_OPTS: PcbSilkOptsLine,
	PROP: PcbPropLine,
	PREFERENCE: PcbPreferenceLine,
	NET: PcbNetLine,
	PAD_NET: PcbPadNetLine,
	COMPONENT: PcbComponentLine,
	ATTR: PcbAttrLine,
	LINE: PcbLineLine,
	VIA: PcbViaLine,
	POUR: PcbPourLine,
	POURED: PcbPouredLine,
	POLY: PcbPolyLine,
	REGION: PcbRegionLine,
	STRING: PcbStringLine,
	DIMENSION: PcbDimensionLine,
	FONT: PcbFontLine,
	RULE_TEMPLATE: PcbRuleTemplateLine,
	RULE: PcbRuleLine,
	RULE_SELECTOR: PcbRuleSelectorLine,
	PANELIZE: PcbPanelizeLine,
	PANELIZE_STAMP: PcbPanelizeStampLine,
	PANELIZE_SIDE: PcbPanelizeSideLine,
};

export function parseEpcbSource(source: string): {
	lines: ParsedLine<EpcbLine>[];
	report: ValidationReport;
} {
	return parseNdjsonSource<EpcbLine>(source, {
		schemaMap: EPCB_SCHEMAS,
		docType: 'epcb',
	});
}

export function serializeEpcbLines(lines: ParsedLine<EpcbLine>[]): string {
	return serializeParsedLines(lines);
}
