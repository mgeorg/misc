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
  if (isNumber(explore) || isString(explore)) {
    Logger.log(args.explore + ': ' + JSON.stringify(explore));
  } else {
    for (let key of Object.keys(explore).sort()) {
      Logger.log(
          args.explore + '.' + key + ': ' +
          JSON.stringify(explore[key], null, 2));
    }
  }
}

function testSaveCostume() {
  return runSaveCostumeTaskGroup('test');
}

function testLoadCostume() {
  runLoadCostumeTaskGroup('test');
}

function testMessages() {
  for (let i = 0; i < 40; ++i) {
    selfMessage(SCRIPT_NAME + ': test message ' + (i+1));
  }
}

function spamCastNow() {
  deleteSpamCastQueue();
  runSpamCastTaskGroup('times 1\nwaitforquest false\nwaitforlogintime false');
}

function testSpamCastTaskGroup() {
  runSpamCastTaskGroup('times 2\nwaitforlogintime true');
}

function testLoginTimeTrigger() {
  doLoginTime();
}

function debugUserTaskGroup() {
  let group = new TaskGroup('spamCastTaskGroup', true);
  group.addTask({
    'func': 'fetchUserToStateTask',
    'args': {'userFields': 'preferences'},
  });
  group.addTask({
    'func': 'exploreStateTask',
    'args': {'explore': 'fetched.user'},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': ''}
  });
  return group.run();
}

function logSpamCastQueue() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let deferString = scriptProperties.getProperty('deferSpamCast');
  let deferList = [];
  if (isTrue(deferString)) {
    deferList = JSON.parse(deferString);
  }
  Logger.log(JSON.stringify(deferList, null, 2));
}

function deleteSpamCastQueue() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('deferSpamCast');
}

function testGetMemberInfo() {
  let state = {};
  getMemberInfoTask({}, state);
}

