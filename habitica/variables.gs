// ==========================================
// [Users] Do not edit code below this line
// ==========================================
const AUTHOR_ID = '074e86a5-a37e-4f73-8826-461f7514ac70';
const SCRIPT_NAME = 'SuperScript';
const SCRIPT_VERSION = 'v0.1';
const HEADERS = {
  'x-client' : AUTHOR_ID + '-' + SCRIPT_NAME + '-' + SCRIPT_VERSION,
  'x-api-user' : USER_ID,
  'x-api-key' : API_TOKEN,
}
const GOOGLE_APP_SCRIPT_BASE_THIS = this;
const TASK_GROUP_MAX_NUM_TRIES = 30;

const LOCK_PROPERTY_PREFIX = 'Lock_';
const LOG_PROPERTY_PREFIX = 'Log_';
const SAVE_COSTUME_PROPERTY_PREFIX = 'CostumeSave_';
const TASK_GROUP_PROPERTY_PREFIX = 'TaskGroup_';

const MILLIS_IN_HOUR = 1000 * 60 * 60;
const MILLIS_IN_DAY = 1000 * 60 * 60 * 24;
const QUEST_TIMESTAMP_PROPERTY = 'QuestTimestamp';

const DEBUG_DISABLE_TRIGGERS = false;
const DEBUG_LOG_RESPONSE = false;
const DEBUG_MESSAGE_INSTEAD_OF_START_QUEST = false;
const DEBUG_LOG_API_CALLS = false;

const COSTUME_VARIABLES = [
  'items.currentMount',
  'items.currentPet',
  'items.gear.costume.armor',
  'items.gear.costume.back',
  'items.gear.costume.body',
  'items.gear.costume.eyewear',
  'items.gear.costume.head',
  'items.gear.costume.headAccessory',
  'items.gear.costume.shield',
  'items.gear.costume.weapon',
  'preferences.background',
  // 'preferences.chair',  // There is no way to change these preferences.
  // 'preferences.hair.bangs',
  // 'preferences.hair.base',
  // 'preferences.hair.beard',
  // 'preferences.hair.color',
  // 'preferences.hair.flower',
  // 'preferences.hair.mustache',
  // 'preferences.shirt',
  // 'preferences.size',
  // 'preferences.skin',
];

// TODO(mgeorg) Add COSTUME to these variables.
const SAVE_REWARD_REGEX = /^Save appearance "([^"]+)"$/;
const LOAD_REWARD_REGEX = /^Load appearance "([^"]+)"$/;
const LOAD_REWARD_FORMAT = 'Load appearance "{0}"';

const BANK_REWARD_REGEX = /^Deposit in Bank$/;
const BANK_REWARD_STRING = "Deposit in Bank";

const QUEST_INVITE_QUEUE_STRING = SCRIPT_NAME + ': Quest Queue Summary.';

const QUEST_QUEUE_REWARD_REGEX = /^Quest Invite Queue$/;
const QUEST_QUEUE_REWARD_STRING = "Quest Invite Queue";
