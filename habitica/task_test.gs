// Test task group code.
function createTaskGroup1() {
  let group = new TaskGroup('taskGroup1', true);
  group.addTask({
    'func': 'taskA',
    'args': {'a': 2},
    });
  group.addTask({
    'func': 'taskC',
    'args': {'a': 10, 'succeedOnThisTry': 2},
    });
  group.addTask({
    'func': 'taskA',
    'args': {'a': 3},
    });
  group.setState({'b': 100});
  group.setOnError({'func': 'logErrorTask', 'args': {'message': 'hello'}})
  group.setOnFinally({'func': 'logFinallyTask', 'args': {'blah': 1}})
  return group.run();
}

function taskA(args, state) {
  Logger.log('taskA(' + JSON.stringify(args) + ', ' +
             JSON.stringify(state) + ');');

  let multiplier = 1;
  if(isTrue(state.b)) {
    multiplier = state.b;
  }
  Logger.log('args.a: ' + JSON.stringify(args.a));
  Logger.log('state.b: ' + JSON.stringify(state.b));
  let output = args.a * multiplier;
  Logger.log('output: ' + JSON.stringify(output));
  state.b = output;
}

function taskB(args, state) {
  Logger.log('taskB(' + JSON.stringify(args) + ', ' +
             JSON.stringify(state) + ');');
  throw new Error('taskB error!');
}

function taskC(args, state) {
  Logger.log('taskC(' + JSON.stringify(args) + ', ' +
             JSON.stringify(state) + ');');
  state.addedItem = state.retry;
  if (state.retry + 1 >= args.succeedOnThisTry) {
    state.finished = true;
    return;
  }
  throw new PauseTaskGroupException(100);
}

