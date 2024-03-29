// ==========================================
// [Users] Configuration                     
// ==========================================
const LOG_ON_FAILURE = true;
const MESSAGE_ON_FAILURE = false;

// QuestAutoAccept:
const ENABLE_QUEST_AUTO_ACCEPT = false;

// QuestAutoStart:
const ENABLE_QUEST_AUTO_START = false;
// Only start your own quests.  If you're a party
// leader, then you can start all quests (and can set it to false).
const START_ONLY_MY_QUESTS = true;
// The number of days of inactivity in the app
// until a party member is considered inactive
// and they are ignored for purposes of starting quests.
// If all active members joined the quest, then it will be started.
// Fractional values are allowed.
const NUM_DAYS_UNTIL_INACTIVE = 3.0;
// Number of hours to wait before force starting
// the quest.  Even if inactive members haven't joined,
// the quest will still be started after this many hours.
// Fractional values are allowed.
const NUM_HOURS_UNTIL_FORCE_START = 24.0;

// QuestAutoInvite:
const ENABLE_QUEST_AUTO_INVITE = false;
// Quest list.
// TODO Move this outside of the script somewhere.
const questQueue = [
  'fluorite',
  'stone',
  'blackPearl',
  'bronze',
  'ruby',
  'amber',
  'onyx',
  'silver',
  'turquoise',
];
// TODO Add in an after user field outside of script.

// SpellSpammer:
const ENABLE_SKILL_MULTI_CAST = false;
// TODO Enable setting of different tasks.
const SKILL_MULTI_CAST_STRING = 'Smash Rage';
// When to send messages pertaining to multi-cast.
const MULTI_CAST_SEND_MESSAGE_ON_DEFER = true;
const MULTI_CAST_SEND_MESSAGE_ON_CAST_SUCCESS = true;
const MULTI_CAST_SEND_MESSAGE_ON_CAST_FAILURE = true;
// TODO allow choosing of target task (outside of script).

// TODO add auto cast at certain times.

// TODO Add a version update available check.

// Bank:
//   The bank creates a reward which deposits money in the bank.
// Be careful not to press the reward button too quickly, it takes a
// little time to update.
// WARNING: Currently, the only way to get money out of the bank is to
// subtract it manually from the reward task and then use "fix character
// values" to add the gold to your account.
// There is currently no API to modify the hero's GP amount.
// Negative values are allowed (so you can take out loans).
const ENABLE_BANK = false;
