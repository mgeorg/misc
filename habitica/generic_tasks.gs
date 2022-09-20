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

