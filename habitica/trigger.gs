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

function createLoginTimeTriggerTask(args, state) {
  let dayStart = state.fetched.user.preferences.dayStart;
  let timezoneOffset = state.fetched.user.preferences.timezoneOffset;
  let utc_minute_in_day = Number(dayStart) * 60 + timezoneOffset - 16;
  // Triggers don't run precisely on the minute (15min + or -) so set it
  // 16 minutes before.
  let utc_hour = Math.floor(utc_minute_in_day / 60);
  let utc_minute = utc_minute_in_day % 60;
  Logger.log('Creating doLoginTime trigger at UTC ' +
             String(utc_hour) + ':' + String(utc_minute));
  deleteFunctionTriggers('doLoginTime');
  ScriptApp.newTrigger(
      'doLoginTime').timeBased().inTimezone(
          'UTC').atHour(utc_hour).nearMinute(utc_minute).everyDays(1).create();
}

function createLoginTimeTriggerTaskGroup() {
  let group = new TaskGroup('loginTimeTaskGroup', true);
  group.addTask({
    'func': 'fetchUserToStateTask',
    'args': {'userFields': 'preferences'},
  });
  group.addTask({
    'func': 'createLoginTimeTriggerTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': ''}
  });
  return group.run();
}

