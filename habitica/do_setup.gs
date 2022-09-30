function doSetup() {
  deleteAllTriggers();
  deleteAllPropertiesWithPrefix(TASK_GROUP_PROPERTY_PREFIX);
  deleteAllPropertiesWithPrefix(LOCK_PROPERTY_PREFIX);

  createWebhooks(true);
  if (ENABLE_QUEST_AUTO_START) {
    ScriptApp.newTrigger(
        'checkStartQuest').timeBased().everyMinutes(15).create();
  }
  if (ENABLE_QUEST_AUTO_ACCEPT) {
    // Use a trigger to accept quests where we were not notified with
    // an invitation (shouldn't really happen).
    ScriptApp.newTrigger(
        'runAcceptQuestTaskGroup').timeBased().everyHours(1).create();
  }
  resetQuestIndex();

  if (ENABLE_BANK) {
    ensureBankRewardExists();
  }

  createLoginTimeTriggerTaskGroup();
}

function doPost(e) {
  logToProperty('doPost', e.postData.contents);
  const data = JSON.parse(e.postData.contents);
  const webhookType = data.webhookType;

  if (webhookType == 'taskActivity') {
    if (data.type == 'scored') {
      if (data.task.text == SKILL_MULTI_CAST_STRING) {
        logToProperty('doPost', 'running skill multi-cast');
        runSpamCastTaskGroup(data.task.notes);
      }
      if (data.task.type == 'reward') {
        let m = BANK_REWARD_REGEX.exec(data.task.text);
        if (isTrue(m)) {
          scoreBankReward(data.task);
        }
      }
    }
  }
  if (webhookType == 'questActivity') {
    if (isTrue(ENABLE_QUEST_AUTO_INVITE) && data.type == 'questFinished') {
      // TODO data.quest.questOwner is not sent for questFinished.
      // Log it to a property when it is available, or get it some other
      // way.
      if (data.quest.questOwner ==
          '590aaa0b-b667-4e94-870c-f74fe403d44a' /*Jay*/) {
        inviteNextQuest();
      }
    }
    if (isTrue(ENABLE_QUEST_AUTO_ACCEPT) && data.type == 'questInvited') {
      const response = acceptQuest();
      if (!response.success) {
        reportFailure('Unable to accept quest: ' + response.error);
      }
    }
    if (data.type == 'questStarted') {
      tryDeferredSpamCast();
    }
  }

  return HtmlService.createHtmlOutput();
}

function doLoginTime() {
  logToProperty('doLoginTime', 'Running doLoginTime()');
  tryDeferredSpamCastAtLoginTime();
}

function createWebhooks(deleteWebhooks) {
  options_list = [
    {
      'label': SCRIPT_NAME + ': questActivity Webhook',
      'options': {
        'questStarted': true,
        'questFinished': true,
        'questInvited': true,
      },
      'webhookType': 'questActivity',
      'enabled': true,
    },
    {
      'label': SCRIPT_NAME + ': taskActivity Webhook',
      'options': {
        'scored': true,
      },
      'webhookType': 'taskActivity',
      'enabled': true,
    },
  ];
  runCreateWebhookTaskGroup(deleteWebhooks, options_list);
}

