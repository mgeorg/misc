function runAcceptQuestTaskGroup() {
  let group = new TaskGroup('acceptQuestTaskGroup', true);
  group.addTask({
    'func': 'fetchUserToStateTask',
    'args': {'userFields': 'party'},
  });
  group.addTask({
    'func': 'fetchPartyToStateTask',
    'args': {},
  });
  group.addTask({
    'func': 'acceptQuestIfPendingTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to accept quest: '}
  });
  return group.run();
}

function acceptQuest() {
  const params = {
    'method' : 'post', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party/quests/accept';
  return habiticaApi(api, params);
}

function acceptQuestIfPendingTask(args, state) {
  checkRateLimit(state);
  let quest = state.fetched.party.quest;
  let RSVPNeeded = state.fetched.user.party.quest.RSVPNeeded;
  if (quest.key && !quest.active && RSVPNeeded) {
    const response = acceptQuest();
    checkResponseRateLimit(response, state);
    if (!response.success) {
      throw new Error('Unable to accept quest: ' + response.error);
    }
  }
}

