function deleteDeferCastQueue() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('deferSpamCast');
  deleteFunctionTriggers('tryDeferredSpamCast');
}

function runSpamCastTaskGroup(notes) {
  let group = new TaskGroup('spamCastTaskGroup', true);
  group.addTask({
    'func': 'parseNotesOptionsTask',
    'args': {'notes': notes},
  });
  group.addTask({
    'func': 'fetchPartyToStateTask',
    'args': {},
  });
  group.addTask({
    'func': 'spamCastOrDeferTask',
    'args': {
      'skillId': 'smash',  // fireball
      'times': 10,
      'targetId': '40ae2ea3-e737-4354-ad07-6670072bf98a', // Morning Pills
      'waitForQuest': true,
      'waitForLoginTime': false,
    },
  });
  group.addTask({
    'func': 'tryCastDeferredTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': ''}
  });
  return group.run();
}

function runDeferredSpamCastTaskGroup(runningAtLoginTime) {
  let group = new TaskGroup('spamCastTaskGroup', true);
  group.addTask({
    'func': 'fetchPartyToStateTask',
    'args': {},
  });
  group.addTask({
    'func': 'tryCastDeferredTask',
    'args': {'runningAtLoginTime': runningAtLoginTime},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': ''}
  });
  return group.run();
}

function spamCastOrDeferTask(args, state) {
  let quest = state.fetched.party.quest;
  options = {
    'skillId': args.skillId,
    'times': Number(args.times),
    'targetId': args.targetId,
    'waitForQuest': isTrueString(args.waitForQuest),
    'waitForLoginTime': isTrueString(args.waitForLoginTime),
  };
  if (isTrue(state.notesOptions)) {
    options.skillId = lowerKeyLookupOrDefault(
        'skill', state.notesOptions, options.skillId);
    // TODO Add skill name lookup.

    options.times = lowerKeyLookupOrDefault(
        'times', state.notesOptions, options.times);
    // TODO Add "max" as an option.
    if (!isNumber(options.times)) {
      options.times = Number(options.times);
    }

    options.targetId = lowerKeyLookupOrDefault(
        'target', state.notesOptions, options.targetId);
    // TODO Add target task name lookup.

    options.waitForQuest = isTrueString(lowerKeyLookupOrDefault(
        'waitForQuest', state.notesOptions, options.waitForQuest));
    options.waitForLoginTime = isTrueString(lowerKeyLookupOrDefault(
        'waitForLoginTime', state.notesOptions, options.waitForLoginTime));
  }
  logToProperty('notesOptions', state.notesOptions);
  logToProperty('options', options);

  if ((options.waitForQuest && isFalse(quest.active)) ||
      (options.waitForLoginTime && isFalse(args.runningAtLoginTime))) {
    // Defer the casting.
    let scriptProperties = PropertiesService.getScriptProperties();
    let deferList = [];
    let deferString = scriptProperties.getProperty('deferSpamCast');
    if (isTrue(deferString)) {
      deferList = JSON.parse(deferString);
    }
    deferList.push(options);
    scriptProperties.setProperty('deferSpamCast', JSON.stringify(deferList));
    logToProperty('spamCast', 'creating trigger for tryDeferredSpamCast');
    deleteFunctionTriggers('tryDeferredSpamCast');
    ScriptApp.newTrigger('tryDeferredSpamCast'
        ).timeBased().after(1000 * 60 * 15).create();
    selfMessage(
        SCRIPT_NAME + ': Deferring using skill ' + options.skillId + ' ' +
        options.times + ' times.',
        state);
  } else {
    spamCastTask({'castOptions': options}, state);
  }
}

function spamCastTask(args, state) {
  let startFrom = 0;
  if (state.startFrom != null) {
    startFrom = state.startFrom;
  }
  let i = null;
  for (i = startFrom; i < args.castOptions.times; ++i) {
    const api = 'user/class/cast/' +
        args.castOptions.skillId + '?targetId=' + args.castOptions.targetId;
    const params = {
      'method' : 'post',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
    }
    const response = habiticaApi(api, params);
    checkResponseRateLimit(response, state);
    Logger.log(JSON.stringify(response));
    if (response.code == 400) {
      selfMessage(
        SCRIPT_NAME + ': Out of Mana!  Used skill ' +
        args.castOptions.skillId + ' ' + i + ' of ' + args.castOptions.times +
        ' times.', state);
      break;
    }
    if (!response.success) {
      throw new Error('Unable to use skill: ' + response.error);
    }
    state.startFrom = i + 1;
  }
  if (i == args.castOptions.times) {
    selfMessage(
        SCRIPT_NAME + ': used skill ' + args.castOptions.skillId + ' ' +
        args.castOptions.times + ' times.', state);
  }
}

function tryCastDeferredTask(args, state) {
  let quest = state.fetched.party.quest;

  let scriptProperties = PropertiesService.getScriptProperties();
  let deferString = scriptProperties.getProperty('deferSpamCast');
  if (isFalse(deferString)) {
    Logger.log('No deferred skill to use');
    return;
  }
  let deferList = JSON.parse(deferString);
  if (isFalse(deferList)) {
    scriptProperties.deleteProperty('deferSpamCast');
    return;
  }

  let newDeferList = [];

  let errors = [];
  for (let options of deferList) {
    if ((options.waitForQuest && isFalse(quest.active)) ||
        (options.waitForLoginTime && isFalse(args.runningAtLoginTime))) {
      newDeferList.push(options);
    } else {
      try {
        spamCastTask({'castOptions': options}, state);
      } catch(e) {
        errors.push(e);
      }
    }
  }
  if (isTrue(newDeferList)) {
    scriptProperties.setProperty('deferSpamCast', JSON.stringify(newDeferList));
  } else {
    scriptProperties.deleteProperty('deferSpamCast');
  }
  if (isTrue(errors)) {
    throw errors[0];
  }
}

function tryDeferredSpamCast() {
  // TODO Make a version run at login time.
  runDeferredSpamCastTaskGroup(false);
}

