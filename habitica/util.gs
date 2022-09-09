// Utility Functions

function isFalse(elem) {
  // Provides a python like truth value where
  // empty objects and lists are false.
  if (elem instanceof Object) {
    return Object.keys(elem).length == 0;
  } else {
    return !Boolean(elem);
  }
}

function isTrue(elem) {
  return !isFalse(elem);
}

function reportError(message, state) {
  if (LOG_ON_FAILURE) {
    logToProperty('reportError', message);
  }
  if (MESSAGE_ON_FAILURE) {
    if (isTrue(state)) {
      privateMessage(SCRIPT_NAME + ' failure: ' + message, USER_ID, state);
    }
  }
}

function logToProperty(property, obj) {
  // TODO Put a limit on how many logs are kept.
  Logger.log(LOG_PROPERTY_PREFIX + property + ': ' + JSON.stringify(obj));
  let scriptProperties = PropertiesService.getScriptProperties();
  let logString = scriptProperties.getProperty(LOG_PROPERTY_PREFIX + property);
  let log = [];
  if(isTrue(logString)) {
    log = JSON.parse(logString);
  }
  log.unshift({'time': new Date(), 'obj': obj});
  scriptProperties.setProperty(
      LOG_PROPERTY_PREFIX + property, JSON.stringify(log));
}

function testReportError() {
  reportError({'a': 'blah \'this\' is a test.', 'b': 10})
}

function habiticaApi(api, params) {
  const url = 'https://habitica.com/api/v3/' + api;
  if (isTrue(DEBUG_LOG_API_CALLS)) {
    Logger.log(url);
  }
  return parseResponse(UrlFetchApp.fetch(url, params));
}

function parseResponse(response) {
  if (isFalse(response)) {
    return {
      'success': false,
      'error': 'no response',
      'code': null,
      'headers': {}
    };
  }
  let code = response.getResponseCode();
  if (isTrue(DEBUG_LOG_RESPONSE)) {
    Logger.log(response);
  }
  let parsed = JSON.parse(response);
  if (code < 200 || code >= 300) {
    return {
      'success': false,
      'error': 'response code (' + String(code) + ') received (' +
               parsed.error + '): ' + parsed.message,
      'code': code,
      'headers': response.getAllHeaders()
    };
  }
  if (isFalse(parsed.success)) {
    return {
      'success': false,
      'error': 'error received (' + parsed.error + '): ' + parsed.message,
      'code': code,
      'headers': response.getAllHeaders()
    };
  }
  return {
    'success': true,
    'data': parsed.data,
    'code': code,
    'headers': response.getAllHeaders()
  };
}

function checkRateLimit(state) {
  if (state.rateLimitRemaining != undefined && state.rateLimitRemaining == 0) {
    const waitUntil = new Date(state.rateLimitReset);
    const now = new Date();
    if (waitUntil > now) {
      throw new PauseTaskGroupException(waitUntil - now);
    }
  }
}

function checkResponseRateLimit(response, state) {
  if(isTrue(response.headers)) {
    let value1 = response.headers['x-ratelimit-remaining'];
    if (value1 != undefined) {
      state.rateLimitRemaining = Number(value1);
    }
    let value2 = response.headers['x-ratelimit-reset'];
    if (value2 != undefined) {
      state.rateLimitReset = value2;
    }
    if (value1 != undefined && value2 != undefined) {
      Logger.log('found rate limit parameters of ' + state.rateLimitRemaining +
                 ' and reset at ' + state.rateLimitReset);
    }
  }
  if(response.code == 429) {
    const waitUntil = new Date(state.rateLimitReset);
    const now = new Date();
    throw new PauseTaskGroupException(Math.max(0, waitUntil - now));
  }
}

function deleteAllPropertiesWithPrefix(prefix) {
  let scriptProperties = PropertiesService.getScriptProperties();
  let properties = scriptProperties.getProperties();
  for (let key in properties) {
    if (key.startsWith(prefix)) {
      scriptProperties.deleteProperty(key);
    }
  }
}

function logErrorTask(args, state, error) {
  Logger.log(
    'logErrorTask(' +
    JSON.stringify(args) + ', ' +
    JSON.stringify(state) + ', ' +
    error.constructor.name + ' with message ' +
    JSON.stringify(error.message) + ');');
}

function throwErrorTask(args, state, error) {
  Logger.log(
    'throwErrorTask(' +
    JSON.stringify(args) + ', ' +
    JSON.stringify(state) + ', ' +
    error.constructor.name + ' with message ' +
    JSON.stringify(error.message) + ');');
  throw error;
}

function reportErrorTask(args, state, error) {
  let prefix = '';
  if (isTrue(args.error_message)) {
    prefix = args.error_message;
  }
  reportError(prefix + JSON.stringify(error.message), state);
}

function logFinallyTask(args, state) {
  Logger.log(
    'logFinallyTask(' +
    JSON.stringify(args) + ', ' +
    JSON.stringify(state) + ');');
  return;
}

