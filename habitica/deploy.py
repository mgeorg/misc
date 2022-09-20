#!/usr/bin/env python3

import pathlib
import re

_DIR = pathlib.Path(__file__).resolve().parent
_VERSION = 'v0.1'.replace('.', '_')


def main():
  output = []
  for part_name in [
      # Setup
      'header.gs',
      'config.gs',
      'variables.gs',
      'do_setup.gs',
      # Utilities
      'user_functions.gs',
      'util.gs',
      'task_group.gs',
      'generic_tasks.gs',
      'locks.gs',
      'message.gs',
      'webhooks.gs',
      'trigger.gs',
      # Automation tasks.
      'quest_accept.gs',
      'multi_skill.gs',
      'quest_start.gs',
      'quest_invite.gs',
      'costume.gs',
      'bank.gs',
      # Debugging, maybe don't include in releases.
      'task_test.gs',
      'debug.gs',
  ]:
    path = _DIR.joinpath(part_name)
    with open(path, 'r') as f:
      output.extend(f.read().splitlines())

  secrets = []

  path = _DIR.joinpath(f'super_script_{_VERSION}.gs')
  with open(path, 'w') as f:
    f.write('\n'.join(output))

  path = _DIR.joinpath('personal.gs')
  if path.exists():
    with open(path, 'r') as f:
      secrets = f.read().splitlines()
  for secret in secrets:
    if not secret.strip():
      continue
    m = re.match(r'^([^=]*)(=.*)$', secret)
    assert m, secret
    prefix = m.group(1).strip()
    success = False
    for i, line in enumerate(output):
      m2 = re.match(r'^([^=]*)(=.*)$', line)
      if m2 and prefix == m2.group(1).strip():
        output[i] = secret
        success = True
        break
    assert success, secret

  path = _DIR.joinpath(f'personal_super_script_{_VERSION}.gs')
  with open(path, 'w') as f:
    f.write('\n'.join(output))


if __name__ == '__main__':
  main()
