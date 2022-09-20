
function testDepositInBank() {
  findAndDepositInBank(100);
}

function ensureBankRewardExists() {
  let group = new TaskGroup('bankTaskGroup', true);
  group.addTask({
    'func': 'findBankRewardTask',
    'args': {},
  });
  group.addTask({
    'func': 'ensureBankRewardTask',
    'args': {},
  });
  group.setOnError({
    'func': 'reportErrorTask',  // TODO change to reportErrorTask
    'args': {'error_message': 'Failed to create bank reward task: '}
  });
  return group.run();
}

function findAndDepositInBank(amount) {
  let group = new TaskGroup('bankTaskGroup', true);
  group.addTask({
    'func': 'findBankRewardTask',
    'args': {},
  });
  group.addTask({
    'func': 'ensureBankRewardTask',
    'args': {},
  });
  group.addTask({
    'func': 'depositBankRewardTask',
    'args': {'deposit': amount},
  });
  group.setOnError({
    'func': 'throwErrorTask',  // TODO change to reportErrorTask
    'args': {'error_message': 'Failed to deposit in bank: '}
  });
  return group.run();
}

function scoreBankReward(bankReward) {
  let group = new TaskGroup('bankTaskGroup', true);
  group.addTask({
    'func': 'scoreBankRewardTask',
    'args': {'bankReward': bankReward},
  });
  group.setOnError({
    'func': 'throwErrorTask',  // TODO change to reportErrorTask
    'args': {'error_message': 'Failed to deposit in bank: '}
  });
  return group.run();
}

function findBankRewardTask(args, state) {
  fetchRewardsToStateTask(args, state);
  delete state.bankRewardIndex;
  for (let i in state.fetched.rewards) {
    let reward = state.fetched.rewards[i];
    let m = BANK_REWARD_REGEX.exec(reward.text);
    if (isTrue(m)) {
      if (state.bankRewardIndex != undefined) {
        throw new Error(
            'Found more than one bank reward task (at index ' +
            state.bankRewardIndex + ' and index ' + i +
            '), delete one of them.');
      }
      state.bankRewardIndex = i;
    }
  }
}

function ensureBankRewardTask(args, state) {
  if (state.bankRewardIndex != undefined) {
    // Nothing to update.
    Logger.log('Already have a bank Reward');
    return;
  }
  checkRateLimit(state);
  const payload = {
    'type': 'reward',
    'text': BANK_REWARD_STRING,
    'notes': writeNotesOptions({
        'bankBalance': 0,
    }, ['bankBalance']),
    'value': 1000,
  }

  const params = {
    'method': 'post',
    'headers': HEADERS,
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
  }
  const api = 'tasks/user';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    Logger.log(JSON.stringify(response, null, 2));
    throw new Error('Unable to create Bank Reward task.');
  }

  // Load the bank reward tasks now that we created it.
  findBankRewardTask({}, state);
}

function depositBankRewardTask(args, state) {
  if (state.bankRewardIndex == undefined) {
    throw new Error('Could not find Bank Reward task.');
  }
  let bankReward = state.fetched.rewards[state.bankRewardIndex];
  if (isFalse(bankReward)) {
    throw new Error('Could not find Bank Reward task.');
  }

  let bank = parseNotesOptions(bankReward.notes);
  let bankBalance = Number(lowerKeyLookupOrDefault(
      'bankBalance', bank, 0)) + Number(args.deposit);
  updateBankReward(bankReward.id, bankBalance, bankReward.value, state);
}

function scoreBankRewardTask(args, state) {
  let bankReward = args.bankReward;
  if (isFalse(bankReward)) {
    throw new Error('Could not find Bank Reward task.');
  }
  let bank = parseNotesOptions(bankReward.notes);
  let bankBalance = Number(lowerKeyLookupOrDefault(
      'bankBalance', bank, 0)) + Number(bankReward.value);
  updateBankReward(bankReward.id, bankBalance, bankReward.value, state);
}

function updateBankReward(bankRewardId, bankBalance, depositAmount, state) {
  checkRateLimit(state);
  const payload = {
    'type': 'reward',
    'text': BANK_REWARD_STRING,
    'notes': writeNotesOptions({
        'bankBalance': String(bankBalance),
    }, ['bankBalance']),
    'value': Number(depositAmount),
  }

  const params = {
    'method': 'put',
    'headers': HEADERS,
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
  }
  const api = 'tasks/' + bankRewardId;

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    Logger.log(JSON.stringify(response, null, 2));
    throw new Error('Unable to update Bank Reward task.');
  }
}

// No way to withdraw from the Bank.  Have them do it through fix character
// values.

