export const CHILD_DEFAULT_NAME = 'Alex';

export const PARENT = {
  name: 'Jordan Lee',
  first: 'Jordan',
  email: 'jordan@example.com',
  password: 'password',
  phone: '0412 345 678',
} as const;

export const THERAPIST = { name: 'Priya Shah', first: 'Priya', role: 'Psychologist', initials: 'PS' } as const;

/** Link code the parent reads out; the child types it (any case). */
export const LINK_CODE = 'ABC123';
export const LINK_CODE_DISPLAY = 'ABC 123';
