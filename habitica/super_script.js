// A Habitica User Script which does a bunch of different things.
// 
// QuestAutoStart:
//   Start quests automatically when certain conditions are met.
//   Either all active memebers of the party joined the quest
//   or a certain number of hours elapsed since the quest was
//   created.
// 
// QuestAutoInvite:
//   TODO description.
//
// SkillMultiCast:
//   TODO description.
//
// Bank:
//   TODO description.
//
// CostumeChange:
//   TODO description.

// ==========================================
// [Users] Required script data to fill in
// ==========================================
const USER_ID = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
// This is a password, don't share it with anyone.
const API_TOKEN = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
// This needs to be a publicly accessible URL for this script.  To get
// it, click on deploy, click on the gear (settings) icon, click on
// web app, click on permissions and select (anyone), click on deploy.
// Authorize the Web App for your account.  Copy the Web App URL into
// the field below where it says replace_me (make sure to keep single
// quotes around the url).
//
// You'll have to authorize the script to act with your account (yes, this
// should feel scary), there are two permissions the script needs, to run
// whon you're not present.  (so it can respond to requests from Habitica
// through the webhooks interface, and run time delayed triggers to wait
// for things to happen), and to contact external websites.  You can check
// that the only website this script contacts is habitica by searching
// the script for UrlFetchApp and noticing that only habiticaApi calls
// that function and it prepends habitica's API url to every request.
const WEB_APP_URL = 'replace_me';

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
  'robot',
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
// TODO allow choosing of target task (outside of script).

// TODO add auto cast at certain times.

// ==========================================
// [Users] Do not edit code below this line
// ==========================================
const AUTHOR_ID = '074e86a5-a37e-4f73-8826-461f7514ac70';
const SCRIPT_NAME = 'SuperScript';
const HEADERS = {
  'x-client' : AUTHOR_ID + '-' + SCRIPT_NAME,
  'x-api-user' : USER_ID,
  'x-api-key' : API_TOKEN,
}
const GOOGLE_APP_SCRIPT_BASE_THIS = this;
const TASK_GROUP_MAX_NUM_TRIES = 30;

const LOCK_PROPERTY_PREFIX = 'Lock_';
const LOG_PROPERTY_PREFIX = 'Log_';
const SAVE_COSTUME_PROPERTY_PREFIX = 'CostumeSave_';
const TASK_GROUP_PROPERTY_PREFIX = 'TaskGroup_';

const DEBUG_DISABLE_TRIGGERS = false;
const DEBUG_LOG_REQUESTS = false;
const DEBUG_MESSAGE_INSTEAD_OF_START_QUEST = false;

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

const SAVE_REWARD_REGEX = /^Save appearance "([^"]+)"$/;
const LOAD_REWARD_REGEX = /^Load appearance "([^"]+)"$/;
const LOAD_REWARD_FORMAT = 'Load appearance "{0}"';

function doSetup() {
  deleteAllTriggers();
  deleteAllPropertiesWithPrefix(TASK_GROUP_PROPERTY_PREFIX);
  deleteAllPropertiesWithPrefix(LOCK_PROPERTY_PREFIX);

  createWebhooks(true);
  if (ENABLE_QUEST_AUTO_START) {
    ScriptApp.newTrigger(
        'checkStartQuest').timeBased().everyMinutes(15).create();
  }
  if (ENABLE_QUEST_AUTO_ACCEPT) {
    // Use a trigger to accept quests where we were not notified with
    // an invitation (shouldn't really happen).
    ScriptApp.newTrigger(
        'runAcceptQuestTaskGroup').timeBased().everyHours(1).create();
  }
  resetQuestIndex();
}

function resetQuestIndex() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('questIndex');
}

function inviteNextQuest() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let questIndex = scriptProperties.getProperty('questIndex');
  if (questIndex == null) {
    questIndex = 0;
  } else {
    questIndex = Number(questIndex);
  }
  let quest = questQueue[questIndex];
  if (quest != undefined) {
    runInviteQuestTaskGroup(quest);
  }
}

function deleteDeferCastQueue() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('deferSpamCast');
  deleteFunctionTriggers('tryDeferredSpamCast');
}

// Generic Utility Functions.
function isFalse(elem) {
  // Provides a python like truth value where
  // empty objects and lists are false.
  if (elem instanceof Object) {
    return Object.keys(elem).length == 0;
  } else {
    return !Boolean(elem);
  }
}

function isTrue(elem) {
  return !isFalse(elem);
}

// TaskGroup Utilities.
class PauseTaskGroupException extends Error {
  constructor(pauseNumMSec) {
    super('pausing execution of task group for ' + pauseNumMSec + 'ms.');
    this.name = 'PauseTaskGroupException';
  // The actual delay is on a granularity of about 1 minute, so
  // don't rely on fast resuming.  But the task group will
  // be paused for at least this amount of time.
    this.pauseNumMSec = pauseNumMSec;
  }
}

// Hack to get restartQueue to work with different task groups.
function restartQueue_taskGroup1() {
  return restartQueue('taskGroup1');
}

function restartQueue_acceptQuestTaskGroup() {
  return restartQueue('acceptQuestTaskGroup');
}

function restartQueue_inviteQuestTaskGroup() {
  return restartQueue('inviteQuestTaskGroup');
}

// TODO remove references to "spam".
function restartQueue_spamCastTaskGroup() {
  return restartQueue('spamCastTaskGroup');
}

function restartQueue_privateMessageTaskGroup() {
  return restartQueue('privateMessageTaskGroup');
}

function restartQueue_createWebhookTaskGroup() {
  return restartQueue('createWebhookTaskGroup');
}

function restartQueue_messagesTaskGroup() {
  return restartQueue('messagesTaskGroup');
}

function restartQueue_saveCostumeTaskGroup() {
  return restartQueue('saveCostumeTaskGroup');
}

// The TaskGroup class.
class TaskGroup {
  constructor(queueKey, clear) {
    this.queueKey = queueKey;
    this.queue = {};
    this.queue.retry = 0;
    this.queue.state = {};

    if (!(this.triggerFunctionName() in GOOGLE_APP_SCRIPT_BASE_THIS)) {
      throw new Error(
        'to create a TaskGroup with key ' +
        this.queueKey +
        ' there must be a function which can restart it named "' +
        this.triggerFunctionName() + '".');
    }
    let scriptProperties = PropertiesService.getScriptProperties();
    if (isTrue(clear)) {
      scriptProperties.deleteProperty(
          TASK_GROUP_PROPERTY_PREFIX + this.queueKey);
    } else {
      let queueAsString = scriptProperties.getProperty(
          TASK_GROUP_PROPERTY_PREFIX + this.queueKey);
      if (isTrue(queueAsString)) {
        this.queue = JSON.parse(queueAsString);
      }
    }
  }

  saveQueue() {
    let scriptProperties = PropertiesService.getScriptProperties();
    if (isTrue(this.queue)) {
      scriptProperties.setProperty(
        TASK_GROUP_PROPERTY_PREFIX + this.queueKey,
        JSON.stringify(this.queue));
    } else {
      scriptProperties.deleteProperty(
          TASK_GROUP_PROPERTY_PREFIX + this.queueKey);
    }
  }

  addTask(task) {
    // A task is an object with the following properties defined.
    //
    // task.func = The string name of the function to call.  This function
    // must take two arguments, the first will be the args object,
    // the second the persistent state object.  Any modifications to
    // these two arguments are presistent across reruns, only objects
    // that can be serialized/deserialized by JSON.parse/JSON.stringify
    // are allowed.  The state object will have a field "retry" set to
    // the number of previous runs of the function that have occured.
    // If an exception of type PauseTaskGroupException is thrown then the
    // queue will be paused and restarted no sooner than the microseconds
    // argument given to PauseTaskGroupException (this uses the Google
    // Script Trigger mechanism, which has about a minute granularity).
    // If any other exception is thrown then the onError task will be
    // executued and the task group ended.
    //
    // task.args = An object which will be provided to func as its
    // first argument.
    if (task.args == undefined) {
      task.args = {};
    }
    if (isFalse(this.queue.tasks)) {
      this.queue.tasks = [task];
    } else {
      this.queue.tasks.push(task);
    }
  }

  setState(state) {
    this.queue.state = state;
  }

  setOnError(task) {
    // The third argument to the task will be the error that was thrown.
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onError = task;
  }

  setOnFinally(task) {
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onFinally = task;
  }

  setOnPause(task) {
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onPause = task;
  }

  setOnResume(task) {
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onResume = task;
  }

  triggerFunctionName() {
    return 'restartQueue_' + this.queueKey;
  }

  runTask(task, optionalError) {
    Logger.log('Running ' + JSON.stringify(task));
    if (this.queue.state == undefined) {
      this.queue.state = {};
    }
    if (task.args == undefined) {
      task.args = {};
    }
    this.queue.state.retry = this.queue.retry;
    if (isFalse(task.func) ||
        isFalse(task.func in GOOGLE_APP_SCRIPT_BASE_THIS)) {
      throw new TypeError('Unable to find task function: "' + task.func + '"');
    }
    if (optionalError instanceof Error) {
      GOOGLE_APP_SCRIPT_BASE_THIS[task.func](
          task.args, this.queue.state, optionalError);
    } else {
      GOOGLE_APP_SCRIPT_BASE_THIS[task.func](
          task.args, this.queue.state);
    }
  }

  resumeRun() {
    this.queue.paused = false;
    // TODO Handle errors thrown in onResume and onPause using onError.
    if (isTrue(this.queue.onResume)) {
      this.runTask(this.queue.onResume);
    }
    return this.run();
  }

  run() {
    if (isTrue(this.queue.paused)) {
      Logger.log('Not running queue, since a trigger is active on it.');
      return null;
    }
    Logger.log('running queue: ' + JSON.stringify(this.queue));
    if (this.queue.retry == undefined) {
      this.queue.retry = 0;
    }
    let errorOnError = null;
    let errorOnPause = null;
    while (isTrue(this.queue.tasks)) {
      let currentTask = this.queue.tasks.shift();
      try {
        this.runTask(currentTask);
        this.queue.retry = 0;
      } catch (e) {
        if (e instanceof PauseTaskGroupException) {
          this.queue.retry += 1;
          if (this.queue.retry < TASK_GROUP_MAX_NUM_TRIES) {
            this.queue.tasks.unshift(currentTask);
            this.queue.paused = true;
            if (isTrue(this.queue.onPause)) {
              try {
                this.runTask(this.queue.onPause);
              } catch(err) {
                errorOnPause = err;
              }
            }
            this.saveQueue();
            Logger.log('pausing for ' + e.pauseNumMSec +
                       'ms by creating newTrigger ' +
                       this.triggerFunctionName());
            if (isTrue(DEBUG_DISABLE_TRIGGERS)) {
              Logger.log(
                  'DEBUG_DISABLE_TRIGGERS is true!  Restart queue manually!');
            } else {
              ScriptApp.newTrigger(this.triggerFunctionName()
                  ).timeBased().after(e.pauseNumMSec).create();
            }
            if (errorOnPause instanceof Error) {
              throw errorOnPause;
            }
            return null;
          } else {
            e = new Error(
                'Maximum number of tries (' + TASK_GROUP_MAX_NUM_TRIES +
                ') reached.');
            // Fall down to calling onError.
          }
        }
        if (isTrue(this.queue.onError)) {
          try {
            this.runTask(this.queue.onError, e);
          } catch (err) {
            errorOnError = err;
          }
        } else {
          errorOnError = e;
        }
        // Clear the remaining queue.
        this.queue.tasks = {};
      }
    }
    if (isTrue(this.queue.onFinally)) {
      this.runTask(this.queue.onFinally);
    }
    let output = this.queue.state;
    this.queue = {};
    this.saveQueue();
    if (errorOnError instanceof Error) {
      throw errorOnError;
    }
    return output;
  }
}

function restartQueue(queueKey) {
  let group = new TaskGroup(queueKey, false);
  return group.resumeRun();
}

function spamMessages() {
  for (let i = 0; i < 40; ++i) {
    privateMessage(SCRIPT_NAME + ': message ' + (i+1), USER_ID);
  }
}

function testSpamCastTaskGroup() {
  runSpamCastTaskGroup(2, false);
}

function logAllProperties() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let props = scriptProperties.getProperties();
  for (let key in props) {
    Logger.log(key + ' ' + JSON.stringify(props[key]));
  }
}

// Task Groups which do useful things in Habitica.
function runSpamCastTaskGroup(numCast, runningDeferred) {
  let group = new TaskGroup('spamCastTaskGroup', true);
  group.addTask({
    'func': 'fetchPartyToStateTask',
    'args': {},
  });
  //group.addTask({
  //  'func': 'exploreStateTask',
  //  'args': {'explore': 'fetched.party'},
  //});
  // TODO allow different skills and targets (and auto-acquire target).
  group.addTask({
    'func': 'spamCastOrDeferTask',
    'args': {
      'skillId': 'smash',  // fireball
      'targetId': '40ae2ea3-e737-4354-ad07-6670072bf98a', // Morning Pills
      'numCast': numCast,
      'deferAtFront': isTrue(runningDeferred),
    },
  });
  group.queue.state.sendDeferMessage = isFalse(runningDeferred);
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': ''}
  });
  return group.run();
}

function spamCastOrDeferTask(args, state) {
  let quest = state.fetched.party.quest;
  if (quest.active) {
    spamCastTask(args, state);
  } else {
    let scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('deferOccurred', 'true');
    let deferString = scriptProperties.getProperty('deferSpamCast');
    let defer = {'skillId': args.skillId, 'targetId': args.targetId, 'numCast': args.numCast};
    let deferList = [];
    if (isTrue(deferString)) {
      deferList = JSON.parse(deferString);
    }
    if (isTrue(args.deferAtFront)) {
      deferList.unshift(defer);
    } else {
      deferList.push(defer);
    }
    scriptProperties.setProperty('deferSpamCast', JSON.stringify(deferList));
    logToProperty('spamCast', 'creating trigger for tryDeferredSpamCast');
    deleteFunctionTriggers('tryDeferredSpamCast');
    ScriptApp.newTrigger('tryDeferredSpamCast'
        ).timeBased().after(1000 * 60 * 15).create();
    if (isTrue(state.sendDeferMessage)) {
      privateMessage(
        SCRIPT_NAME + ': Deferring casting of spell ' + args.skillId + ' ' +
        args.numCast + ' times until quest is started.',
        USER_ID,
        state);
    }
  }
}

function spamCastTask(args, state) {
  let startFrom = 0;
  if (state.startFrom != null) {
    startFrom = state.startFrom;
  }
  let i = null;
  for (i = startFrom; i < args.numCast; ++i) {
    const api = 'user/class/cast/' +
        args.skillId + '?targetId=' + args.targetId;
    const params = {
      'method' : 'post',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
    }
    const response = habiticaApi(api, params);
    checkResponseRateLimit(response, state);
    Logger.log(JSON.stringify(response));
    if (response.code == 400) {
      privateMessage(
        SCRIPT_NAME + ': Out of Mana!  Cannot continue casting.  Cast ' +
        args.skillId + ' ' + i + ' of ' + args.numCast +
        ' times.', USER_ID, state);
      break;
    }
    if (!response.success) {
      throw new Error('Unable to cast spell: ' + response.error);
    }
    state.startFrom = i + 1;
  }
  if (i == args.numCast) {
    privateMessage(
        SCRIPT_NAME + ': Cast ' + args.skillId + ' ' +
        args.numCast + ' times.', USER_ID, state);
  }
}

function tryDeferredSpamCast() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let deferString = scriptProperties.getProperty('deferSpamCast');
  if (isFalse(deferString)) {
    Logger.log('Nothing deferred to cast');
    return;
  }
  let deferList = JSON.parse(deferString);
  if (isFalse(deferList)) {
    return;
  }
  let finishedRun = true;
  while(finishedRun && isTrue(deferList)) {
    let defer = deferList.shift();
    if (isTrue(deferList)) {
      scriptProperties.setProperty('deferSpamCast', JSON.stringify(deferList));
    } else {
      scriptProperties.deleteProperty('deferSpamCast');
    }
    scriptProperties.deleteProperty('deferOccurred');
    // TODO(mgeorg) use skillId and targetId.
    runSpamCastTaskGroup(defer.numCast, true);
    let deferOccurred = scriptProperties.getProperty('deferOccurred');
    finishedRun = isFalse(deferOccurred);
  }
  scriptProperties.deleteProperty('deferOccurred');
}

function deleteAllPropertiesWithPrefix(prefix) {
  let scriptProperties = PropertiesService.getScriptProperties();
  let properties = scriptProperties.getProperties();
  for (let key in properties) {
    if (key.startsWith(prefix)) {
      scriptProperties.deleteProperty(key);
    }
  }
}

// Test task group code.
function createTaskGroup1() {
  let group = new TaskGroup('taskGroup1', true);
  group.addTask({
    'func': 'taskA',
    'args': {'a': 2},
    });
  group.addTask({
    'func': 'taskC',
    'args': {'a': 10, 'succeedOnThisTry': 2},
    });
  group.addTask({
    'func': 'taskA',
    'args': {'a': 3},
    });
  group.setState({'b': 100});
  group.setOnError({'func': 'logErrorTask', 'args': {'message': 'hello'}})
  group.setOnFinally({'func': 'logFinallyTask', 'args': {'blah': 1}})
  return group.run();
}

function taskA(args, state) {
  Logger.log('taskA(' + JSON.stringify(args) + ', ' +
             JSON.stringify(state) + ');');

  let multiplier = 1;
  if(isTrue(state.b)) {
    multiplier = state.b;
  }
  Logger.log('args.a: ' + JSON.stringify(args.a));
  Logger.log('state.b: ' + JSON.stringify(state.b));
  let output = args.a * multiplier;
  Logger.log('output: ' + JSON.stringify(output));
  state.b = output;
}

function taskB(args, state) {
  Logger.log('taskB(' + JSON.stringify(args) + ', ' +
             JSON.stringify(state) + ');');
  throw new Error('taskB error!');
}

function taskC(args, state) {
  Logger.log('taskC(' + JSON.stringify(args) + ', ' +
             JSON.stringify(state) + ');');
  state.addedItem = state.retry;
  if (state.retry + 1 >= args.succeedOnThisTry) {
    state.finished = true;
    return;
  }
  throw new PauseTaskGroupException(100);
}

function logErrorTask(args, state, error) {
  Logger.log(
    'logErrorTask(' +
    JSON.stringify(args) + ', ' +
    JSON.stringify(state) + ', ' +
    error.constructor.name + ' with message ' +
    JSON.stringify(error.message) + ');');
}

function throwErrorTask(args, state, error) {
  Logger.log(
    'throwErrorTask(' +
    JSON.stringify(args) + ', ' +
    JSON.stringify(state) + ', ' +
    error.constructor.name + ' with message ' +
    JSON.stringify(error.message) + ');');
  throw error;
}

function reportErrorTask(args, state, error) {
  let prefix = '';
  if (isTrue(args.error_message)) {
    prefix = args.error_message;
  }
  reportError(prefix + JSON.stringify(error.message), state);
}

function logFinallyTask(args, state) {
  Logger.log(
    'logFinallyTask(' +
    JSON.stringify(args) + ', ' +
    JSON.stringify(state) + ');');
  return;
}

// Task Groups which do useful things in Habitica.
function runAcceptQuestTaskGroup() {
  let group = new TaskGroup('acceptQuestTaskGroup', true);
  group.addTask({
    'func': 'fetchUserToStateTask',
    'args': {'userFields': 'party'},
  });
  group.addTask({
    'func': 'fetchPartyToStateTask',
    'args': {},
  });
  //group.addTask({
  //  'func': 'exploreStateTask',
  //  'args': {'explore': 'fetched.party'},
  //});
  group.addTask({
    'func': 'acceptQuestIfPendingTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to accept quest: '}
  });
  return group.run();
}

function testSaveCostume() {
  return runSaveCostumeTaskGroup('test');
}

function testLoadCostume() {
  runLoadCostumeTaskGroup('test');
}

function runLoadCostumeTaskGroup(saveName) {
  let group = new TaskGroup('saveCostumeTaskGroup', true);
  group.addTask({
    'func': 'abortIfLockedTask',
    'args': {
      'lockKey': 'costume',
      'message': 'currently saving a costume slot, cancelling load of "' +
                 saveName + '"',
    },
  });
  group.addTask({
    'func': 'loadCostumeMultiTask',
    'args': {
      'saveName': saveName,
    },
  });
  return group.run();
}

function runSaveCostumeTaskGroup(saveName) {
  let group = new TaskGroup('saveCostumeTaskGroup', true);
  group.addTask({
    'func': 'lockTask',
    'args': {'lockKey': 'costume'},
  });
  group.addTask({
    'func': 'fetchUserToStateTask',
    'args': {
        'userFields': 'items.gear.costume,items.currentPet,' + 
                      'items.currentMount,preferences'},
  });
  group.addTask({
    'func': 'exploreStateTask',
    'args': {'explore': 'fetched.user.items.gear.costume'},
  });
  group.addTask({
    'func': 'exploreStateTask',
    'args': {'explore': 'fetched.user.preferences'},
  });
  group.addTask({
    'func': 'getCurrentCostumeTask',
    'args': {},
  });
  group.addTask({
    'func': 'saveCostumeTask',
    'args': {'saveName': saveName},
  });
  group.addTask({
    'func': 'findLoadCostumeRewardTask',
    'args': {'saveName': saveName},
  });
  group.addTask({
    'func': 'exploreStateTask',
    'args': {'explore': 'loadCostumeReward'},
  });
  group.addTask({
    'func': 'createOrUpdateLoadCostumeRewardTask',
    'args': {'saveName': saveName},
  });
  group.setOnError({
    'func': 'throwErrorTask',  // TODO change to reportErrorTask
    'args': {'error_message': 'Failed to save Costume to slot "' + saveName + '": '}
  });
  group.setOnFinally({
    'func': 'unlockTask',
    'args': {'lockKey': 'costume'},
  });
  return group.run();
}

function acceptQuest() {
  const params = {
    'method' : 'post', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party/quests/accept';
  return habiticaApi(api, params);
}

function acceptQuestIfPendingTask(args, state) {
  checkRateLimit(state);
  let quest = state.fetched.party.quest;
  let RSVPNeeded = state.fetched.user.party.quest.RSVPNeeded;
  if (quest.key && !quest.active && RSVPNeeded) {
    const response = acceptQuest();
    checkResponseRateLimit(response, state);
    if (!response.success) {
      throw new Error('Unable to accept quest: ' + response.error);
    }
  }
}


function runInviteQuestTaskGroup(questKey) {
  let group = new TaskGroup('inviteQuestTaskGroup', true);
  group.addTask({
    'func': 'inviteQuestTask',
    'args': {'questKey': questKey},
  });
  group.addTask({
    'func': 'incrementQuestIndexTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to invite quest: '}
  });
  return group.run();
}

function inviteQuestTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'post', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party/quests/invite/' + args.questKey;
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to invite quest: ' + response.error);
  }
}

function incrementQuestIndexTask(args, state) {
  let questIndex = Number(scriptProperties.getProperty('questIndex'));
  questIndex += 1;
  scriptProperties.setProperty('questIndex', String(questIndex));
}

function fetchUserToStateTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'user';

  if (isTrue(args.userFields)) {
    api += '?userFields=' + args.userFields;
  }

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to fetch user: ' + response.error);
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  state.fetched.user = response.data;
}

function getCurrentCostumeTask(args, state) {
  currentCostume = {};
  currentCostumeWithStructure = {};
  for (let key of COSTUME_VARIABLES) {
    let varPath = key.split('.');
    let inputVar = state.fetched.user;
    for (let varPathPart of varPath) {
      inputVar = inputVar[varPathPart];
      if (inputVar == undefined) {
        new Error(
          'Unable to deterime current costume: no variable ' +
          key + ' failed on variable part ' + varPathPart);
      }
    }
    let outputVarWithStructure = currentCostumeWithStructure;
    for (let i = 0; i < varPath.length-1; ++i) {
      let varPathPart = varPath[i];
      if (outputVarWithStructure[varPathPart] == undefined) {
        outputVarWithStructure[varPathPart] = {};
      }
      outputVarWithStructure = outputVarWithStructure[varPathPart];
    }
    currentCostume[key] = inputVar;
    outputVarWithStructure[varPath[varPath.length-1]] = inputVar;
  }
  Logger.log(
      'currentCostumeWithStructure: ' +
      JSON.stringify(currentCostumeWithStructure));
  Logger.log('currentCostume: ' + JSON.stringify(currentCostume));
  state.currentCostume = currentCostume;
}

function saveCostumeTask(args, state) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(
    SAVE_COSTUME_PROPERTY_PREFIX + args.saveName,
    JSON.stringify(state.currentCostume));
  // TODO Add privateMessage()
}

function loadCostumeMultiTask(args, state) {
  // Chain together a number of tasks all in one multi-task.
  // This means if the TaskGroup is paused, the entire
  // multi-task will be restarted and any change in the
  // currently equipped costume will be noticed.
  delete state['currentCostume'];
  delete state['costumeSave'];
  delete state['fetched'];
  fetchUserToStateTask(
    {'userFields': 'items.gear.costume,items.currentPet,' +
                   'items.currentMount,preferences'},
    state);
  getCurrentCostumeTask({}, state);
  getCostumeSaveTask({'saveName': args.saveName}, state);
  getEquipChangesTask({}, state);

  let numChanges = Object.keys(state.equipChanges).length;
  if (numChanges < 28 && numChanges + 1 > state.rateLimitRemaining) {
    // Wait until we can do it all at once (assuming that's an option).
    const waitUntil = new Date(state.rateLimitReset);
    const now = new Date();
    throw new PauseTaskGroupException(Math.max(0, waitUntil - now));
  }

  changeCostumeTask({}, state);
}

function getCostumeSaveTask(args, state) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const costumeSaveString = scriptProperties.getProperty(
    SAVE_COSTUME_PROPERTY_PREFIX + args.saveName);
  if (isFalse(costumeSaveString)) {
    throw new Error('Could not find costume save "' + args.saveName + '"')
  }
  // TODO Allow narrowing the scope of what is saved.  Setting null for things
  // that the save doesn't care about.
  costumeSave = JSON.parse(costumeSaveString);
  state.costumeSave = costumeSave;
}

function getEquipChangesTask(args, state) {
  equipChanges = {};
  for (let key of COSTUME_VARIABLES) {
    let currentItem = state.currentCostume[key];
    let targetItem = state.costumeSave[key];
    if (targetItem == null) {
      // Ignore the target, this is different from the base unequipped state,
      // which has a particular key associated with it.
      continue;
    }
    if (currentItem == targetItem) {
      // Nothing to do.
      continue;
    }
    if (targetItem.indexOf('_base_0') !== -1) {
      // Is base type.
      targetItem = currentItem;  // Unequip by equipping the current item.
      // TODO correctly handle two handed weapons.
    }
    equipChanges[key] = targetItem;
  }
  Logger.log('equipChanges = ' + JSON.stringify(equipChanges));
  state.equipChanges = equipChanges;
}

function changeCostumeTask(args, state) {
  if (isFalse(state.equipChanges)) {
    Logger.log('Nothing to change.');
    return;
  }
  for (let key of Object.keys(state.equipChanges).sort()) {
    if (key.startsWith('items.gear.costume.')) {
      changeItemTask({
        'type': 'costume',
        'equip': state.equipChanges[key],
      }, state);
    } else if (key == 'items.currentMount') {
      changeItemTask({
        'type': 'mount',
        'equip': state.equipChanges[key],
      }, state);
    } else if (key == 'items.currentPet') {
      changeItemTask({
        'type': 'pet',
        'equip': state.equipChanges[key],
      }, state);
    } else if (key.startsWith('preferences.')) {
      let path = key.substring('preferences.'.length);
      changePreferenceTask({
        'path': path + '.' + state.equipChanges[key],
      }, state);
    } else {
      throw new Error('unable to equip key ' + key);
    }
  }
}

function changeItemTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'post',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }

  const api = 'user/equip/' + args.type +
              '/' + args.equip;
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    // Logger.log(JSON.stringify(response));
    throw new Error(
        'Unable to equip costume item ' + args.equip +
        ' in slot ' + args.type);
  }
}

function changePreferenceTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'post',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }

  const api = 'user/unlock?path=' + args.path;
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to set preference ' + args.path);
  }
}

function findLoadCostumeRewardTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }

  const api = 'tasks/user?type=rewards';
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to load reward tasks.');
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  if (isFalse(state.loadCostumeTask)) {
    state.loadCostumeReward = {};
  }
  state.fetched.rewards = response.data;
  for (let i in response.data) {
    let reward = response.data[i];
    let m = LOAD_REWARD_REGEX.exec(reward.text);
    if (isTrue(m)) {
      state.loadCostumeRewardId[args.saveName] = reward.id;
      state.loadCostumeRewardIndex[args.saveName] = i;
    }
  }
}

function createOrUpdateLoadCostumeRewardTask(args, state) {
  if (isTrue(state.loadCostumeRewardId) &&
      args.saveName in state.loadCostumeRewardId) {
    // Nothing to update.
    Logger.log('Already have a load task for costume "' + args.saveName + '"');
    return;
  }
  checkRateLimit(state);
  const payload = {
    'type' : 'reward',
    'text' : LOAD_REWARD_FORMAT.replace('{0}', args.saveName),
    'notes' : '',
  }
  
  const params = {
    'method' : 'post',
    'headers' : HEADERS,
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions' : true,
  }
  const api = 'tasks/user';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    Logger.log(JSON.stringify(response));
    throw new Error(
        'Unable to create new load costume reward tasks for slot ' +
        args.saveName + '.');
  }
  // TODO Get the id for the task and move it to the correct index.
}

function fetchPartyToStateTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to fetch party: ' + response.error);
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  state.fetched.party = response.data;
}

// Send a private message.
function privateMessage(message, toUserId, state) {
  return runPrivateMessageTaskGroup(message, toUserId, state);
}

function runPrivateMessageTaskGroup(message, toUserId, state) {
  // Don't clear current messages.
  let group = new TaskGroup('privateMessageTaskGroup', false);
  group.addTask({
    'func': 'privateMessageTask',
    'args': {'message': message, 'toUserId': toUserId},
    });
  if (isTrue(state) && state.rateLimitRemaining != undefined) {
    if (isFalse(group.queue.state)) {
      group.queue.state = {};
    }
    group.queue.state.rateLimitRemaining = state.rateLimitRemaining;
    group.queue.state.rateLimitReset = state.rateLimitReset;
  }
  group.saveQueue();  // Save queue in case it's paused.
  return group.run();
}

function privateMessageTask(args, state) {
  checkRateLimit(state);
  const payload = {
    'message' : args.message,
    'toUserId' : args.toUserId,
  }
  
  const params = {
    'method' : 'post',
    'headers' : HEADERS,
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions' : true,
  }

  const api = 'members/send-private-message';
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to send private message to ' +
                    args.toUserId + ': ' + args.message);
  }
}

function logWebhooks() {
  let group = new TaskGroup('createWebhookTaskGroup', true);
  group.addTask({
    'func': 'findWebhooksWithPrefixTask',
    'args': {'labelPrefix': ''},
  });
  group.addTask({
    'func': 'exploreStateTask',
    'args': {'explore': 'webhookIds'},
  });
  group.setOnError({
    'func': 'throwErrorTask',
    'args': {'error_message': 'Failed to create webhook: '}
  });
  return group.run();
}

function runCreateWebhookTaskGroup(deleteWebhooks, optionsList) {
  let group = new TaskGroup('createWebhookTaskGroup', true);
  if (isTrue(deleteWebhooks)) {
    group.addTask({
      'func': 'findWebhooksWithPrefixTask',
      'args': {'labelPrefix': SCRIPT_NAME + ':'},
    });
    group.addTask({
      'func': 'deleteWebhookTask',
      'args': {},
    });
  }
  group.addTask({
    'func': 'findWebhooksWithPrefixTask',
    'args': {'labelPrefix': ''},
  });
  for (let options of optionsList) {
    Logger.log(JSON.stringify(options));
    group.addTask({
      'func': 'createWebhookTask',
      'args': {
        'label': options.label,
        'webhookType': options.webhookType,
        'options': options.options,
        'enabled': options.enabled},
    });
  }
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to setup webhook: '}
  });
  return group.run();
}

function findWebhookTask(args, state) {
  checkRateLimit(state);
  state.webhookId = null;
  // Fetch the current webhooks to see if we already created one.
  const api = 'user/webhook';
  const params = {
      'method' : 'get',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
  };
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch webhooks: ' + response.error);
  }
  // Search through existing webhooks to see if any match our label.
  for (let i in response.data) {
    let webhook = response.data[i];
    if (webhook.label == args.label) {
      state.webhookId = webhook.id;
      break;
    }
  }
}

function createWebhookTask(args, state) {
  checkRateLimit(state);
  let api = 'user/webhook';
  let payload = {
    'url' : WEB_APP_URL,
    'label' : args.label,
    'type' : args.webhookType,
    'enabled': isTrue(args.enabled),
  }
  if (isTrue(args.options)) {
    payload['options'] = args.options;
  }
  let method = 'post';

  if (isTrue(state.webhookId)) {
    Logger.log('modify existing webhook with id ' + state.webhookId);
    api = api + '/' + state.webhookId;
    method = 'put';
  } else {
    Logger.log('create new webhook.');
  }

  const params = {
    'method' : method,
    'headers' : HEADERS,
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions' : true,
  }

  let response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to create webhook: ' + response.error);
  }
}

function runDeleteWebhookTaskGroup() {
  let group = new TaskGroup('createWebhookTaskGroup', true);
  group.addTask({
    'func': 'findWebhooksWithPrefixTask',
    'args': {'labelPrefix': SCRIPT_NAME + ':'},
  });
  group.addTask({
    'func': 'deleteWebhookTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to delete webhooks: '}
  });
  return group.run();
}

function findWebhooksWithPrefixTask(args, state) {
  checkRateLimit(state);
  state.webhookIds = null;
  // Fetch the current webhooks to see if we already
  // created one.
  const api = 'user/webhook';
  const params = {
      'method' : 'get',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
  };
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch webhooks: ' + response.error);
  }
  // Search through existing webhooks to see if any match our label.
  for (let i in response.data) {
    let webhook = response.data[i];
    if (webhook.label.startsWith(args.labelPrefix)) {
      if (isFalse(state.webhookIds)) {
        state.webhookIds = {};
      }
      state.webhookIds[webhook.id] = webhook.label;
    }
  }
}

function deleteWebhookTask(args, state) {
  checkRateLimit(state);
  let origApi = 'user/webhook';
  if (isFalse(state.webhookIds)) {
    return;
  }
  let webhookIds = Object.keys(state.webhookIds);
  for (let webhookId of webhookIds) {
    const params = {
      'method' : 'delete',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
    }
    let api = origApi + '/' + webhookId;
    let response = habiticaApi(api, params);
    checkResponseRateLimit(response, state);
    if (isFalse(response.success)) {
      throw new Error('Unable to delete webhook: ' + response.error);
    }
    // Delete the deleted webhook from the state, so it isn't deleted again
    // if rerun.
    delete state.webhookIds[webhookId];
  }
}

function deleteAllSelfMessagesTaskGroup() {
  return deleteMessagesTaskGroup('');
}

function deleteScriptMessagesTaskGroup() {
  return deleteMessagesTaskGroup(SCRIPT_NAME);
}

function deleteSpellSpammer2MessagesTaskGroup() {
  return deleteMessagesTaskGroup('doPost, webhookType');
}

function deleteMessagesTaskGroup(prefix) {
  let group = new TaskGroup('messagesTaskGroup', true);
  group.addTask({
    'func': 'findSelfMessagesTask',
    'args': {},
  });
  group.addTask({
    'func': 'findScriptMessagesTask',
    'args': {'prefix': prefix},
  });
  group.addTask({
    'func': 'deleteMessagesTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to delete messages: '}
  });
  return group.run();
}

function findSelfMessagesTask(args, state) {
  checkRateLimit(state);
  let api = 'inbox/messages';
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  let response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch messages: ' + response.error);
  }
  let output = [];
  for (let i in response.data) {
    if (response.data[i].uuid == response.data[i].ownerId) {
      output.push(response.data[i]);
    }
  }
  state.messages = output;
}

function findScriptMessagesTask(args, state) {
  let output = [];
  for (let i in state.messages) {
    if (state.messages[i].text.startsWith(args.prefix)) {
      output.push(state.messages[i]);
    }
  }
  state.messages = output;
}

function deleteMessagesTask(args, state) {
  checkRateLimit(state);
  let origApi = 'user/messages';
  while (isTrue(state.messages)) {
    const params = {
      'method' : 'delete',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
    }
    let api = origApi + '/' + state.messages[0].id;
    Logger.log('deleting message: ' + api);
    let response = habiticaApi(api, params);
    checkResponseRateLimit(response, state);
    if (isFalse(response.success)) {
      throw new Error('Unable to delete message: ' + response.error);
    }
    // Delete the message from the state, so it isn't deleted again if rerun.
    state.messages.shift();
  }
}

function lockTask(args, state) {
  if (isFalse(acquireLock(args.lockKey))) {
    // TODO Exponential backoff
    throw new PauseTaskGroupException(1000 * 60);
  }
  let propertyName = LOCK_PROPERTY_PREFIX + args.lockKey;
  if (isFalse(state.locks)) {
    state.locks = {};
  }
  state.locks[propertyName] = true;
}

function abortIfLockedTask(args, state) {
  if (isFalse(acquireLock(args.lockKey))) {
    throw new Error(args.message);
  }
  releaseLock(args.lockKey);
}

function acquireLock(lockKey) {
  let propertyName = LOCK_PROPERTY_PREFIX + lockKey;
  const scriptProperties = PropertiesService.getScriptProperties();
  let currentState = scriptProperties.getProperty(propertyName);
  if (currentState == 'locked') {
    return false;
  }
  scriptProperties.setProperty(propertyName, 'locked');
  return true;
}

function unlockTask(args, state) {
  releaseLock(args.lockKey);
  if (isTrue(state.locks)) {
    let propertyName = LOCK_PROPERTY_PREFIX + args.lockKey;
    delete state.locks[propertyName];
  }
}

function releaseLock(lockKey) {
  let propertyName = LOCK_PROPERTY_PREFIX + lockKey;
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty(propertyName);
}

function exploreStateTask(args, state) {
  let varPath = args.explore.split('.');
  let explore = state;
  for (let varPathPart of varPath) {
    explore = explore[varPathPart];
    if (explore == undefined) {
      Logger.log(
          varPathPart + ' of ' + args.explore + ' does not exist in state');
      return;
    }
  }
  for (let key of Object.keys(explore).sort()) {
    Logger.log(args.explore + '.' + key + ': ' + JSON.stringify(explore[key]));
  }
}

function createWebhooks(deleteWebhooks) {
  options_list = [
    {
      'label': SCRIPT_NAME + ': questActivity Webhook',
      'options': {
        'questStarted': true,
        'questFinished': true,
        'questInvited': true,
      },
      'webhookType': 'questActivity',
      'enabled': true,
    },
    {
      'label': SCRIPT_NAME + ': taskActivity Webhook',
      'options': {
        'scored': true,
      },
      'webhookType': 'taskActivity',
      'enabled': true,
    },
  ];
  runCreateWebhookTaskGroup(deleteWebhooks, options_list);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const webhookType = data.webhookType;

  logToProperty('doPost', data);
  if (webhookType == 'taskActivity') {
    const taskText = data.task.text;
    const taskNotes = data.task.notes;
    
    if (ENABLE_SKILL_MULTI_CAST && data.type == 'scored') {
      if (taskText == SKILL_MULTI_CAST_STRING) {
        logToProperty('doPost', 'running skill multi-cast');
        runSpamCastTaskGroup(Number(taskNotes), false);
      }
    }
  }
  if (webhookType == 'questActivity') {
    tryDeferredSpamCast();
    if (isTrue(ENABLE_QUEST_AUTO_INVITE) && data.type == 'questFinished') {
      if (data.quest.questOwner ==
          '590aaa0b-b667-4e94-870c-f74fe403d44a' /*Jay*/) {
        inviteNextQuest();
      }
    }
    if (isTrue(ENABLE_QUEST_AUTO_ACCEPT) && data.type == 'questInvited') {
      const response = acceptQuest();
      if (!response.success) {
        reportFailure('Unable to accept quest: ' + response.error);
      }
    }
  }

  return HtmlService.createHtmlOutput();
}

function findFunctionTrigger(functionName) {
  // Return the first trigger which will call functionName.
  const triggers = ScriptApp.getProjectTriggers();

  for (let i in triggers) {
    if (triggers[i].getHandlerFunction() == functionName) {
      return triggers[i];
    }
  }
  return null;
}

function deleteFunctionTriggers(functionName) {
  // Delete triggers to functionName to avoid reaching the maximum number
  // of triggers
  const triggers = ScriptApp.getProjectTriggers();

  for (let i in triggers) {
    if (triggers[i].getHandlerFunction() == functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i in triggers) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

function getMember() {
  const params = {
    'method' : 'get', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  };
  
  const api = 'members/' + USER_ID;
  const response = habiticaApi(api, params);
  let explore = response.data;
  for (let key in explore) {
    Logger.log(key +': ' + JSON.stringify(explore[key]));
  }
  return null;
}

function getUser() {
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'user';

  const response = habiticaApi(api, params);
  let explore = response.data;
  for (let key in explore) {
    Logger.log(key +': ' + JSON.stringify(explore[key]));
  }
  return null;
}

function getParty() {
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api =
      'groups/party/members?includeAllPublicFields=true&includeTasks=false';

  const response = habiticaApi(api, params);
  const rsvp = {};
  for (let i in response.data) {
    rsvp[response.data[i].profile.name] =
        response.data[i].party.quest.RSVPNeeded;
    let explore = response.data[i].party.quest;
    for (let key in explore) {
      Logger.log(i + ' ' + key +': ' + JSON.stringify(explore[key]));
    }
  }
  for (let name in rsvp) {
    Logger.log('member ' + name + ' RSVPNeeded=' + rsvp[name]);
  }
  return null;
}

function getRSVPNeeded() {
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api =
      'groups/party/members?includeAllPublicFields=true&includeTasks=false';

  const response = habiticaApi(api, params);
  if (!response.success) {
    reportError('Unable to fetch party member information: ' + response.error);
    return;
  }
  let RSVPNeeded = {};
  for (let i in response.data) {
    rsvp[response.data[i].id] = response.data[i].party.quest.RSVPNeeded;
  }
  Logger.log(RSVPNeeded);
  return RSVPNeeded;
}

// Utility Functions.
function reportError(message, state) {
  if (LOG_ON_FAILURE) {
    logToProperty('reportError', message);
  }
  if (MESSAGE_ON_FAILURE) {
    if (isTrue(state)) {
      privateMessage(SCRIPT_NAME + ' failure: ' + message, USER_ID, state);
    }
  }
}

function logToProperty(property, obj) {
  Logger.log(LOG_PROPERTY_PREFIX + property + ': ' + JSON.stringify(obj));
  let scriptProperties = PropertiesService.getScriptProperties();
  let logString = scriptProperties.getProperty(LOG_PROPERTY_PREFIX + property);
  let log = [];
  if(isTrue(logString)) {
    log = JSON.parse(logString);
  }
  log.unshift({'time': new Date(), 'obj': obj});
  scriptProperties.setProperty(
      LOG_PROPERTY_PREFIX + property, JSON.stringify(log));
}

function testReportError() {
  reportError({'a': 'blah \'this\' is a test.', 'b': 10})
}

function printLogs() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let props = scriptProperties.getProperties();
  for (let key in props) {
    if (key.startsWith(LOG_PROPERTY_PREFIX)) {
      let log = JSON.parse(props[key]);
      for (let i in log) {
        Logger.log(
            key + ' (' + log[i].time + '): ' + JSON.stringify(log[i].obj));
      }
    }
  }
}

function deleteLogs() {
  return deleteAllPropertiesWithPrefix(LOG_PROPERTY_PREFIX);
}

function habiticaApi(api, params) {
  const url = 'https://habitica.com/api/v3/' + api;
  Logger.log(url);
  return parseResponse(UrlFetchApp.fetch(url, params));
}

function parseResponse(response) {
  if (isFalse(response)) {
    return {
      'success': false,
      'error': 'no response',
      'code': null,
      'headers': {}
    };
  }
  let code = response.getResponseCode();
  let parsed = JSON.parse(response);
  if (code < 200 || code >= 300) {
    return {
      'success': false,
      'error': 'response code (' + String(code) + ') received (' +
               parsed.error + '): ' + parsed.message,
      'code': code,
      'headers': response.getAllHeaders()
    };
  }
  if (isTrue(DEBUG_LOG_REQUESTS)) {
    Logger.log(JSON.stringify(parsed));
  }
  if (isFalse(parsed.success)) {
    return {
      'success': false,
      'error': 'error received (' + parsed.error + '): ' + parsed.message,
      'code': code,
      'headers': response.getAllHeaders()
    };
  }
  return {
    'success': true,
    'data': parsed.data,
    'code': code,
    'headers': response.getAllHeaders()
  };
}

function checkRateLimit(state) {
  if (state.rateLimitRemaining != undefined && state.rateLimitRemaining == 0) {
    const waitUntil = new Date(state.rateLimitReset);
    const now = new Date();
    if (waitUntil > now) {
      throw new PauseTaskGroupException(waitUntil - now);
    }
  }
}

function checkResponseRateLimit(response, state) {
  if(isTrue(response.headers)) {
    let value1 = response.headers['x-ratelimit-remaining'];
    if (value1 != undefined) {
      state.rateLimitRemaining = Number(value1);
    }
    let value2 = response.headers['x-ratelimit-reset'];
    if (value2 != undefined) {
      state.rateLimitReset = value2;
    }
    if (value1 != undefined && value2 != undefined) {
      Logger.log('found rate limit parameters of ' + state.rateLimitRemaining +
                 ' and reset at ' + state.rateLimitReset);
    }
  }
  if(response.code == 429) {
    const waitUntil = new Date(state.rateLimitReset);
    const now = new Date();
    throw new PauseTaskGroupException(Math.max(0, waitUntil - now));
  }
}

// startQuest functions.
function checkStartQuest() {
  // TODO use getParty and getRSVPNeeded functions instead of these other things
  // use a TaskGroup maybe and make sure error handling is done right.
  let questMembers = getQuestMembers();
  if (questMembers == null) {
    Logger.log('Quest is not waiting to start (by you).');
    clearCountdown();
    return;
  }
  if (countdownFinished()) {
    Logger.log('Quest has been waiting too long, starting.');
    startQuest();
    clearCountdown();
    return;
  }
  ensureCountdownStarted();
  let memberInfo = getMemberInfo();
  for (let member in memberInfo) {
    if (memberInfo[member].active && memberInfo[member].RSVPNeeded) {
      Logger.log(member + ' has not accepted and is active, not starting.');
      return;
    }
  }
  // All active members have accepted.
  Logger.log('all active members have accepted, starting.');
  startQuest();
  clearCountdown();
}

function getQuestMembers() {
  // If a quest is invited but not started and I might want to start it,
  // then return the members that are currently on it, otherwise null.
  const params = {
    'method' : 'get', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  };
  
  const api = 'groups/party';
  const response = habiticaApi(api, params);
  if (!response.success) {
    reportFailure('Unable to fetch party info: ' + response.error);
    return null;
  }
  let data = response.data;
  if (START_ONLY_MY_QUESTS && data.quest.leader != USER_ID) {
    return null;
  }
  if (data.quest.key && !data.quest.active) {
    return data.quest.members;
  }
  return null;
}

function getMemberInfo() {
  const params = {
    'method' : 'get', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  
  const api =
      'groups/party/members?includeAllPublicFields=true&includeTasks=false';
  const response = habiticaApi(api, params);
  if (!response.success) {
    reportFailure(
        'Unable to fetch party member information: ' + response.error);
    return;
  }
  let data = response.data;
  let now = (new Date()).getTime();
  let memberInfo = {};
  for (let i in data) {
    let active = false;
    let timeSinceUpdated =
        now - new Date(data[i].auth.timestamps.updated).getTime();
    if (timeSinceUpdated / MILLIS_IN_DAY < NUM_DAYS_UNTIL_INACTIVE) {
      active = true;
    } else {
      active = false;
    }
    memberInfo[data[i].id] = {
      'active': active,
      'RSVPNeeded': data[i].party.quest.RSVPNeeded,
    }
  }
  Logger.log(JSON.stringify(memberInfo));
  return memberInfo;
}

function startQuest() {
  if (isTrue(DEBUG_MESSAGE_INSTEAD_OF_START_QUEST)) {
    privateMessage('QuestAutoStart: Would have started quest', USER_ID);
    return;
  }
  const params = {
    'method' : 'post', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party/quests/force-start';
  const response = habiticaApi(api, params);
  return response;
}

