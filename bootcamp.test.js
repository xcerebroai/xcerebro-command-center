#!/usr/bin/env node
// bootcamp.test.js — TDD suite for Bootcamp Tracker feature
// Run: node bootcamp.test.js
'use strict';
const fs   = require('fs');
const path = require('path');
const assert = require('assert');

const DIR = __dirname;
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    process.stdout.write('  ✓ ' + name + '\n');
    passed++;
  } catch (e) {
    process.stdout.write('  ✗ ' + name + ': ' + e.message + '\n');
    failed++;
  }
}

// ── load files ────────────────────────────────────────────────────────────
let db, html;
try {
  db = JSON.parse(fs.readFileSync(path.join(DIR, 'projects.json'), 'utf8'));
} catch (e) {
  process.stdout.write('FATAL: cannot parse projects.json: ' + e.message + '\n');
  process.exit(1);
}
html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

const REQUIRED_NAMES = [
  'Adam Pasternak', 'Alejandro Carbajal', 'David Roberts', 'Debra Batterson',
  'Dennis Alvarado', 'James Raeford', 'Javier Navarro', 'Jenn Waldman',
  'Max Adamson', 'Samuel Elizondo', 'Deborah Rodriguez', 'Tony Gutierrez'
];
const BOOL_FIELDS = [
  'aiAgentInstalled', 'jarvisConnected', 'jarvisCrmUser', 'recordingSent', 'attended'
];
// Only attendees whose exact-name client project has "AI Agent configured" done:true
const AI_INSTALLED_NAMES = ['Alejandro Carbajal', 'Tony Gutierrez'];

// ── 1. schema / seed ──────────────────────────────────────────────────────
process.stdout.write('\n[schema/seed]\n');

test('bootcampAttendees array exists in projects.json', () => {
  assert.ok(Array.isArray(db.bootcampAttendees), 'expected bootcampAttendees to be an array');
});

test('bootcampAttendees has exactly 12 verified paid entries', () => {
  assert.strictEqual((db.bootcampAttendees || []).length, 12);
});

test('all 12 verified paid names are present (exact match)', () => {
  const names = (db.bootcampAttendees || []).map(a => a.name);
  REQUIRED_NAMES.forEach(n => assert.ok(names.includes(n), 'Missing: ' + n));
});

test('each attendee has a stable sequential id BA-001…BA-012', () => {
  (db.bootcampAttendees || []).forEach((a, i) => {
    const expected = 'BA-' + String(i + 1).padStart(3, '0');
    assert.strictEqual(a.id, expected, 'Expected ' + expected + ' got ' + a.id);
  });
});

BOOL_FIELDS.forEach(field => {
  test('each attendee has boolean field: ' + field, () => {
    (db.bootcampAttendees || []).forEach(a => {
      assert.ok(field in a, a.name + ' missing ' + field);
      assert.strictEqual(typeof a[field], 'boolean', a.name + '.' + field + ' must be boolean');
    });
  });
});

test('each attendee has a notes string field', () => {
  (db.bootcampAttendees || []).forEach(a => {
    assert.ok('notes' in a, a.name + ' missing notes');
    assert.strictEqual(typeof a.notes, 'string', a.name + '.notes must be string');
  });
});

test('aiAgentInstalled true only for Alejandro Carbajal and Tony Gutierrez', () => {
  (db.bootcampAttendees || []).forEach(a => {
    const expected = AI_INSTALLED_NAMES.includes(a.name);
    assert.strictEqual(
      a.aiAgentInstalled, expected,
      a.name + '.aiAgentInstalled should be ' + expected
    );
  });
});

test('all other booleans default to false', () => {
  const others = BOOL_FIELDS.filter(f => f !== 'aiAgentInstalled');
  (db.bootcampAttendees || []).forEach(a => {
    others.forEach(f =>
      assert.strictEqual(a[f], false, a.name + '.' + f + ' must start false')
    );
  });
});

// ── 2. live-root tab wiring ───────────────────────────────────────────────
process.stdout.write('\n[live-root tab wiring]\n');

test('bootcamp tab button exists (data-tab="bootcamp")', () => {
  assert.ok(html.includes('data-tab="bootcamp"'), 'missing bootcamp tab button');
});

test('bootcamp tab badge span exists (id="bootcampBadge")', () => {
  assert.ok(html.includes('id="bootcampBadge"'), 'missing bootcampBadge span');
});

test('view-bootcamp div exists', () => {
  assert.ok(html.includes('id="view-bootcamp"'), 'missing view-bootcamp div');
});

test('VIEWS object maps bootcamp to view-bootcamp', () => {
  assert.ok(
    html.includes('bootcamp:"view-bootcamp"') ||
    html.includes('"bootcamp":"view-bootcamp"'),
    'VIEWS should map bootcamp→view-bootcamp'
  );
});

test('switchTab calls renderBootcamp when t==="bootcamp"', () => {
  assert.ok(
    html.includes('if(t==="bootcamp")renderBootcamp()') ||
    html.includes("if(t==='bootcamp')renderBootcamp()"),
    'switchTab should call renderBootcamp for bootcamp tab'
  );
});

// ── 3. five checklist fields in rendered UI ───────────────────────────────
process.stdout.write('\n[five checklist fields]\n');

BOOL_FIELDS.forEach(field => {
  test('field "' + field + '" referenced inside renderBootcamp', () => {
    const start = html.indexOf('function renderBootcamp');
    assert.ok(start >= 0, 'renderBootcamp not found');
    const body = html.slice(start, start + 6000);
    assert.ok(body.includes(field), '"' + field + '" not in renderBootcamp body');
  });
});

// ── 4. persistence handler wiring ────────────────────────────────────────
process.stdout.write('\n[persistence handler wiring]\n');

test('renderBootcamp function is defined in index.html', () => {
  assert.ok(html.includes('function renderBootcamp'), 'missing renderBootcamp function');
});

test('renderBootcamp wires commitChange referencing bootcampAttendees', () => {
  const start = html.indexOf('function renderBootcamp');
  assert.ok(start >= 0, 'renderBootcamp not found');
  const body = html.slice(start, start + 6000);
  assert.ok(body.includes('commitChange'), 'commitChange not found in renderBootcamp');
  assert.ok(body.includes('bootcampAttendees'), 'bootcampAttendees not referenced in renderBootcamp');
});

test('Bootcamp handlers await persistence and re-render on save failure', () => {
  const start = html.indexOf('function renderBootcamp');
  const body = html.slice(start, start + 7000);
  assert.ok(body.includes('const saved=await commitChange'), 'handlers must await commitChange');
  assert.ok(body.includes('if(!saved)renderBootcamp()'), 'handlers must rollback visual state after failed save');
});

test('commitChange reports success or failure to callers', () => {
  const start = html.indexOf('async function commitChange');
  const body = html.slice(start, start + 1800);
  assert.ok(body.includes('return false'), 'commitChange must return false on missing auth/save failure');
  assert.ok(body.includes('return true'), 'commitChange must return true after successful persistence');
});

test('render() conditionally calls renderBootcamp via bctable check', () => {
  assert.ok(
    html.includes('getElementById("bctable"))renderBootcamp') ||
    html.includes("getElementById('bctable'))renderBootcamp"),
    'render() must guard-call renderBootcamp with bctable check'
  );
});

// ── summary ───────────────────────────────────────────────────────────────
process.stdout.write('\n' + passed + ' passed, ' + failed + ' failed\n\n');
if (failed > 0) process.exit(1);
