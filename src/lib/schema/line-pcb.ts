import { z } from 'zod';

/**
 * Per-line schemas for .epcb (PCB) NDJSON documents.
 *
 * Conventions:
 *  - Field positions for the most-edited tags (LAYER, COMPONENT, NET, PAD_NET,
 *    LINE, VIA, POUR, POURED, ATTR, STRING) are modeled tightly, with the
 *    semantically-meaningful prefix typed and the rest passthrough.
 *  - Lower-traffic tags (rules, panelize, font, dimension, etc.) are modeled
 *    minimally — just the tag + first identifier — so trailing fields that
 *    differ between EasyEDA versions don't trip validation. Tighten as edit
 *    workflows for those tags appear.
 *  - All tuples use `.rest(z.unknown())` so unmodeled trailing slots survive
 *    round-trip without false positives.
 *  - .epcb shares no positional schema with .esch beyond the tag literal —
 *    notably the ATTR shape is completely different (22 fields vs 12). Keep
 *    this file independent of line-attr.ts / line-component.ts / etc.
 */

// ---- Header / metadata -----------------------------------------------------

/**
 * CANVAS — board origin, units, and grid settings.
 *   ["CANVAS",0,0,"mil",5,5,5,5,1,1,2,0,5]
 *   tag, originX, originY, units, then various grid/canvas params (varies by version)
 */
export const PcbCanvasLine = z.tuple([
	z.literal('CANVAS'),
	z.number(),  // originX
	z.number(),  // originY
	z.string(),  // units ("mil" | "mm")
]).rest(z.unknown());
export type PcbCanvasLine = z.infer<typeof PcbCanvasLine>;

/**
 * LAYER — board layer definition.
 *   ["LAYER",1,"TOP","Top Layer",3,"#ff0000",1,"#7f0000",0.7]
 *   tag, layerId, kind, displayName, enabled, color, ?, color2, opacity
 */
export const PcbLayerLine = z.tuple([
	z.literal('LAYER'),
	z.number(),                  // layerId
	z.string(),                  // kind (TOP/BOTTOM/SIGNAL/SILK/etc.)
	z.string(),                  // displayName
]).rest(z.unknown());
export type PcbLayerLine = z.infer<typeof PcbLayerLine>;

/**
 * LAYER_PHYS — physical/stackup info per layer.
 *   ["LAYER_PHYS",3,"",0,0,0,1]
 *   tag, layerId, then physical parameters
 */
export const PcbLayerPhysLine = z.tuple([
	z.literal('LAYER_PHYS'),
	z.number(),  // layerId
]).rest(z.unknown());
export type PcbLayerPhysLine = z.infer<typeof PcbLayerPhysLine>;

/**
 * ACTIVE_LAYER — currently selected editing layer.
 *   ["ACTIVE_LAYER",1]
 */
export const PcbActiveLayerLine = z.tuple([
	z.literal('ACTIVE_LAYER'),
	z.number(),  // layerId
]).rest(z.unknown());
export type PcbActiveLayerLine = z.infer<typeof PcbActiveLayerLine>;

/**
 * PRIMITIVE — primitive lock/visibility settings.
 *   ["PRIMITIVE","ALL",1,0]
 */
export const PcbPrimitiveLine = z.tuple([
	z.literal('PRIMITIVE'),
	z.string(),  // primitive kind ("ALL" | specific names)
]).rest(z.unknown());
export type PcbPrimitiveLine = z.infer<typeof PcbPrimitiveLine>;

/**
 * SILK_OPTS — silkscreen rendering options.
 *   ["SILK_OPTS",3,"#000000","#FFFFFF"]
 */
export const PcbSilkOptsLine = z.tuple([
	z.literal('SILK_OPTS'),
]).rest(z.unknown());
export type PcbSilkOptsLine = z.infer<typeof PcbSilkOptsLine>;

/**
 * PROP — property color / metadata.
 *   ["PROP","e44e0","#000000"]
 */
export const PcbPropLine = z.tuple([
	z.literal('PROP'),
	z.string(),  // elementId or key
]).rest(z.unknown());
export type PcbPropLine = z.infer<typeof PcbPropLine>;

/**
 * PREFERENCE — board-level preferences (DRC defaults, etc.).
 *   ["PREFERENCE",0,10,0,12.0078,24.0158,1,2,"R45",1,0,1,1,"...",0,3,"OPTIMIZA_OPEN",0,"OPTIMIZA_WEAK",true,true]
 * Field set varies between PCB editor versions; modeled loosely.
 */
export const PcbPreferenceLine = z.tuple([
	z.literal('PREFERENCE'),
]).rest(z.unknown());
export type PcbPreferenceLine = z.infer<typeof PcbPreferenceLine>;

// ---- Connectivity / nets ---------------------------------------------------

/**
 * NET — declared net.
 *   ["NET","",null,null,1,null,0,null]   (the unnamed "no-net" entry)
 *   ["NET","GND",null,null,1,null,0,null]
 *   tag, netName, then various flags / class refs (loose for now)
 */
export const PcbNetLine = z.tuple([
	z.literal('NET'),
	z.string(),  // net name ("" for the unconnected pseudo-net)
]).rest(z.unknown());
export type PcbNetLine = z.infer<typeof PcbNetLine>;

/**
 * PAD_NET — assigns a pad on a placed component to a net.
 *   ["PAD_NET","e0","2","GND","e15"]
 *   tag, padElementId, padNumber, netName, ownerComponentElementId
 */
export const PcbPadNetLine = z.tuple([
	z.literal('PAD_NET'),
	z.string(),  // padElementId
	z.string(),  // padNumber
	z.string(),  // netName
	z.string(),  // ownerComponentElementId
]).rest(z.unknown());
export type PcbPadNetLine = z.infer<typeof PcbPadNetLine>;

// ---- Geometric primitives --------------------------------------------------

/**
 * COMPONENT — a placed footprint instance.
 *   ["COMPONENT","e0",0,1,3691.3515,-404.1105,0,{"Unique ID":"gge8",...},0]
 *   tag, elementId, ?, layer, x, y, rotation, options(obj), flip
 *
 * Note this is structurally distinct from the .esch COMPONENT tuple — only
 * the tag literal is shared. Don't reuse line-component.ts here.
 */
export const PcbComponentLine = z.tuple([
	z.literal('COMPONENT'),
	z.string(),                          // elementId
	z.number(),                          // ?
	z.number(),                          // layer
	z.number(),                          // x
	z.number(),                          // y
	z.number(),                          // rotation
	z.record(z.string(), z.unknown()),   // options (Unique ID, Reuse Block, Group ID, Channel ID, ...)
	z.number(),                          // flip
]).rest(z.unknown());
export type PcbComponentLine = z.infer<typeof PcbComponentLine>;

/**
 * ATTR — PCB attribute. 22 positional fields — completely different from the
 * .esch ATTR (12 fields). Keep loose for now and tighten later when we have
 * a concrete PCB-side attribute editing workflow.
 *   ["ATTR","e0e17",0,"e0",3,null,null,"Footprint","bfcb...",0,0,"default",45,6,0,0,3,0,0,0,0,0]
 *   tag, elementId, ?, parentId, layer, ?, ?, attrName, value, ...trailing positional
 */
export const PcbAttrLine = z.tuple([
	z.literal('ATTR'),
	z.string(),  // elementId
	z.unknown(), // ?
	z.string(),  // parentId
	z.number(),  // layer
	z.unknown(), // ?
	z.unknown(), // ?
	z.string(),  // attrName
	z.unknown(), // value (string | number | null | other)
]).rest(z.unknown());
export type PcbAttrLine = z.infer<typeof PcbAttrLine>;

/**
 * LINE — copper track segment (and silk/document-layer line).
 *   ["LINE","e238",0,"+1V2_FPGA",1,1331.175,-1183.815,1356.775,-1183.815,10,0]
 *   tag, elementId, ?, netName, layer, x1, y1, x2, y2, width, ?
 */
export const PcbLineLine = z.tuple([
	z.literal('LINE'),
	z.string(),  // elementId
	z.unknown(), // ?
	z.string(),  // netName ("" for non-net lines like silk)
	z.number(),  // layer
	z.number(),  // x1
	z.number(),  // y1
	z.number(),  // x2
	z.number(),  // y2
	z.number(),  // width
]).rest(z.unknown());
export type PcbLineLine = z.infer<typeof PcbLineLine>;

/**
 * VIA.
 *   ["VIA","e383",0,"GND","",996.7958,-1240.1955,12.0078,16,0,null,null,0,[]]
 *   tag, elementId, ?, netName, ?, x, y, drillDiam, padDiam, ...trailing
 */
export const PcbViaLine = z.tuple([
	z.literal('VIA'),
	z.string(),  // elementId
	z.unknown(), // ?
	z.string(),  // netName
	z.unknown(), // ?
	z.number(),  // x
	z.number(),  // y
	z.number(),  // drill diameter
	z.number(),  // pad diameter
]).rest(z.unknown());
export type PcbViaLine = z.infer<typeof PcbViaLine>;

/**
 * POUR — copper pour declaration.
 *   ["POUR","e79",0,"GND",15,0.2,"POUR1",0,[["R",-80,65,2170,2145,0,0]],["SOLID",8],0,1]
 *   tag, elementId, ?, netName, layer, gap, pourName, ?, shape, fillStyle, ...
 */
export const PcbPourLine = z.tuple([
	z.literal('POUR'),
	z.string(),  // elementId
	z.unknown(), // ?
	z.string(),  // netName
	z.number(),  // layer
	z.number(),  // gap (clearance)
	z.string(),  // pourName
]).rest(z.unknown());
export type PcbPourLine = z.infer<typeof PcbPourLine>;

/**
 * POURED — pre-rendered pour copper geometry, attached to a parent POUR.
 *   ["POURED","e116","e79",0,true,[[...polyline data...]]]
 *   tag, elementId, parentPourId, ?, isUpToDate, polylineGroups
 *   `isUpToDate` observed as bool; could be number — accept either.
 */
export const PcbPouredLine = z.tuple([
	z.literal('POURED'),
	z.string(),                          // elementId
	z.string(),                          // parentPourId
	z.unknown(),                         // ?
	z.union([z.boolean(), z.number()]),  // isUpToDate (truthy)
]).rest(z.unknown());
export type PcbPouredLine = z.infer<typeof PcbPouredLine>;

/**
 * POLY — PCB polygon primitive (silk/document layer).
 * Shape differs from .esym POLY (defined in line-graphics.ts).
 *   ["POLY","e15",0,"",11,10,["R",0,0,2000,2000,0,0],0]
 *   tag, elementId, ?, netName, layer, ?, shape, ?
 */
export const PcbPolyLine = z.tuple([
	z.literal('POLY'),
	z.string(),  // elementId
	z.unknown(), // ?
	z.string(),  // netName
	z.number(),  // layer
]).rest(z.unknown());
export type PcbPolyLine = z.infer<typeof PcbPolyLine>;

/**
 * REGION — clipped region on a layer.
 *   ["REGION","e160",0,12,0.2,[7,6],[["R",365,-210,340,150,0,0]],0,null]
 *   tag, elementId, ?, layer, gap, layerList, shape, ?, ?
 */
export const PcbRegionLine = z.tuple([
	z.literal('REGION'),
	z.string(),  // elementId
]).rest(z.unknown());
export type PcbRegionLine = z.infer<typeof PcbRegionLine>;

// ---- Text / annotations ----------------------------------------------------

/**
 * STRING — free text on the PCB.
 *   ["STRING","e4606",0,4,720,-1560,"BLUETOOTH TRACKER\nPROTOTYPE 1","default",80,8,0,0,3,180,0,0,0,0]
 *   tag, elementId, ?, layer, x, y, content, fontName, height, ...trailing
 */
export const PcbStringLine = z.tuple([
	z.literal('STRING'),
	z.string(),  // elementId
	z.unknown(), // ?
	z.number(),  // layer
	z.number(),  // x
	z.number(),  // y
	z.string(),  // content
	z.string(),  // fontName
]).rest(z.unknown());
export type PcbStringLine = z.infer<typeof PcbStringLine>;

/**
 * DIMENSION — dimension annotation (only seen sparsely).
 *   ["DIMENSION","e38","LENGTH",13,"mm",6,1,1,[1140,-1750,2215,-1750,2215,-805.1181,1155,-805.1181],0]
 *   tag, elementId, kind ("LENGTH"|...), layer, units, ...
 */
export const PcbDimensionLine = z.tuple([
	z.literal('DIMENSION'),
	z.string(),  // elementId
]).rest(z.unknown());
export type PcbDimensionLine = z.infer<typeof PcbDimensionLine>;

/**
 * FONT — embedded font glyph data.
 * Very large rows; modeled minimally so we don't constrain trailing fields.
 */
export const PcbFontLine = z.tuple([
	z.literal('FONT'),
]).rest(z.unknown());
export type PcbFontLine = z.infer<typeof PcbFontLine>;

// ---- Design rules ---------------------------------------------------------

/**
 * RULE_TEMPLATE — name of the rule template applied to this board.
 *   ["RULE_TEMPLATE","JLCPCB Capability(Two Layers Board)"]
 */
export const PcbRuleTemplateLine = z.tuple([
	z.literal('RULE_TEMPLATE'),
	z.string(),  // template name
]).rest(z.unknown());
export type PcbRuleTemplateLine = z.infer<typeof PcbRuleTemplateLine>;

/**
 * RULE — design rule entry.
 *   ["RULE","1","copperThickness1oz",1,["mm",[[4.0157],...]]]
 *   tag, ruleId, ruleName, ?, value(varies by rule)
 */
export const PcbRuleLine = z.tuple([
	z.literal('RULE'),
	z.string(),  // ruleId
	z.string(),  // ruleName
]).rest(z.unknown());
export type PcbRuleLine = z.infer<typeof PcbRuleLine>;

/**
 * RULE_SELECTOR — scope for a rule (e.g. by net, net class).
 *   ["RULE_SELECTOR",["NET",""],4,{}]
 */
export const PcbRuleSelectorLine = z.tuple([
	z.literal('RULE_SELECTOR'),
]).rest(z.unknown());
export type PcbRuleSelectorLine = z.infer<typeof PcbRuleSelectorLine>;

// ---- Panelization ---------------------------------------------------------

/**
 * PANELIZE — panel mode declaration.
 *   ["PANELIZE",0,1,1,0,0,1]
 */
export const PcbPanelizeLine = z.tuple([
	z.literal('PANELIZE'),
]).rest(z.unknown());
export type PcbPanelizeLine = z.infer<typeof PcbPanelizeLine>;

/**
 * PANELIZE_STAMP / PANELIZE_SIDE — panel feature definitions.
 */
export const PcbPanelizeStampLine = z.tuple([
	z.literal('PANELIZE_STAMP'),
]).rest(z.unknown());
export type PcbPanelizeStampLine = z.infer<typeof PcbPanelizeStampLine>;

export const PcbPanelizeSideLine = z.tuple([
	z.literal('PANELIZE_SIDE'),
]).rest(z.unknown());
export type PcbPanelizeSideLine = z.infer<typeof PcbPanelizeSideLine>;
