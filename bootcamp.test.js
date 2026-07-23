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
  'Max Adamson', 'Samuel Elizondo', 'Deborah Rodriguez', 'Tony Gutierrez',
  'Haus Argun'
];
const BOOL_FIELDS = [
  'aiAgentInstalled', 'jarvisConnected', 'jarvisCrmUser', 'recordingSent', 'attended'
];
// ── 1. schema / seed ──────────────────────────────────────────────────────
process.stdout.write('\n[schema/seed]\n');

test('bootcampAttendees array exists in projects.json', () => {
  assert.ok(Array.isArray(db.bootcampAttendees), 'expected bootcampAttendees to be an array');
});

test('bootcampAttendees has exactly 13 tracked entries', () => {
  assert.strictEqual((db.bootcampAttendees || []).length, 13);
});

test('all 13 tracked names are present (exact match)', () => {
  const names = (db.bootcampAttendees || []).map(a => a.name);
  REQUIRED_NAMES.forEach(n => assert.ok(names.includes(n), 'Missing: ' + n));
});

test('each attendee has a stable sequential id BA-001…BA-013', () => {
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

test('attendee names are unique', () => {
  const names = (db.bootcampAttendees || []).map(a => a.name);
  assert.strictEqual(new Set(names).size, names.length);
});

test('attendee ids are unique', () => {
  const ids = (db.bootcampAttendees || []).map(a => a.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('Brandon Boyce has a Jarvis AI Agent project', () => {
  const client = (db.clients || []).find(c => c.name === 'Brandon Boyce');
  assert.ok(client, 'Missing Brandon Boyce client');
  const project = (client.projects || []).find(p => p.id === 'P-027');
  assert.ok(project, 'Missing Brandon Boyce P-027 project');
  assert.strictEqual(project.buildType, 'AI Agent Installation + Jarvis');
  assert.strictEqual(project.payment.total, 527);
});

test('Dark Phoenix knowledgebase is not exposed on the Command Center', () => {
  const projects = (db.clients || []).flatMap(c => c.projects || []);
  assert.ok(!projects.some(p => p.id === 'P-028'), 'P-028 must not be stored on the Command Center');
  assert.ok(!projects.some(p => /dark phoenix.*knowledgebase/i.test(p.name || '')), 'knowledgebase project must not be displayed');
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

// ── 5. daily progress reporting ──────────────────────────────────────────
process.stdout.write('\n[daily progress reporting]\n');

test('Daily Progress tab and view exist', () => {
  assert.ok(html.includes('data-tab="progress"'), 'missing Daily Progress tab');
  assert.ok(html.includes('id="view-progress"'), 'missing Daily Progress view');
  assert.ok(html.includes('id="dailyProgress"'), 'missing daily progress report container');
});

test('Daily Progress is routed through VIEWS and switchTab', () => {
  assert.ok(html.includes('progress:"view-progress"'), 'VIEWS should map progress to view-progress');
  assert.ok(html.includes('if(t==="progress")renderDailyProgress()'), 'switchTab should render daily progress');
});

test('Daily Progress computes live project, task, risk, payment, and follow-up data', () => {
  const start = html.indexOf('function renderDailyProgress');
  assert.ok(start >= 0, 'missing renderDailyProgress function');
  const body = html.slice(start, start + 7000);
  ['allProjects()', 'projPct', 'health(', 'payment', 'followups()'].forEach(token => {
    assert.ok(body.includes(token), 'renderDailyProgress missing ' + token);
  });
});

// ── summary ───────────────────────────────────────────────────────────────
process.stdout.write('\n' + passed + ' passed, ' + failed + ' failed\n\n');
if (failed > 0) process.exit(1);
