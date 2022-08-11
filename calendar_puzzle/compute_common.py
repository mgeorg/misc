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

  single_counts = list()
  for unused_i in range(len(all_solutions['pieces'])):
    single_counts.append(dict())
  for context in contexts:
    for s in context.solved:
      for piece_index, elem in enumerate(s.used):
        if elem is None:
          continue
        # orientation, row, col = elem
        # pos = (piece_index, orientation, row, col)
        single_counts[piece_index][elem] = (
            single_counts[piece_index].get(elem, 0) + 1)
  for piece_index in range(len(single_counts)):
    max_elem = None
    max_count = None
    for elem, count in single_counts[piece_index].items():
      if max_count is None or count > max_count:
        max_count = count
        max_elem = elem
    assert max_elem
    print(f'Most common configuration for {piece_index} is {max_elem} '
          f'with {max_count} occurrences')
    b = calendar.Board(context)
    b.InitEmpty()
    b = b.Place(piece_index, max_elem[0], max_elem[1], max_elem[2])
    assert b
    print(str(b))

  # Modified to only count one occurance per date.
  single_counts = list()
  for unused_i in range(len(all_solutions['pieces'])):
    single_counts.append(dict())
  for context in contexts:
    possible = list()
    for unused_i in range(len(all_solutions['pieces'])):
      possible.append(dict())
    for s in context.solved:
      for piece_index, elem in enumerate(s.used):
        if elem is None:
          continue
        # orientation, row, col = elem
        # pos = (piece_index, orientation, row, col)
        possible[piece_index][elem] = 1
    for piece_index in range(len(all_solutions['pieces'])):
      for elem, increment in possible[piece_index].items():
        single_counts[piece_index][elem] = (
            single_counts[piece_index].get(elem, 0) + increment)
  for piece_index in range(len(single_counts)):
    max_elem = None
    max_count = None
    for elem, count in single_counts[piece_index].items():
      if max_count is None or count > max_count:
        max_count = count
        max_elem = elem
    assert max_elem
    print(f'Most common possibility for {piece_index} is {max_elem} '
          f'which works on {max_count} days.')
    b = calendar.Board(context)
    b.InitEmpty()
    b = b.Place(piece_index, max_elem[0], max_elem[1], max_elem[2])
    assert b
    print(str(b))

  double_counts = list()
  for unused_i in range(len(all_solutions['pieces'])):
    double_counts.append(list())
    for unused_j in range(len(all_solutions['pieces'])):
      double_counts[-1].append(dict())
  for context in contexts:
    possible = list()
    for unused_i in range(len(all_solutions['pieces'])):
      possible.append(list())
      for unused_j in range(len(all_solutions['pieces'])):
        possible[-1].append(dict())
    for s in context.solved:
      for piece_index1, elem1 in enumerate(s.used):
        if elem1 is None:
          continue
        for piece_index2, elem2 in enumerate(s.used):
          if elem2 is None:
            continue
          if piece_index1 >= piece_index2:
            continue
          possible[piece_index1][piece_index2][(elem1, elem2)] = 1
    for piece_index1 in range(len(all_solutions['pieces'])):
      for piece_index2 in range(len(all_solutions['pieces'])):
        for elems, increment in possible[piece_index1][piece_index2].items():
          double_counts[piece_index1][piece_index2][elems] = (
              double_counts[piece_index1][piece_index2].get(elems, 0) +
              increment)

  for piece_index1 in range(len(double_counts)):
    for piece_index2 in range(piece_index1+1, len(double_counts[piece_index1])):
      if piece_index1 == piece_index2:
        continue
      max_elems = None
      max_count = None
      for elems, count in double_counts[piece_index1][piece_index2].items():
        if max_count is None or count > max_count:
          max_count = count
          max_elems = elems
      assert max_elems
      print(f'Most common combinations for {piece_index1}, {piece_index2} '
            f'is {max_elems} '
            f'which works on {max_count} days')
      b = calendar.Board(context)
      b.InitEmpty()
      b = b.Place(piece_index1,
                  max_elems[0][0], max_elems[0][1], max_elems[0][2])
      b = b.Place(piece_index2,
                  max_elems[1][0], max_elems[1][1], max_elems[1][2])
      assert b
      print(str(b))

