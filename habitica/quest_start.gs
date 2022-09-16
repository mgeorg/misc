function checkStartQuest() {
  // TODO use a TaskGroup maybe and make sure error handling is done right.
  let questMembers = getQuestMembers();
  if (questMembers == null) {
    logToProperty('questStart', 'Quest is not waiting to start (by you).');
    clearCountdown();
    return;
  }
  if (countdownFinished()) {
    logToProperty('questStart', 'Quest has been waiting too long, starting.');
    startQuest();
    clearCountdown();
    return;
  }
  ensureCountdownStarted();
  let memberInfo = getMemberInfo();
  for (let member in memberInfo) {
    if (memberInfo[member].active && memberInfo[member].RSVPNeeded) {
      logToProperty(
          'questStart',
          member + ' has not accepted and is active, not starting.');
      return;
    }
  }
  // All active members have accepted.
  logToProperty('questStart', 'all active members have accepted, starting.');
  startQuest();
  clearCountdown();
}

function ensureCountdownStarted() {
  const scriptProperties = PropertiesService.getScriptProperties();
  if (scriptProperties.getProperty(QUEST_TIMESTAMP_PROPERTY) == null) {
    scriptProperties.setProperty(
        QUEST_TIMESTAMP_PROPERTY, String(new Date().getTime()));
  }
}

function countdownFinished() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const countdownString = scriptProperties.getProperty(
      QUEST_TIMESTAMP_PROPERTY);
  if (countdownString == null) {
    return false;
  }
  const countdown = Number(countdownString);
  const now = new Date().getTime();
  if ((now - countdown) / MILLIS_IN_HOUR >= NUM_HOURS_UNTIL_FORCE_START) {
    return true;
  }
  return false;
}

function clearCountdown() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty(QUEST_TIMESTAMP_PROPERTY);
}

function logCountdown() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const countdownString = scriptProperties.getProperty('quest_timestamp');
  if (countdownString != null) {
    Logger.log(new Date(Number(countdownString)));
  }
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
    selfMessage('QuestAutoStart: Would have started quest');
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

