#!/usr/bin/python3

import calendar
import datetime
import json
import sys

if __name__ == '__main__':
  days_per_month = [
    ('Jan', 31),
    ('Feb', 29),
    ('Mar', 31),
    ('Apr', 30),
    ('May', 31),
    ('Jun', 30),
    ('Jul', 31),
    ('Aug', 31),
    ('Sep', 30),
    ('Oct', 31),
    ('Nov', 30),
    ('Dec', 31),
  ]

  suffix = ''
  # context = calendar.BoardContext({'solve_for_all': False, 'use_line': None})
  # suffix = '_cross'

  with open(f'all_solutions{suffix}.json', 'r') as f_all_json:
    all_solutions = json.loads(f_all_json.read())

  contexts = list()
  dates = list()
  for month, max_days in days_per_month:
    for day in range(1, max_days+1):
      d = all_solutions[str((month, day))]
      context = calendar.BoardContext(options={}, pieces=all_solutions['pieces'])
      context.SetSolved(d)
      contexts.append(context)
      dates.append((month, day))

  dp_scores = list()
  prev_context = None
  for context in contexts:
    new_scores = [(None, None) for i in range(len(context.solved))]
    if prev_context is None:
      new_scores = [(None, 0) for i in range(len(context.solved))]
      dp_scores.append(new_scores)
      prev_context = context
      continue
    for prev_index, prev_board in enumerate(prev_context.solved):
      for cur_index, cur_board in enumerate(context.solved):
        num_unmatched = 0
        for piece_index in range(len(prev_board.used)):
          if prev_board.used[piece_index] != cur_board.used[piece_index]:
            num_unmatched += 1
        if num_unmatched <= 1:
          cost = 1000000
        elif num_unmatched <= 2:
          cost = 2010000
        elif num_unmatched <= 3:
          cost = 4000100
        else:
          cost = 8000000 + (num_unmatched-3)
        score = dp_scores[-1][prev_index][1] + cost
        if new_scores[cur_index][1] is None or score < new_scores[cur_index][1]:
          new_scores[cur_index] = (prev_index, score)
    dp_scores.append(new_scores)
    prev_context = context

    # solved = context.OrderSolutionsMostCommonToLeast()
    # print(str(solved[-1]))
  m = None
  for index, score_elem in enumerate(dp_scores[-1]):
    next_index, score = score_elem
    if m is None or score < m[1]:
      m = (next_index, index, score)
  path = [None] * len(dp_scores)
  path[-1] = (m[1], m[2])
  next_index = m[0]
  for i in range(len(dp_scores)-2, -1, -1):
    path[i] = (next_index, dp_scores[i][next_index][1])
    next_index = dp_scores[i][next_index][0]

  # print(dp_scores)
  # print(path)

  for i, context in enumerate(contexts):
    if i > 0:
      score_diff = path[i][1] - path[i-1][1]
    else:
      score_diff = path[i][1]
    board_index = path[i][0]
    out = f' {dates[i][0]} {dates[i][1]} {path[i][1]} {score_diff} '
    left = (78 - len(out))
    print(('#' * (left // 2)) + out + ('#' * (left - left // 2)))
    print(str(context.solved[board_index]))


