// Functions that are meant for a user to manually trigger.
// Possibly for debugging purposes.

function printLogs(numShow) {
  let scriptProperties = PropertiesService.getScriptProperties();
  let props = scriptProperties.getProperties();
  let i = 0;
  for (let key of Object.keys(props).sort()) {
    if (key.startsWith(LOG_PROPERTY_PREFIX)) {
      let log = JSON.parse(props[key]);
      for (let i in log) {
        Logger.log(
            key + ' ' + i + ' (' + log[i].time + '): ' +
            JSON.stringify(log[i].obj));
        if (isTrue(numShow) && Number(i) >= numShow) {
          break;
        }
      }
    }
  }
}

function printLogs3() {
  return printLogs(3);
}

function deleteLogs() {
  return deleteAllPropertiesWithPrefix(LOG_PROPERTY_PREFIX);
}

function logCurrentQuest() {
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

function logAllProperties() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let props = scriptProperties.getProperties();
  for (let key in props) {
    Logger.log(key + ' ' + JSON.stringify(props[key]));
  }
}
