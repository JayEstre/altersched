'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireRole } from '@/lib/auth/require-role'
import { createClient } from '@/lib/supabase/server'

/* =========================================================
   HELPERS
   ========================================================= */

function field(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) ?? ''
  ).trim()
}

function schedulePath(
  query = ''
) {
  return `/student/schedule${query}`
}

/* =========================================================
   CLAIM SCHEDULE USING CLASS CODE

   FINAL FLOW:

   Student enters Code
        ↓
   Server Action
        ↓
   claim_schedule_with_code(code)
        ↓
   PostgreSQL hashes/resolves Code
        ↓
   claim_schedule(access_code_id, 'code')
        ↓
   PostgreSQL validates:
     - authenticated student
     - approved account
     - student profile
     - active access credential
     - published schedule
     - department
     - program
     - year level
     - section/block
     - semester membership
        ↓
   schedule_memberships
   ========================================================= */

export async function claimScheduleWithCode(
  formData: FormData
) {
  const { profile } =
    await requireRole([
      'student',
    ])

  const s =
    await createClient()

  /* =======================================================
     NORMALIZE CODE

     Admin-generated codes use the ALT-XXXX format.

     We normalize:
       alt-ab12cd34
       ALT-AB12CD34
       ALT- AB12CD34

     into the same uppercase/no-space representation.
     ======================================================= */

  const code = field(
    formData,
    'code'
  )
    .toUpperCase()
    .replace(/\s+/g, '')

  if (!code) {
    redirect(
      schedulePath(
        '?error=code_required'
      )
    )
  }

  /* =======================================================
     BASIC LENGTH PROTECTION

     Prevent obviously malformed or excessively large input.
     The database RPC remains the final authority.
     ======================================================= */

  if (code.length > 100) {
    redirect(
      schedulePath(
        '?error=invalid_code'
      )
    )
  }

  /* =======================================================
     STUDENT PROFILE CHECK

     claim_schedule() checks this again.

     We still verify here so the UI can show a cleaner
     message before attempting the claim.
     ======================================================= */

  const {
    data: studentProfile,
    error: studentError,
  } = await s
    .from(
      'student_profiles'
    )
    .select(`
      id,
      student_id,
      department_id,
      program_id,
      year_level_id,
      section_id
    `)
    .eq(
      'profile_id',
      profile.id
    )
    .maybeSingle()

  if (studentError) {
    console.error(
      'Student profile lookup failed:',
      studentError
    )

    redirect(
      schedulePath(
        `?error=student_profile_lookup_failed&details=${encodeURIComponent(
          studentError.message
        )}`
      )
    )
  }

  if (!studentProfile) {
    redirect(
      schedulePath(
        '?error=student_profile_not_found'
      )
    )
  }

  if (
    !studentProfile.department_id ||
    !studentProfile.program_id ||
    !studentProfile.year_level_id ||
    !studentProfile.section_id
  ) {
    redirect(
      schedulePath(
        '?error=student_profile_incomplete'
      )
    )
  }

  /* =======================================================
     APPROVAL CHECK

     The database claim function checks this again.
     ======================================================= */

  if (
    profile.account_status !==
    'approved'
  ) {
    redirect(
      schedulePath(
        '?error=account_not_approved'
      )
    )
  }

  /* =======================================================
     SECURE CLAIM

     IMPORTANT:

     We DO NOT query schedule_access_codes here.

     The secure PostgreSQL function resolves the raw code
     internally and then delegates to the official
     Database V2 claim_schedule() function.
     ======================================================= */

  const {
    data: membershipId,
    error: claimError,
  } = await s.rpc(
    'claim_schedule_with_code',
    {
      p_code: code,
    }
  )

  /* =======================================================
     DATABASE ERROR MAPPING
     ======================================================= */

  if (claimError) {
    console.error(
      'Schedule claim failed:',
      claimError
    )

    const message =
      (
        claimError.message ||
        ''
      ).toLowerCase()

    /* -----------------------------------------------------
       ACCOUNT NOT APPROVED
       ----------------------------------------------------- */

    if (
      message.includes(
        'account must be approved'
      ) ||
      message.includes(
        'account_not_approved'
      )
    ) {
      redirect(
        schedulePath(
          '?error=account_not_approved'
        )
      )
    }

    /* -----------------------------------------------------
       NOT A STUDENT
       ----------------------------------------------------- */

    if (
      message.includes(
        'only student'
      )
    ) {
      redirect(
        schedulePath(
          '?error=student_account_required'
        )
      )
    }

    /* -----------------------------------------------------
       STUDENT PROFILE
       ----------------------------------------------------- */

    if (
      message.includes(
        'student profile not found'
      )
    ) {
      redirect(
        schedulePath(
          '?error=student_profile_not_found'
        )
      )
    }

    /* -----------------------------------------------------
       INVALID / REVOKED / EXPIRED CODE
       ----------------------------------------------------- */

    if (
      message.includes(
        'invalid'
      ) ||
      message.includes(
        'inactive'
      ) ||
      message.includes(
        'expired'
      ) ||
      message.includes(
        'revoked'
      ) ||
      message.includes(
        'class code'
      ) ||
      message.includes(
        'access code'
      )
    ) {
      redirect(
        schedulePath(
          '?error=invalid_code'
        )
      )
    }

    /* -----------------------------------------------------
       DEPARTMENT MISMATCH
       ----------------------------------------------------- */

    if (
      message.includes(
        'department'
      )
    ) {
      redirect(
        schedulePath(
          '?error=department_mismatch'
        )
      )
    }

    /* -----------------------------------------------------
       PROGRAM MISMATCH
       ----------------------------------------------------- */

    if (
      message.includes(
        'program'
      )
    ) {
      redirect(
        schedulePath(
          '?error=program_mismatch'
        )
      )
    }

    /* -----------------------------------------------------
       YEAR LEVEL MISMATCH
       ----------------------------------------------------- */

    if (
      message.includes(
        'year level'
      ) ||
      message.includes(
        'year_level'
      )
    ) {
      redirect(
        schedulePath(
          '?error=year_level_mismatch'
        )
      )
    }

    /* -----------------------------------------------------
       SECTION / BLOCK MISMATCH
       ----------------------------------------------------- */

    if (
      message.includes(
        'section'
      ) ||
      message.includes(
        'block'
      )
    ) {
      redirect(
        schedulePath(
          '?error=section_mismatch'
        )
      )
    }

    /* -----------------------------------------------------
       SCHEDULE NOT PUBLISHED
       ----------------------------------------------------- */

    if (
      message.includes(
        'not currently published'
      ) ||
      message.includes(
        'not published'
      )
    ) {
      redirect(
        schedulePath(
          '?error=schedule_not_published'
        )
      )
    }

    /* -----------------------------------------------------
       EXISTING ACTIVE SCHEDULE
       ----------------------------------------------------- */

    if (
      message.includes(
        'already have an active schedule'
      ) ||
      message.includes(
        'existing_active_schedule'
      )
    ) {
      redirect(
        schedulePath(
          '?error=active_schedule_exists'
        )
      )
    }

    /* -----------------------------------------------------
       AUTHENTICATION
       ----------------------------------------------------- */

    if (
      message.includes(
        'authentication required'
      )
    ) {
      redirect(
        '/login?error=session_required'
      )
    }

    /* -----------------------------------------------------
       UNKNOWN ERROR
       ----------------------------------------------------- */

    redirect(
      schedulePath(
        `?error=claim_failed&details=${encodeURIComponent(
          claimError.message
        )}`
      )
    )
  }

  /* =======================================================
     RESULT CHECK

     claim_schedule_with_code()
     returns the UUID returned by claim_schedule().
     ======================================================= */

  if (!membershipId) {
    console.error(
      'Schedule claim returned no membership ID.'
    )

    redirect(
      schedulePath(
        '?error=claim_not_completed'
      )
    )
  }

  /* =======================================================
     CONFIRM MEMBERSHIP

     Student is allowed by RLS to read their own membership.
     ======================================================= */

  const {
    data: membership,
    error: membershipError,
  } = await s
    .from(
      'schedule_memberships'
    )
    .select(`
      id,
      schedule_id,
      schedule_version_id,
      student_profile_id,
      section_id,
      claimed_via,
      claimed_at,
      active
    `)
    .eq(
      'id',
      membershipId
    )
    .eq(
      'student_profile_id',
      studentProfile.id
    )
    .eq(
      'active',
      true
    )
    .maybeSingle()

  if (membershipError) {
    console.error(
      'Membership confirmation failed:',
      membershipError
    )

    redirect(
      schedulePath(
        `?error=claim_confirmation_failed&details=${encodeURIComponent(
          membershipError.message
        )}`
      )
    )
  }

  if (!membership) {
    console.error(
      'Membership was not found after successful claim.',
      {
        membershipId,
        studentProfileId:
          studentProfile.id,
      }
    )

    redirect(
      schedulePath(
        '?error=claim_not_completed'
      )
    )
  }

  /* =======================================================
     FINAL SAFETY CHECK

     Membership must belong to the student's registered
     section.
     ======================================================= */

  if (
    membership.section_id !==
    studentProfile.section_id
  ) {
    console.error(
      'Claimed membership section does not match student profile.',
      {
        membershipSection:
          membership.section_id,

        studentSection:
          studentProfile.section_id,
      }
    )

    redirect(
      schedulePath(
        '?error=section_mismatch'
      )
    )
  }

  /* =======================================================
     REFRESH STUDENT UI
     ======================================================= */

  revalidatePath(
    '/student/dashboard'
  )

  revalidatePath(
    '/student/schedule'
  )

  revalidatePath(
    '/student/notifications'
  )

  /* =======================================================
     SUCCESS
     ======================================================= */

  redirect(
    schedulePath(
      '?success=schedule_claimed'
    )
  )
}