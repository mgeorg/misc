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
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const webhookType = data.webhookType;

  logToProperty('doPost', data);
  if (webhookType == 'taskActivity') {
    const taskText = data.task.text;
    const taskNotes = data.task.notes;
    
    if (ENABLE_SKILL_MULTI_CAST && data.type == 'scored') {
      if (taskText == SKILL_MULTI_CAST_STRING) {
        logToProperty('doPost', 'running skill multi-cast');
        runSpamCastTaskGroup(Number(taskNotes), false);
      }
    }
  }
  if (webhookType == 'questActivity') {
    if (isTrue(ENABLE_QUEST_AUTO_INVITE) && data.type == 'questFinished') {
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

