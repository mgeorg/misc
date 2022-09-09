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

function resetQuestIndex() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('questIndex');
}

