function logAllProperties() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let props = scriptProperties.getProperties();
  for (let key in props) {
    Logger.log(key + ' ' + JSON.stringify(props[key]));
  }
}

function logCurrentQuestIndex() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let questIndex = scriptProperties.getProperty('questIndex');
  if (questIndex == null) {
    questIndex = 0;
  } else {
    questIndex = Number(questIndex);
  }
  let quest = questQueue[questIndex];
  Logger.log('next quest: "' + quest + '" (index ' + questIndex + ')');
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

function testSpamCastTaskGroup() {
  runSpamCastTaskGroup(2, false);
}

function testSaveCostume() {
  return runSaveCostumeTaskGroup('test');
}

function testLoadCostume() {
  runLoadCostumeTaskGroup('test');
}

function testMessages() {
  for (let i = 0; i < 40; ++i) {
    privateMessage(SCRIPT_NAME + ': message ' + (i+1), USER_ID);
  }
}

