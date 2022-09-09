function lockTask(args, state) {
  if (isFalse(acquireLock(args.lockKey))) {
    // TODO Exponential backoff
    throw new PauseTaskGroupException(1000 * 60);
  }
  let propertyName = LOCK_PROPERTY_PREFIX + args.lockKey;
  if (isFalse(state.locks)) {
    state.locks = {};
  }
  state.locks[propertyName] = true;
}

function abortIfLockedTask(args, state) {
  if (isFalse(acquireLock(args.lockKey))) {
    throw new Error(args.message);
  }
  releaseLock(args.lockKey);
}

function acquireLock(lockKey) {
  let propertyName = LOCK_PROPERTY_PREFIX + lockKey;
  const scriptProperties = PropertiesService.getScriptProperties();
  let currentState = scriptProperties.getProperty(propertyName);
  if (currentState == 'locked') {
    return false;
  }
  scriptProperties.setProperty(propertyName, 'locked');
  return true;
}

function unlockTask(args, state) {
  releaseLock(args.lockKey);
  if (isTrue(state.locks)) {
    let propertyName = LOCK_PROPERTY_PREFIX + args.lockKey;
    delete state.locks[propertyName];
  }
}

function releaseLock(lockKey) {
  let propertyName = LOCK_PROPERTY_PREFIX + lockKey;
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty(propertyName);
}

