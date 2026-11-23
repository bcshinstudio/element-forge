const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {test} = require('node:test');
const assert = require('node:assert/strict');

test('story motion uses finite canvas coordinates throughout each scene', () => {
  const window = {};
  runInNewContext(readFileSync(require.resolve('../story-motion.js'), 'utf8'), {window});
  let gradients = 0;
  const check = (...values) => assert.ok(values.every(Number.isFinite), String(values));
  const ctx = new Proxy({}, {get: (_, key) => key === 'createRadialGradient'
    ? (...values) => {
      check(...values);
      gradients++;
      return {addColorStop() {}};
    }
    : (...values) => check(...values.filter(value => typeof value === 'number'))});
  for (const scene of ['heart', 'gate', 'relief', 'loom', 'star', 'symphony', 'null', 'world']) {
    const previous = gradients;
    for (let i = 0; i <= 100; i++) {
      window.EFStoryMotion(scene, {x: 0, y: 0, w: 640, h: 360}, i / 100, ctx, {});
    }
    assert.ok(gradients > previous, scene);
  }
});
