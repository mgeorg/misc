function deleteDeferCastQueue() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('deferSpamCast');
  deleteFunctionTriggers('tryDeferredSpamCast');
}

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

