export interface ParsedNetlistComponent {
	designator: string;
	part: string;
	manufacturerPart: string;
	pins: Record<string, string>; // pinNumber → netName
}

// Keyed by component uniqueId
export type ParsedNetlist = Record<string, ParsedNetlistComponent>;

export async function fetchParsedNetlist(): Promise<ParsedNetlist> {
	const raw = await eda.sch_Netlist.getNetlist(ESYS_NetlistType.JLCEDA_PRO);
	const data: Record<string, any> = typeof raw === 'string' ? JSON.parse(raw) : raw;
	const result: ParsedNetlist = {};
	for (const [uniqueId, entry] of Object.entries(data)) {
		if (!entry || typeof entry !== 'object') continue;
		const props = entry.props || {};
		result[uniqueId] = {
			designator: props.Designator || '',
			part: props.Name || '',
			manufacturerPart: props['Manufacturer Part'] || '',
			pins: entry.pins || {},
		};
	}
	return result;
}

export async function fetchPinNames(primitiveId: string): Promise<Record<string, string>> {
	const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(primitiveId);
	const result: Record<string, string> = {};
	if (Array.isArray(pins)) {
		for (const pin of pins) {
			const p = pin as any;
			if (p.pinNumber != null) {
				result[String(p.pinNumber)] = p.pinName || '';
			}
		}
	}
	return result;
}
