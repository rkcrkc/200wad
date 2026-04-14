/**
 * Centralised text defaults and category definitions for all user-facing strings.
 *
 * Components can override any of these via the admin "Text & Labels" page.
 * Only overridden values are stored in the DB — everything else falls back to
 * the defaults defined here.
 */

// ============================================================================
// Categories — drives the tab bar in the admin UI
// ============================================================================

export interface TextCategory {
  id: string;
  label: string;
  description: string;
  /** platform_config key used for DB storage */
  configKey: string;
}

export const TEXT_CATEGORIES: TextCategory[] = [
  {
    id: "tooltips_popovers",
    label: "Tooltips & Popovers",
    description: "Tooltip labels and popover titles throughout the app.",
    configKey: "text_tooltips_popovers",
  },
  {
    id: "scoring_feedback",
    label: "Scoring & Feedback",
    description: "Answer feedback messages, test type labels and descriptions.",
    configKey: "text_scoring_feedback",
  },
  {
    id: "status_labels",
    label: "Status Labels",
    description: "Word/lesson status pills and league badge names.",
    configKey: "text_status_labels",
  },
  {
    id: "buttons_actions",
    label: "Buttons & Actions",
    description: "Modal CTAs, tab labels, toggle labels, and action buttons.",
    configKey: "text_buttons_actions",
  },
  {
    id: "greetings_messages",
    label: "Greetings & Messages",
    description: "Modal titles, empty states, explainer text and messages.",
    configKey: "text_greetings_messages",
  },
];

// ============================================================================
// Per-key metadata — label, category, and component group
// ============================================================================

export interface TextKeyMeta {
  /** Human-readable label shown in the admin UI */
  label: string;
  /** Category tab this key belongs to */
  category: string;
  /** Component/page group for visual grouping within a tab */
  group: string;
  /** Default value */
  defaultValue: string;
}

/**
 * Every text key with its metadata. This is the single source of truth.
 * Templates use `{var}` placeholders — resolved at runtime by `getTextTemplate`.
 */
export const TEXT_KEYS: Record<string, TextKeyMeta> = {
  // ── Tooltips & Popovers ──────────────────────────────────────────────

  // Study Action Bar
  tip_next_word: {
    label: "Next word tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Next word",
  },
  tip_previous_word: {
    label: "Previous word tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Previous word",
  },
  tip_first_word: {
    label: "First word tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "First word",
  },
  tip_last_word: {
    label: "Last word tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Last word",
  },
  tip_edit_word: {
    label: "Edit word tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Edit word",
  },
  tip_exit_edit: {
    label: "Exit edit mode tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Exit edit mode",
  },
  tip_replay_audio: {
    label: "Replay audio tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Replay audio sequence",
  },
  pop_score_history: {
    label: "Score history popover title",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Score history",
  },
  pop_times_tested: {
    label: "Times tested popover label",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "{count} times tested",
  },

  // Word Detail
  tip_show_flashcard: {
    label: "Show flashcard image tooltip",
    category: "tooltips_popovers",
    group: "Word Detail",
    defaultValue: "Show flashcard image",
  },
  tip_show_memory_trigger: {
    label: "Show memory trigger tooltip",
    category: "tooltips_popovers",
    group: "Word Detail",
    defaultValue: "Show memory trigger",
  },
  pop_score_breakdown: {
    label: "Score breakdown popover line",
    category: "tooltips_popovers",
    group: "Word Detail",
    defaultValue: "{pts} pts / {total} available = {pct}%",
  },

  // Word Detail Sidebar
  tip_sidebar_size: {
    label: "Sidebar size tooltip",
    category: "tooltips_popovers",
    group: "Word Detail Sidebar",
    defaultValue: "Sidebar size: {size}",
  },
  tip_close: {
    label: "Close tooltip",
    category: "tooltips_popovers",
    group: "Word Detail Sidebar",
    defaultValue: "Close",
  },

  // Study Action Bar
  tip_accents: {
    label: "Accents tooltip",
    category: "tooltips_popovers",
    group: "Study Action Bar",
    defaultValue: "Accents",
  },

  // Stats Popovers
  pop_words_mastered: {
    label: "Words mastered popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Words mastered",
  },
  pop_time_breakdown: {
    label: "Time breakdown popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Time breakdown",
  },
  pop_study_time: {
    label: "Study time popover label",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Study time:",
  },
  pop_test_time: {
    label: "Test time popover label",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Test time:",
  },
  pop_words_studied: {
    label: "Words studied popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Words studied",
  },
  pop_lessons_studied: {
    label: "Lessons studied popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Lessons studied",
  },
  pop_lessons_mastered: {
    label: "Lessons mastered popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Lessons mastered",
  },
  pop_course_completion: {
    label: "Course completion popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Course completion",
  },
  pop_words_per_day_rate: {
    label: "Words per day rate popover title",
    category: "tooltips_popovers",
    group: "Stats Popovers",
    defaultValue: "Words per day rate",
  },

  // Lesson Page
  tip_show_words: {
    label: "Show words tooltip",
    category: "tooltips_popovers",
    group: "Lesson Page",
    defaultValue: "Show words",
  },
  tip_show_test_history: {
    label: "Show test history tooltip",
    category: "tooltips_popovers",
    group: "Lesson Page",
    defaultValue: "Show test history",
  },

  // Progress Page
  tip_heatmap_day: {
    label: "Heatmap day tooltip",
    category: "tooltips_popovers",
    group: "Progress Page",
    defaultValue: "{count} words mastered on {date}",
  },

  // Page Layout
  tip_expand_width: {
    label: "Expand page width tooltip",
    category: "tooltips_popovers",
    group: "Page Layout",
    defaultValue: "Expand",
  },
  tip_shrink_width: {
    label: "Shrink page width tooltip",
    category: "tooltips_popovers",
    group: "Page Layout",
    defaultValue: "Shrink",
  },

  // Schedule
  tip_preview_lesson: {
    label: "Preview lesson tooltip",
    category: "tooltips_popovers",
    group: "Schedule",
    defaultValue: "Preview lesson",
  },

  // Lessons List
  tip_show_progress_view: {
    label: "Show progress view tooltip",
    category: "tooltips_popovers",
    group: "Lessons List",
    defaultValue: "Show progress view",
  },
  tip_show_test_scores: {
    label: "Show test scores tooltip",
    category: "tooltips_popovers",
    group: "Lessons List",
    defaultValue: "Show test scores",
  },

  // Help Page
  tip_expand_all: {
    label: "Expand all tooltip",
    category: "tooltips_popovers",
    group: "Help Page",
    defaultValue: "Expand all",
  },
  tip_collapse_all: {
    label: "Collapse all tooltip",
    category: "tooltips_popovers",
    group: "Help Page",
    defaultValue: "Collapse all",
  },

  // ── Scoring & Feedback ───────────────────────────────────────────────

  // Study Mode Feedback
  feedback_correct: {
    label: "Correct answer (study)",
    category: "scoring_feedback",
    group: "Study Mode",
    defaultValue: "Correct!",
  },
  feedback_half_correct: {
    label: "Half-correct answer (study)",
    category: "scoring_feedback",
    group: "Study Mode",
    defaultValue: "Half-correct!",
  },
  feedback_half_correct_gender: {
    label: "Half-correct missing gender (study)",
    category: "scoring_feedback",
    group: "Study Mode",
    defaultValue: "Half-correct! Don't forget the gender",
  },
  feedback_incorrect: {
    label: "Incorrect answer (study)",
    category: "scoring_feedback",
    group: "Study Mode",
    defaultValue: "Incorrect!",
  },

  // Test Mode Feedback
  feedback_correct_points: {
    label: "Correct answer with points",
    category: "scoring_feedback",
    group: "Test Mode",
    defaultValue: "Correct! {points}",
  },
  feedback_half_correct_points: {
    label: "Half-correct with points",
    category: "scoring_feedback",
    group: "Test Mode",
    defaultValue: "Half correct! {points}",
  },
  feedback_half_correct_gender_points: {
    label: "Half-correct missing gender with points",
    category: "scoring_feedback",
    group: "Test Mode",
    defaultValue: "Half correct! Don't forget the gender. {points}",
  },
  feedback_incorrect_points: {
    label: "Incorrect answer with points",
    category: "scoring_feedback",
    group: "Test Mode",
    defaultValue: "Incorrect! 0 points",
  },

  // Test Types
  test_type_foreign: {
    label: "Test Foreign label",
    category: "scoring_feedback",
    group: "Test Type Picker",
    defaultValue: "Test Foreign",
  },
  test_type_english: {
    label: "Test English label",
    category: "scoring_feedback",
    group: "Test Type Picker",
    defaultValue: "Test English",
  },
  test_type_picture: {
    label: "Test Picture label",
    category: "scoring_feedback",
    group: "Test Type Picker",
    defaultValue: "Test Picture",
  },
  test_desc_foreign: {
    label: "Test Foreign description",
    category: "scoring_feedback",
    group: "Test Type Picker",
    defaultValue: "See the English word, type the Foreign word",
  },
  test_desc_english: {
    label: "Test English description",
    category: "scoring_feedback",
    group: "Test Type Picker",
    defaultValue: "See the Foreign word, type the English word",
  },
  test_desc_picture: {
    label: "Test Picture description",
    category: "scoring_feedback",
    group: "Test Type Picker",
    defaultValue: "See the picture only, type the Foreign word",
  },

  // ── Status Labels ────────────────────────────────────────────────────

  // Word/Lesson Status
  status_mastered: {
    label: "Mastered status",
    category: "status_labels",
    group: "Status Pills",
    defaultValue: "Mastered",
  },
  status_learning: {
    label: "Learning status",
    category: "status_labels",
    group: "Status Pills",
    defaultValue: "Learning",
  },
  status_not_started: {
    label: "Not started status",
    category: "status_labels",
    group: "Status Pills",
    defaultValue: "Not started",
  },
  status_locked: {
    label: "Locked status",
    category: "status_labels",
    group: "Status Pills",
    defaultValue: "Locked",
  },

  // League Badges
  league_bronze: {
    label: "Bronze league name",
    category: "status_labels",
    group: "League Badges",
    defaultValue: "Bronze",
  },
  league_silver: {
    label: "Silver league name",
    category: "status_labels",
    group: "League Badges",
    defaultValue: "Silver",
  },
  league_gold: {
    label: "Gold league name",
    category: "status_labels",
    group: "League Badges",
    defaultValue: "Gold",
  },
  league_diamond: {
    label: "Diamond league name",
    category: "status_labels",
    group: "League Badges",
    defaultValue: "Diamond",
  },

  // ── Buttons & Actions ────────────────────────────────────────────────

  // Study Mode
  btn_next_word: {
    label: "Next word button",
    category: "buttons_actions",
    group: "Study Mode",
    defaultValue: "Next word",
  },
  btn_finish_lesson: {
    label: "Finish lesson button",
    category: "buttons_actions",
    group: "Study Mode",
    defaultValue: "Finish lesson",
  },
  btn_submit: {
    label: "Submit button",
    category: "buttons_actions",
    group: "Study Mode",
    defaultValue: "Submit",
  },
  btn_try_again: {
    label: "Try again button",
    category: "buttons_actions",
    group: "Study Mode",
    defaultValue: "Try again",
  },

  // Test Mode
  btn_finish_test: {
    label: "Finish test button",
    category: "buttons_actions",
    group: "Test Mode",
    defaultValue: "Finish test",
  },

  // Lesson Completed Modal
  btn_start_test: {
    label: "Start Test button",
    category: "buttons_actions",
    group: "Lesson Completed Modal",
    defaultValue: "Start Test",
  },
  btn_not_now: {
    label: "Not now button",
    category: "buttons_actions",
    group: "Lesson Completed Modal",
    defaultValue: "Not now",
  },
  toggle_hide_italian: {
    label: "Hide Italian toggle",
    category: "buttons_actions",
    group: "Lesson Completed Modal",
    defaultValue: "Hide Italian",
  },
  toggle_show_italian: {
    label: "Show Italian toggle",
    category: "buttons_actions",
    group: "Lesson Completed Modal",
    defaultValue: "Show Italian",
  },

  // Completion Modals (shared)
  toggle_switch_flashcards: {
    label: "Switch to flashcards toggle",
    category: "buttons_actions",
    group: "Completion Modals",
    defaultValue: "Switch to flashcards",
  },
  toggle_switch_memory: {
    label: "Switch to memory triggers toggle",
    category: "buttons_actions",
    group: "Completion Modals",
    defaultValue: "Switch to memory triggers",
  },
  toggle_switch_4_cols: {
    label: "Switch to 4 columns toggle",
    category: "buttons_actions",
    group: "Completion Modals",
    defaultValue: "Switch to 4 columns",
  },
  toggle_switch_5_cols: {
    label: "Switch to 5 columns toggle",
    category: "buttons_actions",
    group: "Completion Modals",
    defaultValue: "Switch to 5 columns",
  },

  // Test Completed Modal
  btn_retest_all: {
    label: "Retest all words button",
    category: "buttons_actions",
    group: "Test Completed Modal",
    defaultValue: "Retest all words",
  },
  btn_retest_incorrect: {
    label: "Retest incorrect words button",
    category: "buttons_actions",
    group: "Test Completed Modal",
    defaultValue: "Retest incorrect words",
  },
  btn_study_incorrect: {
    label: "Study incorrect words button",
    category: "buttons_actions",
    group: "Test Completed Modal",
    defaultValue: "Study incorrect words",
  },
  btn_done: {
    label: "Done button",
    category: "buttons_actions",
    group: "Test Completed Modal",
    defaultValue: "Done",
  },
  tab_incorrect_words: {
    label: "Incorrect words tab",
    category: "buttons_actions",
    group: "Test Completed Modal",
    defaultValue: "Incorrect words",
  },
  tab_all_words: {
    label: "All words tab",
    category: "buttons_actions",
    group: "Test Completed Modal",
    defaultValue: "All words",
  },

  // Start Test Modal
  btn_test_twice: {
    label: "Test twice toggle",
    category: "buttons_actions",
    group: "Start Test Modal",
    defaultValue: "Test twice",
  },

  // Study Action Bar Labels
  label_study_music: {
    label: "Study Music heading",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Study Music",
  },
  label_music_volume: {
    label: "Music volume label",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Music volume",
  },
  label_word_volume: {
    label: "Word volume label",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Word volume",
  },
  label_strict_study_mode: {
    label: "Strict study mode label",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Strict study mode",
  },
  label_test_settings: {
    label: "Test Settings heading",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Test Settings",
  },
  label_lesson_settings: {
    label: "Lesson Settings heading",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Lesson Settings",
  },
  label_enabled: {
    label: "Enabled label",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Enabled",
  },
  label_disabled: {
    label: "Disabled label",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Disabled",
  },
  label_accented_chars: {
    label: "Accented characters heading",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Accented characters",
  },
  label_background_music: {
    label: "Background music button title",
    category: "buttons_actions",
    group: "Study Action Bar",
    defaultValue: "Background music",
  },

  // ── Greetings & Messages ─────────────────────────────────────────────

  // Lesson Completed Modal
  modal_lesson_completed: {
    label: "Lesson completed title",
    category: "greetings_messages",
    group: "Lesson Completed Modal",
    defaultValue: "Lesson completed!",
  },
  msg_new_words: {
    label: "New words count",
    category: "greetings_messages",
    group: "Lesson Completed Modal",
    defaultValue: "{count} new",
  },

  // Test Completed Modal
  modal_test_completed: {
    label: "Test completed title",
    category: "greetings_messages",
    group: "Test Completed Modal",
    defaultValue: "Test completed!",
  },
  msg_words_mastered: {
    label: "Words mastered count",
    category: "greetings_messages",
    group: "Test Completed Modal",
    defaultValue: "{count} words mastered",
  },

  // Start Test Modal
  msg_test_twice_desc: {
    label: "Test twice description",
    category: "greetings_messages",
    group: "Start Test Modal",
    defaultValue: "Test each word twice for extra practice",
  },
  msg_no_picture_words: {
    label: "No picture words message",
    category: "greetings_messages",
    group: "Start Test Modal",
    defaultValue: "No words with images in this lesson",
  },

  // Study Action Bar
  msg_nerves_of_steel: {
    label: "Nerves of steel mode label",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Nerves of steel mode",
  },
  msg_nerves_of_steel_desc: {
    label: "Nerves of steel description",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Punctuation and capitalization must be correct for full points",
  },
  msg_breathing_mode: {
    label: "Breathing mode label",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Breathing mode",
  },
  msg_reveal_clue: {
    label: "Reveal clue button label",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Reveal clue ({remaining} remaining)",
  },
  msg_no_clues: {
    label: "No clues remaining label",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "0 clues remaining",
  },
  msg_type_correct_first: {
    label: "Type correct answer validation",
    category: "greetings_messages",
    group: "Study Mode",
    defaultValue: "Type the correct answer first",
  },

  // Study Action Bar Messages
  msg_alpha_wave_title: {
    label: "Alpha wave music title",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Alpha wave music",
  },
  msg_alpha_wave_desc: {
    label: "Alpha wave music description",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "is tuned to frequencies (around 432-528 Hz) that help induce alpha brainwaves — the optimal state for learning, focus, and memory retention.",
  },
  msg_music_error: {
    label: "Music error message",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Unable to play music. The audio file may not be available yet. Please try again later.",
  },
  msg_strict_study_desc: {
    label: "Strict study mode description",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Requires typing the correct answer before moving to the next word",
  },
  msg_breathing_mode_desc: {
    label: "Breathing mode description",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Guides your breathing rhythm during word reveals for deeper focus",
  },
  msg_set_before_test: {
    label: "Set before test message",
    category: "greetings_messages",
    group: "Study Action Bar",
    defaultValue: "Set before starting test",
  },
};

// ============================================================================
// Derived lookups (built once from TEXT_KEYS)
// ============================================================================

/** Flat map of key → default value (used at runtime). */
export const TEXT_DEFAULTS: Record<string, string> = {};
for (const [key, meta] of Object.entries(TEXT_KEYS)) {
  TEXT_DEFAULTS[key] = meta.defaultValue;
}

// ============================================================================
// Runtime helpers
// ============================================================================

export interface TextKeyGroup {
  group: string;
  keys: string[];
}

/**
 * Returns the keys belonging to a given category, grouped by component/page.
 * Groups are returned in the order they first appear in TEXT_KEYS.
 */
export function getGroupedKeysForCategory(categoryId: string): TextKeyGroup[] {
  const groups: TextKeyGroup[] = [];
  const groupMap = new Map<string, string[]>();

  for (const [key, meta] of Object.entries(TEXT_KEYS)) {
    if (meta.category !== categoryId) continue;
    let arr = groupMap.get(meta.group);
    if (!arr) {
      arr = [];
      groupMap.set(meta.group, arr);
      groups.push({ group: meta.group, keys: arr });
    }
    arr.push(key);
  }

  return groups;
}

/**
 * Returns all keys belonging to a given category (flat, ungrouped).
 */
export function getKeysForCategory(categoryId: string): string[] {
  return Object.entries(TEXT_KEYS)
    .filter(([, meta]) => meta.category === categoryId)
    .map(([key]) => key);
}

/**
 * Look up a plain text value.
 * Checks overrides first, then falls back to TEXT_DEFAULTS.
 */
export function getText(
  key: string,
  overrides: Record<string, string>
): string {
  return overrides[key] ?? TEXT_DEFAULTS[key] ?? key;
}

/**
 * Look up a template string and interpolate `{var}` placeholders.
 */
export function getTextTemplate(
  key: string,
  vars: Record<string, string | number>,
  overrides: Record<string, string>
): string {
  let text = getText(key, overrides);
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, String(v));
  }
  return text;
}
