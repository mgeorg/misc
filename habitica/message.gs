// Send a private message.
function selfMessage(message, state) {
  return privateMessage(message, USER_ID, state);
}

function privateMessage(message, toUserId, state) {
  // Don't clear current messages.
  let group = new TaskGroup('privateMessageTaskGroup', false);
  group.addTask({
    'func': 'privateMessageTask',
    'args': {'message': message, 'toUserId': toUserId},
    });
  if (isTrue(state) && state.rateLimitRemaining != undefined) {
    if (isFalse(group.queue.state)) {
      group.queue.state = {};
    }
    group.queue.state.rateLimitRemaining = state.rateLimitRemaining;
    group.queue.state.rateLimitReset = state.rateLimitReset;
  }
  group.saveQueue();  // Save queue in case it's paused.
  return group.run();
}

function privateMessageTask(args, state) {
  checkRateLimit(state);
  const payload = {
    'message' : args.message,
    'toUserId' : args.toUserId,
  }
  
  const params = {
    'method' : 'post',
    'headers' : HEADERS,
    'contentType' : 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions' : true,
  }

  const api = 'members/send-private-message';
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to send private message to ' +
                    args.toUserId + ': ' + args.message);
  }
}

function deleteAllSelfMessagesTaskGroup() {
  // TODO Use the delete API which removes all messages from a sender.
  return deleteMessagesTaskGroup('');
}

function deleteScriptMessagesTaskGroup() {
  return deleteMessagesTaskGroup(SCRIPT_NAME);
}

function deleteMessagesTaskGroup(prefix) {
  let group = new TaskGroup('messagesTaskGroup', true);
  group.addTask({
    'func': 'findSelfMessagesTask',
    'args': {},
  });
  group.addTask({
    'func': 'findMessagesWithPrefixTask',
    'args': {'prefix': prefix},
  });
  group.addTask({
    'func': 'deleteMessagesTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to delete messages: '}
  });
  return group.run();
}

function findSelfMessagesTask(args, state) {
  checkRateLimit(state);
  let api = 'inbox/messages';
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  let response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch messages: ' + response.error);
  }
  let output = [];
  for (let i in response.data) {
    if (response.data[i].uuid == response.data[i].ownerId) {
      output.push(response.data[i]);
    }
  }
  state.messages = output;
}

function findMessagesWithPrefixTask(args, state) {
  let output = [];
  for (let i in state.messages) {
    if (state.messages[i].text.startsWith(args.prefix)) {
      output.push(state.messages[i]);
    }
  }
  state.messages = output;
}

function deleteMessagesTask(args, state) {
  checkRateLimit(state);
  let origApi = 'user/messages';
  while (isTrue(state.messages)) {
    const params = {
      'method' : 'delete',
      'headers' : HEADERS,
      'muteHttpExceptions' : true,
    }
    let api = origApi + '/' + state.messages[0].id;
    Logger.log('deleting message: ' + api);
    let response = habiticaApi(api, params);
    checkResponseRateLimit(response, state);
    if (isFalse(response.success)) {
      throw new Error('Unable to delete message: ' + response.error);
    }
    // Delete the message from the state, so it isn't deleted again if rerun.
    state.messages.shift();
  }
}

