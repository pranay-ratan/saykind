/**
 * Saykind's functional layer, in one import. None of this knows about colours, layouts or components.
 * See docs/UI_INTEGRATION.md for how each piece is used.
 */
export { useExercise, subjectOf, type ExerciseController, type Feedback, type FeedbackKind, type Pronunciation } from "./controllers/use-exercise";
export { useDiscovery } from "./controllers/use-discovery";
export { useCafe, useMenuItem, type CafeController, type MenuItemController } from "./controllers/use-cafe";
export { usePhrases, subjectOfPhrase } from "./controllers/use-phrases";
export { useCaregiverContact } from "./controllers/use-caregiver-contact";
export { useCaregiverReport, type CaregiverReport } from "./controllers/use-caregiver-report";
export { usePractice, type Subject, type Outcome } from "./use-practice";
export { OBJECTS, CAFE_WORDS, type LearnItem, type ObjectId } from "./items";
export { PHRASES, phraseAudioKey, type Phrase } from "./phrases";
export { learnItemFromDiscovery, registerRecognizer, recognizeObject, hasRecognizer, type DiscoveryInput, type ObjectRecognizer, type RecognitionResult } from "./discover";
export { useSettings, setCaregiver, setShareCategory, setKeepPracticeAudio, resetSettings, type Settings } from "./settings";
export { relativeTime, mightBenefit, useLog, logEvent, summarise, clearLog, type PracticeEvent, type WordSummary, type Recognition, type Level } from "./log";
export { useSamples, deleteSample, deleteAllSamples, setApproved, saveSample, playSample, type Sample } from "./samples";
export { useSetProgress, clearProgress } from "./progress";
