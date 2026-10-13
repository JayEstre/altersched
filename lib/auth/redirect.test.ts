import test from 'node:test'
import assert from 'node:assert/strict'

import { destinationFor } from './redirect'

test('destinationFor accepts normalized and legacy casing variants', () => {
  assert.equal(destinationFor('SUPER_ADMIN', 'approved'), '/admin/dashboard')
  assert.equal(destinationFor('Department_Scheduler', 'approved'), '/scheduler/dashboard')
  assert.equal(destinationFor('faculty', 'approved'), '/faculty/dashboard')
  assert.equal(destinationFor('student', 'approved'), '/student/dashboard')
})

test('destinationFor blocks unsupported roles and non-approved states', () => {
  assert.equal(destinationFor('unknown_role', 'approved'), '/login?error=role_not_supported')
  assert.equal(destinationFor('faculty', 'pending'), '/pending-approval')
  assert.equal(destinationFor('faculty', 'suspended'), '/pending-approval')
})
