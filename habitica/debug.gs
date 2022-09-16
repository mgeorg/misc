function exploreStateTask(args, state) {
  let varPath = args.explore.split('.');
  let explore = state;
  for (let varPathPart of varPath) {
    explore = explore[varPathPart];
    if (explore == undefined) {
      Logger.log(
          varPathPart + ' of ' + args.explore + ' does not exist in state');
      return;
    }
  }
  for (let key of Object.keys(explore).sort()) {
    Logger.log(args.explore + '.' + key + ': ' + JSON.stringify(explore[key]));
  }
}

function testSpamCastTaskGroup() {
  runSpamCastTaskGroup(2, false);
}

function testSaveCostume() {
  return runSaveCostumeTaskGroup('test');
}

function testLoadCostume() {
  runLoadCostumeTaskGroup('test');
}

function testMessages() {
  for (let i = 0; i < 40; ++i) {
    selfMessage(SCRIPT_NAME + ': test message ' + (i+1));
  }
}

