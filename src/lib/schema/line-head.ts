import { z } from 'zod';

/**
 * HEAD metadata. Field set varies by doc type:
 *   .esch  — originX, originY, version, maxId
 *   .esym  — originX, originY, version, symbolType
 *   .epcb  — editorVersion, importFlag
 *   .efoo  — editorVersion, importFlag (when present)
 * Kept loose (passthrough) so unmodeled fields survive round-trip.
 */
export const HeadMeta = z.looseObject({
	originX: z.number().optional(),
	originY: z.number().optional(),
	version: z.string().optional(),
	maxId: z.number().optional(),
	symbolType: z.number().optional(),
	editorVersion: z.string().optional(),
	importFlag: z.number().optional(),
});

export const HeadLine = z.tuple([
	z.literal('HEAD'),
	HeadMeta,
]).rest(z.unknown());

export type HeadLine = z.infer<typeof HeadLine>;
