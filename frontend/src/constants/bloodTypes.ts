export const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export const URGENCY_LEVELS = [
  { value: 'emergency', label: 'Emergency', color: '#EF4444' },
  { value: 'urgent', label: 'Urgent', color: '#F59E0B' },
  { value: 'normal', label: 'Normal', color: '#10B981' },
];

export const BLOOD_COMPATIBILITY: Record<string, string[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export const getCompatibleDonorTypes = (recipientType: string): string[] => {
  const compatible: string[] = [];
  for (const [donorType, canDonateTo] of Object.entries(BLOOD_COMPATIBILITY)) {
    if (canDonateTo.includes(recipientType)) {
      compatible.push(donorType);
    }
  }
  return compatible;
};
