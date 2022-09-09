function runCreateWebhookTaskGroup(deleteWebhooks, optionsList) {
  let group = new TaskGroup('createWebhookTaskGroup', true);
  if (isTrue(deleteWebhooks)) {
    group.addTask({
      'func': 'findWebhooksWithPrefixTask',
      'args': {'labelPrefix': SCRIPT_NAME + ':'},
    });
    group.addTask({
      'func': 'deleteWebhookTask',
      'args': {},
    });
  }
  group.addTask({
    'func': 'findWebhooksWithPrefixTask',
    'args': {'labelPrefix': ''},
  });
  for (let options of optionsList) {
    Logger.log(JSON.stringify(options));
    group.addTask({
      'func': 'createWebhookTask',
      'args': {
        'label': options.label,
        'webhookType': options.webhookType,
        'options': options.options,
        'enabled': options.enabled},
    });
  }
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to setup webhook: '}
  });
  return group.run();
}

function findWebhookTask(args, state) {
  checkRateLimit(state);
  state.webhookId = null;
  // Fetch the current webhooks to see if we already created one.
  const api = 'user/webhook';
  const params = {
      'method' : 'get',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
  };
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch webhooks: ' + response.error);
  }
  // Search through existing webhooks to see if any match our label.
  for (let i in response.data) {
    let webhook = response.data[i];
    if (webhook.label == args.label) {
      state.webhookId = webhook.id;
      break;
    }
  }
}

function createWebhookTask(args, state) {
  checkRateLimit(state);
  let api = 'user/webhook';
  let payload = {
    'url' : WEB_APP_URL,
    'label' : args.label,
    'type' : args.webhookType,
    'enabled': isTrue(args.enabled),
  }
  if (isTrue(args.options)) {
    payload['options'] = args.options;
  }
  let method = 'post';

  if (isTrue(state.webhookId)) {
    Logger.log('modify existing webhook with id ' + state.webhookId);
    api = api + '/' + state.webhookId;
    method = 'put';
  } else {
    Logger.log('create new webhook.');
  }

  const params = {
    'method' : method,
    'headers' : HEADERS,
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions' : true,
  }

  let response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to create webhook: ' + response.error);
  }
}

function runDeleteWebhookTaskGroup() {
  let group = new TaskGroup('createWebhookTaskGroup', true);
  group.addTask({
    'func': 'findWebhooksWithPrefixTask',
    'args': {'labelPrefix': SCRIPT_NAME + ':'},
  });
  group.addTask({
    'func': 'deleteWebhookTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to delete webhooks: '}
  });
  return group.run();
}

function findWebhooksWithPrefixTask(args, state) {
  checkRateLimit(state);
  state.webhookIds = null;
  // Fetch the current webhooks to see if we already
  // created one.
  const api = 'user/webhook';
  const params = {
      'method' : 'get',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
  };
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch webhooks: ' + response.error);
  }
  // Search through existing webhooks to see if any match our label.
  for (let i in response.data) {
    let webhook = response.data[i];
    if (webhook.label.startsWith(args.labelPrefix)) {
      if (isFalse(state.webhookIds)) {
        state.webhookIds = {};
      }
      state.webhookIds[webhook.id] = webhook.label;
    }
  }
}

function deleteWebhookTask(args, state) {
  checkRateLimit(state);
  let origApi = 'user/webhook';
  if (isFalse(state.webhookIds)) {
    return;
  }
  let webhookIds = Object.keys(state.webhookIds);
  for (let webhookId of webhookIds) {
    const params = {
      'method' : 'delete',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
    }
    let api = origApi + '/' + webhookId;
    let response = habiticaApi(api, params);
    checkResponseRateLimit(response, state);
    if (isFalse(response.success)) {
      throw new Error('Unable to delete webhook: ' + response.error);
    }
    // Delete the deleted webhook from the state, so it isn't deleted again
    // if rerun.
    delete state.webhookIds[webhookId];
  }
}

