import { z } from 'zod';

/**
 * Shared annotation/graphics line schemas used by .esch and .esym.
 *
 * Each tuple has `.rest(z.unknown())` so trailing positional fields that vary
 * across EasyEDA versions don't produce false-positive validation errors. We
 * model the leading fields (the ones the writer cares about) strictly; the
 * trailing slots are passthroughs.
 */

/**
 * DOCTYPE — first line of every NDJSON doc; declares format + version.
 *   ["DOCTYPE","SCH","1.1"]
 *   ["DOCTYPE","SYMBOL","1.1"]
 *   ["DOCTYPE","PCB","1.8"]
 *   ["DOCTYPE","INSTANCE","1.0"]
 *   ["DOCTYPE","FOOTPRINT","1.8"]
 */
export const DoctypeLine = z.tuple([
	z.literal('DOCTYPE'),
	z.string(), // doc kind: SCH | SYMBOL | PCB | INSTANCE | FOOTPRINT | PANEL
	z.string(), // version
]).rest(z.unknown());
export type DoctypeLine = z.infer<typeof DoctypeLine>;

/**
 * LINESTYLE — schematic/symbol line style definition (referenced by lineStyleId
 * in WIRE / RECT / CIRCLE / etc.). Variable trailing-null length: 6 or 7 in
 * the wild.
 *   ["LINESTYLE","st9",null,null,null,null,null]   (7)
 *   ["LINESTYLE","st1",null,null,null,null]        (6)
 */
export const LineStyleLine = z.tuple([
	z.literal('LINESTYLE'),
	z.string(), // styleId (e.g. "st9")
]).rest(z.unknown());
export type LineStyleLine = z.infer<typeof LineStyleLine>;

/**
 * TEXT — free text annotation on a schematic.
 *   ["TEXT","e13389",2030,760,0,"some text\nmultiline","st4",0]
 *   tag, elementId, x, y, rotation, content, fontStyleId, layer
 */
export const TextLine = z.tuple([
	z.literal('TEXT'),
	z.string(), // elementId
	z.number(), // x
	z.number(), // y
	z.number(), // rotation
	z.string(), // text content
	z.string().nullable(), // fontStyleId
	z.number(), // layer
]).rest(z.unknown());
export type TextLine = z.infer<typeof TextLine>;

/**
 * CIRCLE — annotation circle (in .esch) and small markers in .esym.
 *   ["CIRCLE","e29520",1500,2215,4,"st21",0]
 *   tag, elementId, cx, cy, radius, lineStyleId, layer
 */
export const CircleLine = z.tuple([
	z.literal('CIRCLE'),
	z.string(),                       // elementId
	z.number(),                       // cx
	z.number(),                       // cy
	z.number(),                       // radius
	z.string().nullable(),            // lineStyleId
	z.number(),                       // layer
]).rest(z.unknown());
export type CircleLine = z.infer<typeof CircleLine>;

/**
 * RECT — rectangle (.esym).
 *   ["RECT","e3",-45,15,45,-15,0,0,0,"st1",0]
 *   tag, elementId, x1, y1, x2, y2, ?, ?, ?, lineStyleId, layer
 */
export const RectLine = z.tuple([
	z.literal('RECT'),
	z.string(),                  // elementId
	z.number(),                  // x1
	z.number(),                  // y1
	z.number(),                  // x2
	z.number(),                  // y2
]).rest(z.unknown());
export type RectLine = z.infer<typeof RectLine>;

/**
 * ELLIPSE — ellipse (.esym).
 *   ["ELLIPSE","e4",-40,10,1.5,1.5,0,"st1",0]
 *   tag, elementId, cx, cy, rx, ry, ?, lineStyleId, layer
 */
export const EllipseLine = z.tuple([
	z.literal('ELLIPSE'),
	z.string(),                  // elementId
	z.number(),                  // cx
	z.number(),                  // cy
	z.number(),                  // rx
	z.number(),                  // ry
]).rest(z.unknown());
export type EllipseLine = z.infer<typeof EllipseLine>;

/**
 * ARC — arc (.esym).
 *   ["ARC","e32",8,17,13,19,15,15,"st4",0]
 *   tag, elementId, then 6 numbers (start/end/radii/angles — exact mapping TBD),
 *   then lineStyleId, layer.
 */
export const ArcLine = z.tuple([
	z.literal('ARC'),
	z.string(),  // elementId
]).rest(z.unknown());
export type ArcLine = z.infer<typeof ArcLine>;

/**
 * POLY — polyline (.esym + .epcb both use this, slightly different shapes).
 *   .esym: ["POLY","e41",[-10,-10,10,-10],false,"st6",0]
 *          tag, elementId, points([x,y,x,y,...]), closed, lineStyleId, layer
 *   `closed` is JS-truthy — observed as both booleans (true/false) and numbers
 *   (0/1) across symbol files, so we accept either.
 *   .epcb POLY is structurally different — see line-pcb.
 */
export const PolyLine = z.tuple([
	z.literal('POLY'),
	z.string(),                                // elementId
	z.array(z.number()),                       // points (flat [x,y,x,y,...])
	z.union([z.boolean(), z.number()]),        // closed (truthy)
]).rest(z.unknown());
export type PolyLine = z.infer<typeof PolyLine>;

/**
 * PART — symbol package descriptor (.esym). One per symbol file.
 *   ["PART","YF4025M00033001.1",{"BBOX":[-45,-15,45,15]}]
 *   tag, partName(.N suffix), metadata(BBOX, etc.)
 */
export const PartMeta = z.looseObject({
	BBOX: z.array(z.number()).optional(),
});
export const PartLine = z.tuple([
	z.literal('PART'),
	z.string(),  // partName, often with ".1" suffix
	PartMeta,
]).rest(z.unknown());
export type PartLine = z.infer<typeof PartLine>;

/**
 * TABLE — multi-cell table annotation (rare, used in BOM-style title blocks).
 *   ["TABLE","e765",944,190,[colWidths],[rowHeights],[…],[…],layer]
 */
export const TableLine = z.tuple([
	z.literal('TABLE'),
	z.string(),  // elementId
	z.number(),  // x
	z.number(),  // y
	z.array(z.number()),  // column widths
	z.array(z.number()),  // row heights
]).rest(z.unknown());
export type TableLine = z.infer<typeof TableLine>;

/**
 * TABEL_CELL — table cell (note: EasyEDA's tag is misspelled "TABEL", not "TABLE").
 *   ["TABEL_CELL","e766","e765","Schematic",0,0,2,1,"st5","st5","st5","st5","st4",1]
 *   tag, elementId, parentTableId, content, row, col, rowSpan, colSpan, 4 borderStyles, fontStyleId, ?
 */
export const TabelCellLine = z.tuple([
	z.literal('TABEL_CELL'),
	z.string(),  // elementId
	z.string(),  // parentTableId
	z.string(),  // content
	z.number(),  // row
	z.number(),  // col
	z.number(),  // rowSpan
	z.number(),  // colSpan
]).rest(z.unknown());
export type TabelCellLine = z.infer<typeof TabelCellLine>;

/**
 * OBJ — embedded object (typically a base64 SVG / image data URL).
 *   ["OBJ","e764","",973,43,155,30,0,0,"data:image/svg+xml;base64,...",1]
 *   tag, elementId, ?, x, y, w, h, ?, ?, dataUrl, ?
 */
export const ObjLine = z.tuple([
	z.literal('OBJ'),
	z.string(),  // elementId
]).rest(z.unknown());
export type ObjLine = z.infer<typeof ObjLine>;
