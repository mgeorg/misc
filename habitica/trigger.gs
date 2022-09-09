function findFunctionTrigger(functionName) {
  // Return the first trigger which will call functionName.
  const triggers = ScriptApp.getProjectTriggers();

  for (let i in triggers) {
    if (triggers[i].getHandlerFunction() == functionName) {
      return triggers[i];
    }
  }
  return null;
}

function deleteFunctionTriggers(functionName) {
  // Delete triggers to functionName to avoid reaching the maximum number
  // of triggers
  const triggers = ScriptApp.getProjectTriggers();

  for (let i in triggers) {
    if (triggers[i].getHandlerFunction() == functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i in triggers) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

