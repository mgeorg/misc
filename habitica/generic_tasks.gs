function fetchUserToStateTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  let api = 'user';

  if (isTrue(args.userFields)) {
    api += '?userFields=' + args.userFields;
  }

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to fetch user: ' + response.error);
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  state.fetched.user = response.data;
}

function fetchPartyToStateTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api = 'groups/party';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to fetch party: ' + response.error);
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  state.fetched.party = response.data;
}

function fetchContentToStateTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  let api = 'content?language=en';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to fetch user: ' + response.error);
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  state.fetched.content = response.data;
}

function fetchRewardsToStateTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  let api = 'tasks/user?type=rewards';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (!response.success) {
    Logger.log(JSON.stringify(response));
    throw new Error('Unable to fetch reward tasks: ' + response.error);
  }
  if (isFalse(state.fetched)) {
    state.fetched = {};
  }
  state.fetched.rewards = response.data;
}

function getMember() {
  const params = {
    'method' : 'get', 
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  };
  
  const api = 'members/' + USER_ID;
  const response = habiticaApi(api, params);
  let explore = response.data;
  for (let key in explore) {
    Logger.log(key +': ' + JSON.stringify(explore[key]));
  }
  return null;
}

function getRSVPNeeded() {
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api =
      'groups/party/members?includeAllPublicFields=true&includeTasks=false';

  const response = habiticaApi(api, params);
  if (!response.success) {
    reportError('Unable to fetch party member information: ' + response.error);
    return;
  }
  let RSVPNeeded = {};
  for (let i in response.data) {
    rsvp[response.data[i].id] = response.data[i].party.quest.RSVPNeeded;
  }
  Logger.log(RSVPNeeded);
  return RSVPNeeded;
}

function getMemberInfoTask(args, state) {
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  }
  const api =
      'groups/party/members?includeAllPublicFields=true&includeTasks=false';

  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch party member information: ' +
                    response.error);
  }
  let memberInfoById = {};
  let memberInfoByName = {};
  const now = new Date().getTime();
  for (let i in response.data) {
    let member = response.data[i];
    if (i == 0) {
      for (key in member) {
        Logger.log(key + ': ' + JSON.stringify(member[key], null, 2));
      }
    }
    let active = false;
    let timeSinceUpdated =
        now - new Date(member.auth.timestamps.updated).getTime();
    if (timeSinceUpdated / MILLIS_IN_DAY < NUM_DAYS_UNTIL_INACTIVE) {
      active = true;
    } else {
      active = false;
    }
    memberInfo = {
      'id': member.id,
      'username': member.auth.local.username,
      'profileName': member.profile.name,  // Lower case this.
      'active': active,
      'RSVPNeeded': member.party.quest.RSVPNeeded,
    }
    memberInfoById[memberInfo.id] = memberInfo;
    memberInfoByName[memberInfo.username] = memberInfo;
  }
  state.memberInfoById = memberInfoById;
  state.memberInfoByName = memberInfoByName;
}

function getQuestMembersTask(args, state) {
  // If a quest is invited but not started and I might want to start it,
  // then return the members that are currently on it, otherwise null.
  checkRateLimit(state);
  const params = {
    'method' : 'get',
    'headers' : HEADERS,
    'muteHttpExceptions' : true,
  };

  state.questMembers = null;

  const api = 'groups/party';
  const response = habiticaApi(api, params);
  checkResponseRateLimit(response, state);
  if (isFalse(response.success)) {
    throw new Error('Unable to fetch party info: ' + response.error);
  }
  let data = response.data;
  if (START_ONLY_MY_QUESTS && data.quest.leader != USER_ID) {
    return;
  }
  if (data.quest.key && !data.quest.active) {
    state.questMembers = data.quest.members;
    return;
  }
}

