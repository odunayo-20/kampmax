export { RegistrationCampusSelector } from "./RegistrationCampusSelector";
export { PasswordStrengthMeter, PASSWORD_CRITERIA } from "./PasswordStrengthMeter";
export {
  NigerianPhoneInput,
  detectNigerianCarrier,
  normalizeNigerianPhone,
  formatPhoneDisplay,
  type TelcoCarrier,
} from "./NigerianPhoneInput";
export { CampusSafetyModal } from "./CampusSafetyModal";
export { CampusSafetyAgreement } from "./CampusSafetyAgreement";
export { ResidenceHallSelector } from "./ResidenceHallSelector";
export {
  ReferralCodeInput,
  validateReferralCode,
  type ReferralValidationResult,
} from "./ReferralCodeInput";
export { VerifiedStudentBadgeNotice } from "./VerifiedStudentBadgeNotice";
export {
  AcademicInfoStep,
  NIGERIAN_FACULTIES,
  ACADEMIC_LEVELS,
} from "./AcademicInfoStep";
export {
  PostRegistrationWelcomeModal,
  FEED_INTEREST_OPTIONS,
  AVATAR_PRESETS,
  type FeedInterestOption,
} from "./PostRegistrationWelcomeModal";
export {
  detectCampusFromEmail,
  isInstitutionalEmail,
  type CampusEmailDetectionResult,
} from "@/lib/campus-email";
export {
  detectCampusFromGeolocation,
  calculateHaversineDistanceKm,
  formatCampusDistance,
  findNearestCampus,
  type GeolocationDetectionResult,
  type CampusDistanceResult,
} from "@/lib/campus-geolocation";
