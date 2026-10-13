import { ASSIGNMENT_MESSAGES } from './instructor-assignment-table'

/** Messages for "Prepare Class Offerings" and instructor changes, shared by every page that offers them. */
export const OFFERING_MESSAGES = {
  success: {
    offerings_already_prepared:
      'The required Class Offerings are already prepared. No duplicate records were created.',
    ...ASSIGNMENT_MESSAGES.success,
  } as Record<string, string>,
  error: {
    semester_required: 'Please select a Semester.',
    semester_not_found: 'The selected Semester could not be found.',
    invalid_semester_term:
      'AlterSched could not determine whether the selected Semester is the 1st or 2nd Semester.',
    curricula_load_failed: 'AlterSched could not load the active curricula.',
    no_active_curricula: 'No active curriculum is available for the selected Program scope.',
    mappings_load_failed: 'AlterSched could not load the Curriculum Subject mappings.',
    no_curriculum_subjects: 'No Subjects are mapped to the selected Semester and Program scope.',
    sections_load_failed: 'AlterSched could not load the active Blocks.',
    no_active_sections:
      'No active Blocks exist for the Year Levels included in the selected curriculum.',
    invalid_mapping_hours: 'One or more Curriculum Subject mappings have invalid Weekly Hours.',
    no_offerings_required:
      'No Class Offerings are required for the selected Semester and Program scope.',
    existing_offerings_load_failed: 'AlterSched could not check the existing Class Offerings.',
    offerings_create_failed: 'The Class Offerings could not be created.',
    ...ASSIGNMENT_MESSAGES.error,
  } as Record<string, string>,
}

/** "3 Class Offerings prepared successfully." */
export function preparedMessage(created: string | undefined) {
  return created
    ? `${created} Class Offering${Number(created) === 1 ? '' : 's'} prepared successfully.`
    : 'Class Offerings prepared successfully.'
}
