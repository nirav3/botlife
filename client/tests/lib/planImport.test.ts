import { describe, it, expect } from 'vitest';
import { parsePlanFile } from '@/lib/planImport';

describe('parsePlanFile: JSON', () => {
  it('positive: parses a well-formed JSON plan and normalizes defaults', () => {
    const json = JSON.stringify({
      name: 'Push Day',
      difficulty: 'Intermediate',
      days: [
        {
          label: 'Day 1',
          exercises: [{ name: 'Bench Press', muscleGroup: 'Chest', sets: [{ targetReps: '8-12', rpe: 8 }] }],
        },
      ],
    });

    const result = parsePlanFile(json, 'plan.json');

    expect(result.name).toBe('Push Day');
    expect(result.days).toHaveLength(1);
    expect(result.days[0].sessionName).toBe('Day 1'); // falls back to label
    expect(result.days[0].exercises[0].sets[0]).toMatchObject({ setNumber: 1, targetReps: '8-12', rpe: 8 });
  });

  it('negative: throws a clear error for invalid JSON syntax', () => {
    expect(() => parsePlanFile('{ this is not valid json', 'plan.json')).toThrow(/Couldn't parse JSON/);
  });

  it('negative: throws when "name" is missing', () => {
    const json = JSON.stringify({ days: [{ label: 'Day 1', exercises: [] }] });
    expect(() => parsePlanFile(json, 'plan.json')).toThrow(/missing a "name"/);
  });

  it('negative: throws when "days" is missing or empty', () => {
    const json = JSON.stringify({ name: 'Empty Plan', days: [] });
    expect(() => parsePlanFile(json, 'plan.json')).toThrow(/at least one day/);
  });
});

describe('parsePlanFile: YAML', () => {
  it('positive: parses a well-formed YAML plan', () => {
    const yaml = [
      'name: Leg Day',
      'days:',
      '  - label: Day 1',
      '    exercises:',
      '      - name: Squat',
      '        muscleGroup: Legs',
      '        sets:',
      '          - targetReps: "8"',
      '            isWarmup: true',
    ].join('\n');

    const result = parsePlanFile(yaml, 'leg-day.yaml');

    expect(result.name).toBe('Leg Day');
    expect(result.days[0].exercises[0].name).toBe('Squat');
    expect(result.days[0].exercises[0].sets[0].isWarmup).toBe(true);
  });

  it('negative: throws a clear error for invalid YAML syntax', () => {
    const badYaml = 'name: Test\n  bad indentation: [unclosed';
    expect(() => parsePlanFile(badYaml, 'plan.yaml')).toThrow(/Couldn't parse YAML/);
  });

  it('negative: .yml extension is treated as YAML too', () => {
    const yaml = 'name: Short Ext\ndays:\n  - label: Day 1\n    exercises: []';
    const result = parsePlanFile(yaml, 'plan.yml');
    expect(result.name).toBe('Short Ext');
  });

  it('SECURITY: rejects/does not execute a YAML !!js/function deserialization payload', () => {
    // Classic js-yaml RCE vector from < v4 (unsafe `load`). js-yaml v4+ makes
    // `load()` always use the safe default schema, so this tag is simply
    // unrecognized and should throw a parse error — never be silently
    // constructed into a callable function.
    const malicious = [
      'name: Evil Plan',
      'days: []',
      'pwned: !!js/function "function (){ return global.process.mainModule.require(\'child_process\').execSync(\'touch /tmp/pwned\') }"',
    ].join('\n');

    expect(() => parsePlanFile(malicious, 'evil.yaml')).toThrow();
  });
});

describe('parsePlanFile: structural robustness (malformed/partial data)', () => {
  it('negative: fills in missing setNumber/targetReps/exercise fields rather than crashing', () => {
    const json = JSON.stringify({
      name: 'Sparse Plan',
      days: [{ exercises: [{ sets: [{}, {}] }] }],
    });

    const result = parsePlanFile(json, 'plan.json');

    expect(result.days[0].exercises[0].sets).toEqual([
      { setNumber: 1, targetReps: '', rpe: undefined, isWarmup: false },
      { setNumber: 2, targetReps: '', rpe: undefined, isWarmup: false },
    ]);
  });

  it('negative: a day with no exercises array gets a safe placeholder exercise, not a crash', () => {
    const json = JSON.stringify({ name: 'No Exercises', days: [{ label: 'Rest Day' }] });

    const result = parsePlanFile(json, 'plan.json');

    expect(result.days[0].exercises).toHaveLength(1);
    expect(result.days[0].exercises[0].name).toBe('');
  });

  it('negative: non-object top-level JSON is rejected safely, never crashes', () => {
    // A bare string fails the object-shape check directly...
    expect(() => parsePlanFile('"just a string"', 'plan.json')).toThrow(/must contain a plan object/);
    // ...while a bare array is technically `typeof 'object'` in JS, so it
    // falls through to the next check instead — still safely rejected, just
    // with a different (still correct) message rather than a crash.
    expect(() => parsePlanFile('[1,2,3]', 'plan.json')).toThrow(/missing a "name"/);
  });

  it('negative: non-string tags in the tags array are filtered out rather than breaking the UI', () => {
    const json = JSON.stringify({
      name: 'Weird Tags',
      tags: ['Barbell', 42, null, { nested: true }, 'Split'],
      days: [{ label: 'Day 1', exercises: [] }],
    });

    const result = parsePlanFile(json, 'plan.json');

    expect(result.tags).toEqual(['Barbell', 'Split']);
  });
});
