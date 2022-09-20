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
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message':
             'Failed to load Costume from slot "' + saveName + '": '}
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
    'args': {'error_message':
             'Failed to save Costume to slot "' + saveName + '": '}
  });
  group.setOnFinally({
    'func': 'unlockTask',
    'args': {'lockKey': 'costume'},
  });
  return group.run();
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
  // TODO Add selfMessage()
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
  if (isFalse(state.loadCostumeRewardId)) {
    state.loadCostumeRewardId = {};
  }
  if (isFalse(state.loadCostumeRewardIndex)) {
    state.loadCostumeRewardIndex = {};
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

