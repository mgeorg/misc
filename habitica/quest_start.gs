function checkStartQuest() {
  let group = new TaskGroup('startQuestTaskGroup', true);
  group.addTask({
    'func': 'checkStartQuestTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': ''}
  });
  return group.run();
}

function checkStartQuestTask(args, state) {
  getQuestMembersTask(args, state);
  if (state.questMembers == null) {
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
  getMemberInfoTask(args, state);
  for (let memberId in state.memberInfoById) {
    let memberInfo = state.memberInfoById[memberId];
    if (memberInfo.active && memberInfo.RSVPNeeded) {
      logToProperty(
          'questStart',
          memberInfo.username +
          ' has not accepted and is active, not starting.');
      return;
    }
  }
  // All active members have accepted.
  logToProperty('questStart', 'all active members have accepted, starting.');
  startQuestTask(args, state);
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

function startQuestTask(args, state) {
  if (isTrue(DEBUG_MESSAGE_INSTEAD_OF_START_QUEST)) {
    selfMessage('QuestAutoStart: Would have started quest');
    return;
  }
  checkRateLimit(state);
  const params = {
    'method' : 'post', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party/quests/force-start';
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to start quest: ' + response.error);
  }
}

