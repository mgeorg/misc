// TaskGroup Utilities.
class PauseTaskGroupException extends Error {
  constructor(pauseNumMSec) {
    super('pausing execution of task group for ' + pauseNumMSec + 'ms.');
    this.name = 'PauseTaskGroupException';
  // The actual delay is on a granularity of about 1 minute, so
  // don't rely on fast resuming.  But the task group will
  // be paused for at least this amount of time.
    this.pauseNumMSec = pauseNumMSec;
  }
}

// The TaskGroup class.
class TaskGroup {
  constructor(queueKey, clear) {
    this.queueKey = queueKey;
    this.queue = {};
    this.queue.retry = 0;
    this.queue.state = {};

    if (!(this.triggerFunctionName() in GOOGLE_APP_SCRIPT_BASE_THIS)) {
      throw new Error(
        'to create a TaskGroup with key ' +
        this.queueKey +
        ' there must be a function which can restart it named "' +
        this.triggerFunctionName() + '".');
    }
    let scriptProperties = PropertiesService.getScriptProperties();
    if (isTrue(clear)) {
      scriptProperties.deleteProperty(
          TASK_GROUP_PROPERTY_PREFIX + this.queueKey);
    } else {
      let queueAsString = scriptProperties.getProperty(
          TASK_GROUP_PROPERTY_PREFIX + this.queueKey);
      if (isTrue(queueAsString)) {
        this.queue = JSON.parse(queueAsString);
      }
    }
  }

  saveQueue() {
    let scriptProperties = PropertiesService.getScriptProperties();
    if (isTrue(this.queue)) {
      scriptProperties.setProperty(
        TASK_GROUP_PROPERTY_PREFIX + this.queueKey,
        JSON.stringify(this.queue));
    } else {
      scriptProperties.deleteProperty(
          TASK_GROUP_PROPERTY_PREFIX + this.queueKey);
    }
  }

  addTask(task) {
    // A task is an object with the following properties defined.
    //
    // task.func = The string name of the function to call.  This function
    // must take two arguments, the first will be the args object,
    // the second the persistent state object.  Any modifications to
    // these two arguments are presistent across reruns, only objects
    // that can be serialized/deserialized by JSON.parse/JSON.stringify
    // are allowed.  The state object will have a field "retry" set to
    // the number of previous runs of the function that have occured.
    // If an exception of type PauseTaskGroupException is thrown then the
    // queue will be paused and restarted no sooner than the microseconds
    // argument given to PauseTaskGroupException (this uses the Google
    // Script Trigger mechanism, which has about a minute granularity).
    // If any other exception is thrown then the onError task will be
    // executued and the task group ended.
    //
    // task.args = An object which will be provided to func as its
    // first argument.
    if (task.args == undefined) {
      task.args = {};
    }
    if (isFalse(this.queue.tasks)) {
      this.queue.tasks = [task];
    } else {
      this.queue.tasks.push(task);
    }
  }

  setState(state) {
    this.queue.state = state;
  }

  setOnError(task) {
    // The third argument to the task will be the error that was thrown.
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onError = task;
  }

  setOnFinally(task) {
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onFinally = task;
  }

  setOnPause(task) {
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onPause = task;
  }

  setOnResume(task) {
    // onError task should not return PauseTaskGroupException (it will
    // not be restarted).
    this.queue.onResume = task;
  }

  triggerFunctionName() {
    return 'restartQueue_' + this.queueKey;
  }

  runTask(task, optionalError) {
    Logger.log('Running ' + JSON.stringify(task));
    if (this.queue.state == undefined) {
      this.queue.state = {};
    }
    if (task.args == undefined) {
      task.args = {};
    }
    this.queue.state.retry = this.queue.retry;
    if (isFalse(task.func) ||
        isFalse(task.func in GOOGLE_APP_SCRIPT_BASE_THIS)) {
      throw new TypeError('Unable to find task function: "' + task.func + '"');
    }
    if (optionalError instanceof Error) {
      GOOGLE_APP_SCRIPT_BASE_THIS[task.func](
          task.args, this.queue.state, optionalError);
    } else {
      GOOGLE_APP_SCRIPT_BASE_THIS[task.func](
          task.args, this.queue.state);
    }
  }

  resumeRun() {
    this.queue.paused = false;
    // TODO Handle errors thrown in onResume and onPause using onError.
    if (isTrue(this.queue.onResume)) {
      this.runTask(this.queue.onResume);
    }
    return this.run();
  }

  run() {
    if (isTrue(this.queue.paused)) {
      Logger.log('Not running queue, since a trigger is active on it.');
      return null;
    }
    Logger.log('running queue: ' + JSON.stringify(this.queue));
    if (this.queue.retry == undefined) {
      this.queue.retry = 0;
    }
    let errorOnError = null;
    let errorOnPause = null;
    while (isTrue(this.queue.tasks)) {
      let currentTask = this.queue.tasks.shift();
      try {
        this.runTask(currentTask);
        this.queue.retry = 0;
      } catch (e) {
        if (e instanceof PauseTaskGroupException) {
          this.queue.retry += 1;
          if (this.queue.retry < TASK_GROUP_MAX_NUM_TRIES) {
            this.queue.tasks.unshift(currentTask);
            this.queue.paused = true;
            if (isTrue(this.queue.onPause)) {
              try {
                this.runTask(this.queue.onPause);
              } catch(err) {
                errorOnPause = err;
              }
            }
            this.saveQueue();
            Logger.log('pausing for ' + e.pauseNumMSec +
                       'ms by creating newTrigger ' +
                       this.triggerFunctionName());
            if (isTrue(DEBUG_DISABLE_TRIGGERS)) {
              Logger.log(
                  'DEBUG_DISABLE_TRIGGERS is true!  Restart queue manually!');
            } else {
              ScriptApp.newTrigger(this.triggerFunctionName()
                  ).timeBased().after(e.pauseNumMSec).create();
            }
            if (errorOnPause instanceof Error) {
              throw errorOnPause;
            }
            return null;
          } else {
            e = new Error(
                'Maximum number of tries (' + TASK_GROUP_MAX_NUM_TRIES +
                ') reached.');
            // Fall down to calling onError.
          }
        }
        if (isTrue(this.queue.onError)) {
          try {
            this.runTask(this.queue.onError, e);
          } catch (err) {
            errorOnError = err;
          }
        } else {
          errorOnError = e;
        }
        // Clear the remaining queue.
        this.queue.tasks = {};
      }
    }
    if (isTrue(this.queue.onFinally)) {
      this.runTask(this.queue.onFinally);
    }
    let output = this.queue.state;
    this.queue = {};
    this.saveQueue();
    if (errorOnError instanceof Error) {
      throw errorOnError;
    }
    return output;
  }
}

// Hack to get restartQueue to work with different task groups.
function restartQueue_taskGroup1() {
  return restartQueue('taskGroup1');
}

function restartQueue_acceptQuestTaskGroup() {
  return restartQueue('acceptQuestTaskGroup');
}

function restartQueue_inviteQuestTaskGroup() {
  return restartQueue('inviteQuestTaskGroup');
}

// TODO remove references to "spam".
function restartQueue_spamCastTaskGroup() {
  return restartQueue('spamCastTaskGroup');
}

function restartQueue_privateMessageTaskGroup() {
  return restartQueue('privateMessageTaskGroup');
}

function restartQueue_createWebhookTaskGroup() {
  return restartQueue('createWebhookTaskGroup');
}

function restartQueue_messagesTaskGroup() {
  return restartQueue('messagesTaskGroup');
}

function restartQueue_saveCostumeTaskGroup() {
  return restartQueue('saveCostumeTaskGroup');
}

function restartQueue(queueKey) {
  let group = new TaskGroup(queueKey, false);
  return group.resumeRun();
}

