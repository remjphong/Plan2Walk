import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WalkMotion } from './motion';

test('jump stops at a lintel, flight remains an explicit free camera', () => {
  const motion = new WalkMotion();
  motion.space(0); motion.step(.035, false, false);
  motion.limitHeadroom(.05);
  assert.equal(motion.height, .05);
  assert.equal(motion.velocity, 0);
  motion.space(100); motion.step(.035, true, false);
  motion.limitHeadroom(.05);
  assert.ok(motion.height > .05);
});

test('single press jumps, holding does not retrigger, gravity lands', () => {
  const motion = new WalkMotion();
  motion.space(0);
  for (let i = 1; i < 20; i++) { motion.space(i * 16, true); motion.step(.016, true, false); }
  assert.ok(motion.height > .5);
  assert.equal(motion.flying, false);
  for (let i = 0; i < 100; i++) motion.step(.016, false, false);
  assert.equal(motion.height, 0);
  assert.equal(motion.velocity, 0);
});

test('two distinct taps toggle flight; third tap cannot toggle again', () => {
  const motion = new WalkMotion();
  motion.space(0); motion.space(150); motion.space(200);
  assert.equal(motion.flying, true);
  motion.step(.032, true, false);
  assert.ok(motion.height > 0);
  motion.space(1000); motion.space(1150);
  assert.equal(motion.flying, false);
  for (let i = 0; i < 100; i++) motion.step(.016, false, false);
  assert.equal(motion.height, 0);
});

test('focus reset cancels pending double tap and flight height stays bounded', () => {
  const motion = new WalkMotion();
  motion.space(0); motion.clearTap(); motion.space(100);
  assert.equal(motion.flying, false);
  motion.space(200);
  for (let i = 0; i < 1000; i++) motion.step(1, true, false);
  assert.equal(motion.height, 30);
  for (let i = 0; i < 1000; i++) motion.step(1, false, true);
  assert.equal(motion.height, 0);
});
