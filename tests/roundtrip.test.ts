import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	parseEschSource,
	parseEsymSource,
	parseEpcbSource,
	parseEinsSource,
	serializeEschLines,
	serializeEpcbLines,
	serializeEinsLines,
} from '../src/lib/schema';
import { parseSchematic } from '../src/lib/schematic-reader';
import { SchematicWriter } from '../src/lib/schematic-writer';

const ESCH_FIXTURE = readFileSync(join(__dirname, 'fixtures/sample.esch'), 'utf8');
const ESYM_FIXTURE = readFileSync(join(__dirname, 'fixtures/sample.esym'), 'utf8');
const EPCB_FIXTURE = readFileSync(join(__dirname, 'fixtures/sample.epcb'), 'utf8');
const EINS_FIXTURE = readFileSync(join(__dirname, 'fixtures/sample.eins'), 'utf8');

test('.esch parses with zero unknowns and zero invalids', () => {
	const { lines, report } = parseEschSource(ESCH_FIXTURE);
	assert.equal(report.unknownTagCount, 0, `unknowns: ${JSON.stringify(report.samples.unknownTags)}`);
	assert.equal(report.invalidCount, 0, `invalids: ${JSON.stringify(report.samples.invalid)}`);
	assert.ok(report.knownCount > 0);
	assert.ok(lines.every((l) => l.kind === 'known' || l.kind === 'blank'));
});

test('.esym parses with zero unknowns and zero invalids', () => {
	const { report } = parseEsymSource(ESYM_FIXTURE);
	assert.equal(report.unknownTagCount, 0);
	assert.equal(report.invalidCount, 0);
	assert.ok(report.knownCount > 0);
});

test('.esch round-trips byte-identically when no mutations are made', () => {
	const { lines } = parseEschSource(ESCH_FIXTURE);
	const out = serializeEschLines(lines);
	assert.equal(out, ESCH_FIXTURE);
});

test('SchematicWriter serialize differs from input only in HEAD.maxId after a mutation', () => {
	const model = parseSchematic(ESCH_FIXTURE, { 'sym-resistor-uuid': ESYM_FIXTURE });
	const writer = new SchematicWriter(ESCH_FIXTURE, model);

	// Allocate new element IDs (which advances nextElementId past maxId) without
	// adding any lines. Serialize should produce the original file with an
	// updated HEAD.maxId and nothing else.
	const priorMaxId = model.maxId;
	(writer as any).allocId();
	(writer as any).allocId();

	const out = writer.serialize();
	const inputLines = ESCH_FIXTURE.split('\n');
	const outputLines = out.split('\n');

	// Should be same number of lines
	assert.equal(outputLines.length, inputLines.length, 'line count should match');

	// Every line should match except HEAD
	for (let i = 0; i < inputLines.length; i++) {
		if (inputLines[i].startsWith('["HEAD"')) {
			assert.notEqual(outputLines[i], inputLines[i], 'HEAD line should have changed');
			const newHead = JSON.parse(outputLines[i]);
			assert.equal(newHead[1].maxId, priorMaxId + 2);
		} else {
			assert.equal(outputLines[i], inputLines[i], `line ${i} should be byte-identical`);
		}
	}
});

test('injected unknown tag is reported as unknown-tag and survives round-trip', () => {
	const injected = ESCH_FIXTURE + '\n["FOOBAR","e999",null]';
	const { lines, report } = parseEschSource(injected);

	assert.equal(report.unknownTagCount, 1);
	assert.equal(report.samples.unknownTags.length, 1);
	assert.equal(report.samples.unknownTags[0].tag, 'FOOBAR');

	const out = serializeEschLines(lines);
	assert.equal(out, injected, 'unknown lines should round-trip byte-identically');
});

test('malformed known tag is reported as invalid (type mismatch)', () => {
	// COMPONENT at position 3 must be a number; replace with a string.
	const corrupted = ESCH_FIXTURE.replace(
		'["COMPONENT","e10","R_0402.1",1000,500,0,0,{},0]',
		'["COMPONENT","e10","R_0402.1","not-a-number",500,0,0,{},0]',
	);
	const { report } = parseEschSource(corrupted);
	assert.ok(report.invalidCount >= 1, 'invalid should be detected');
	const hasComponentIssue = report.samples.invalid.some((i) => i.tag === 'COMPONENT');
	assert.ok(hasComponentIssue, `expected a COMPONENT invalid sample; got: ${JSON.stringify(report.samples.invalid)}`);
});

test('fingerprints deduplicate: many identical unknowns produce one sample', () => {
	const many = ESCH_FIXTURE + '\n' + Array.from({ length: 5 }, (_, i) => `["FOOBAR","e${1000 + i}",null]`).join('\n');
	const { report } = parseEschSource(many);
	assert.equal(report.unknownTagCount, 5, 'all 5 occurrences counted');
	assert.equal(report.samples.unknownTags.length, 1, 'but only 1 sample kept (deduped)');
});

// ---------------------------------------------------------------------------
// .epcb (PCB) schema
// ---------------------------------------------------------------------------

test('.epcb parses with zero unknowns and zero invalids', () => {
	const { lines, report } = parseEpcbSource(EPCB_FIXTURE);
	assert.equal(report.docType, 'epcb');
	assert.equal(report.unknownTagCount, 0, `unknowns: ${JSON.stringify(report.samples.unknownTags)}`);
	assert.equal(report.invalidCount, 0, `invalids: ${JSON.stringify(report.samples.invalid)}`);
	assert.ok(report.knownCount > 0);
	assert.ok(lines.every((l) => l.kind === 'known' || l.kind === 'blank'));
});

test('.epcb round-trips byte-identically when no mutations are made', () => {
	const { lines } = parseEpcbSource(EPCB_FIXTURE);
	const out = serializeEpcbLines(lines);
	assert.equal(out, EPCB_FIXTURE);
});

test('.epcb injected unknown tag is reported and survives round-trip', () => {
	const injected = EPCB_FIXTURE + '\n["FOOBAR_PCB","e9999"]';
	const { lines, report } = parseEpcbSource(injected);
	assert.equal(report.unknownTagCount, 1);
	assert.equal(report.samples.unknownTags[0].tag, 'FOOBAR_PCB');
	assert.equal(serializeEpcbLines(lines), injected);
});

test('.epcb LINE with non-numeric x1 is reported as invalid', () => {
	const corrupted = EPCB_FIXTURE.replace(
		/\["LINE","e\d+",[^,]+,"[^"]*",\d+,([0-9.\-]+),/,
		(match, _x1) => match.replace(/,([0-9.\-]+),$/, ',"not-a-number",'),
	);
	if (corrupted === EPCB_FIXTURE) return; // no LINE in this fixture; skip
	const { report } = parseEpcbSource(corrupted);
	assert.ok(report.invalidCount >= 1, 'invalid LINE should be detected');
	assert.ok(report.samples.invalid.some((i) => i.tag === 'LINE'));
});

// ---------------------------------------------------------------------------
// .eins (instance overrides) schema
// ---------------------------------------------------------------------------

test('.eins parses with zero unknowns and zero invalids', () => {
	const { report } = parseEinsSource(EINS_FIXTURE);
	assert.equal(report.docType, 'eins');
	assert.equal(report.unknownTagCount, 0);
	assert.equal(report.invalidCount, 0);
	assert.ok(report.knownCount > 0);
});

test('.eins round-trips byte-identically when no mutations are made', () => {
	const { lines } = parseEinsSource(EINS_FIXTURE);
	assert.equal(serializeEinsLines(lines), EINS_FIXTURE);
});
