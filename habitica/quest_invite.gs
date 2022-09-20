function inviteNextQuest() {
  let scriptProperties = PropertiesService.getScriptProperties();
  let questIndex = scriptProperties.getProperty('questIndex');
  if (questIndex == null) {
    questIndex = 0;
  } else {
    questIndex = Number(questIndex);
  }
  let quest = questQueue[questIndex];
  if (quest != undefined) {
    runInviteQuestTaskGroup(quest);
  }
}

function runUpdateQuestQueue() {
  let group = new TaskGroup('questQueueTaskGroup', true);
  group.addTask({
    'func': 'findQuestQueueRewardTask',
    'args': {},
  });
  group.addTask({
    'func': 'updateQuestQueueRewardTask',
    'args': {},
  });
  // Create a new Quest Queue Summary.
  // Delete old quest queue summary (if any exist).
  group.addTask({
    'func': 'findSelfMessagesTask',
    'args': {},
  });
  group.addTask({
    'func': 'findMessagesWithPrefixTask',
    'args': {'prefix': QUEST_INVITE_QUEUE_STRING},
  });
  group.addTask({
    'func': 'deleteMessagesTask',
    'args': {},
  });
  // Send Quest Queue Summary Message.
  group.addTask({
    'func': 'fetchContentToStateTask',
    'args': {},
  });
  group.addTask({
    'func': 'fetchUserToStateTask',
    'args': {'userFields': 'achievements.quests,items.quests'},
  });
  group.addTask({
    'func': 'sendQuestQueueSummaryTask',
    'args': {},
  });
  group.setOnError({
    'func': 'throwErrorTask',  // TODO change to reportErrorTask.
    'args': {'error_message': 'Failed to find quest Queue: '}
  });
  return group.run();
}

function runInviteQuestTaskGroup(questKey) {
  let group = new TaskGroup('inviteQuestTaskGroup', true);
  group.addTask({
    'func': 'inviteQuestTask',
    'args': {'questKey': questKey},
  });
  group.addTask({
    'func': 'incrementQuestIndexTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',
    'args': {'error_message': 'Failed to invite quest: '}
  });
  return group.run();
}

function inviteQuestTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'post', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party/quests/invite/' + args.questKey;
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to invite quest: ' + response.error);
  }
}

function incrementQuestIndexTask(args, state) {
  let questIndex = Number(scriptProperties.getProperty('questIndex'));
  questIndex += 1;
  scriptProperties.setProperty('questIndex', String(questIndex));
}

function resetQuestIndex() {
  let scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty('questIndex');
}

function findQuestQueueRewardTask(args, state) {
  fetchRewardsToStateTask(args, state);
  delete state.questQueueRewardIndex
  for (let i in state.fetched.rewards) {
    let reward = state.fetched.rewards[i];
    let m = QUEST_QUEUE_REWARD_REGEX.exec(reward.text);
    if (isTrue(m)) {
      if (state.questQueueRewardIndex != undefined) {
        throw new Error(
            'Found more than one quest reward task (at index ' +
            state.questQueueRewardIndex + ' and index ' + i +
            '), delete one of them.');
      }
      state.questQueueRewardIndex = i;
    }
  }
}

function updateQuestQueueRewardTask(args, state) {
  // TODO Actually have a queue which we parse.
  const payload = {
    'type': 'reward',
    'text': QUEST_QUEUE_REWARD_STRING,
    'notes': writeNotesOptions({
        'after': 'anyone',
        'queue': '',
    }, ['after', 'queue']),
    'value': 0,
  }
  const params = {
    'method': 'post',
    'headers': HEADERS,
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
  }
  let api = 'tasks/user';

  if (state.questQueueRewardIndex != undefined) {
    let reward = state.fetched.rewards[state.questQueueRewardIndex];
    if (reward.notes == payload.notes) {
      Logger.log('Current quest queue reward is up to date.');
      return;
    }
    // Update the reward instead of creating a new one.
    params.method = 'put';
    api = 'tasks/' + reward.id;
  }

  checkRateLimit(state);
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    Logger.log(JSON.stringify(response, null, 2));
    throw new Error('Unable to create Quest Queue Reward task.');
  }

  // Load the reward tasks now that we created it.
  findQuestQueueRewardTask({}, state);
}

function findQuestQueueTask(args, state) {
  findSelfMessagesTask({}, state);
  delete state.questQueueMessageIndex;
  delete state.questQueueMessage;
  for (let i in state.messages) {
    if (state.messages[i].text.startsWith(QUEST_INVITE_QUEUE_STRING)) {
      if (state.questQueueMessageIndex != undefined) {
        Logger.log('found more than one quest queue message, ' +
                   'ignoring later ones.');
      } else {
        state.questQueueMessageIndex = i;
        state.questQueueMessage = state.messages[i];
      }
    }
  }
  Logger.log('questQueueMessage: ' +
             JSON.stringify(state.questQueueMessage, null, 2));
}

function sendQuestQueueSummaryTask(args, state) {
  if (isFalse(state.fetched) ||
      isFalse(state.fetched.content) ||
      isFalse(state.fetched.content.quests) ||
      isFalse(state.fetched.user) ||
      isFalse(state.fetched.user.achievements) ||
      isFalse(state.fetched.user.achievements.quests) ||
      isFalse(state.fetched.user.items) ||
      isFalse(state.fetched.user.items.quests)) {
    throw new Error(
        'Quest Content and user fields must be fetched before ' +
        'sendQuestQueueSummaryTask runs.');
  }
  // TODO Add in the titles of the quests.
  let questsHaveAndNotCompleted = [];
  let questsHaveAndCompleted = [];
  let questsNotHaveAndNotCompleted = [];
  let questsNotHaveAndCompleted = [];
  let questsCurrentQueue = [];

  for (let key of Object.keys(state.fetched.content.quests).sort()) {
    let purchased = state.fetched.user.items.quests[key];
    if (purchased == undefined) {
      purchased = 0;
    }
    let completed = state.fetched.user.achievements.quests[key];
    if (completed == undefined) {
      completed = 0;
    }
    if (purchased > 0) {
      if (completed > 0) {
        questsHaveAndCompleted.push(key);
      } else {
        questsHaveAndNotCompleted.push(key);
      }
    } else {
      if (completed > 0) {
        questsNotHaveAndCompleted.push(key);
      } else {
        questsNotHaveAndNotCompleted.push(key);
      }
    }
  }
  // TODO Add in who you go after.
  let output = 
      QUEST_INVITE_QUEUE_STRING + '\n\n' +
      'queue:\n\n<copy this message>\n\n' + 
      '<and replace these lines>\n\n' +
      '<with the quests you want to complete>\n\n' + 
      'Quests you have and have not yet completed once:\n\n' +
      questsHaveAndNotCompleted.join('\n\n') + '\n\n' +
      'Quests you don\'t have and have not yet completed at least once:\n\n' +
      questsNotHaveAndNotCompleted.join('\n\n') + '\n\n' +
      'Quests you have and have already completed at least once:\n\n' +
      questsHaveAndCompleted.join('\n\n') + '\n\n' +
      'Quests you don\'t have and have already completed at least once:\n\n' +
      questsNotHaveAndCompleted.join('\n\n') + '\n\n';

  // Send the private message within the same TaskGroup.
  privateMessageTask({'message': output, 'toUserId': USER_ID}, state);
}

