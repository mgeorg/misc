#!/usr/bin/python3

import copy
import itertools
import math


_NUM_BOXES = 10

def generate_strategies(base_strategy, possible_picks, from_index):
  if from_index == len(base_strategy):
    yield copy.copy(base_strategy)
  elif base_strategy[from_index] is None:
    my_base_strategy = copy.copy(base_strategy)
    for new_pick in possible_picks:
      my_base_strategy[from_index] = new_pick
      yield from generate_strategies(
          my_base_strategy, possible_picks, from_index + 1)
  else:
    yield from generate_strategies(
        base_strategy, possible_picks, from_index + 1)


def main():
  perms = list(itertools.permutations(range(1, _NUM_BOXES + 1)))
  num_choices = _NUM_BOXES // 2
  possible_picks = [set(x) for x in sorted(itertools.combinations(
      range(1, _NUM_BOXES + 1), num_choices))]
  print(possible_picks)
  if _NUM_BOXES == 10:
    base_strategy = [
      set([1,2,3,4,5]),
      set([1,2,3,4,5]),
      set([1,2,3,4,5]),
      set([1,2,3,4,5]),
      set([1,2,3,4,5]),
      set([6,7,8,9,10]),
      set([6,7,8,9,10]),
      set([6,7,8,9,10]),
      set([6,7,8,9,10]),
      set([6,7,8,9,10]),
    ]
  if _NUM_BOXES == 8:
    base_strategy = [
      set([1,2,3,4]),
      set([1,2,3,4]),
      set([1,2,3,4]),
      set([1,2,3,4]),
      set([5,6,7,8]),
      set([5,6,7,8]),
      set([5,6,7,8]),
      set([5,6,7,8]),
    ]
  if _NUM_BOXES == 6:
    base_strategy = [
      set([1,2,3]),
      set([1,2,3]),
      set([1,2,3]),
      set([4,5,6]),
      set([4,5,6]),
      set([4,5,6]),
    ]
  max_perm_count = 0
  max_strategies = []
  print()
  for i, strategy in enumerate(generate_strategies(
      copy.copy(base_strategy), possible_picks, 0)):
    perm_count = try_strategy(strategy, perms)
    if i % 101 == 0:
      print(f'{strategy}, {perm_count}, {max_perm_count}')
    if perm_count == max_perm_count:
      max_perm_count = perm_count
      max_strategies.append(copy.copy(strategy))
    elif perm_count > max_perm_count:
      max_perm_count = perm_count
      max_strategies = [copy.copy(strategy)]
  print()

  for strategy in max_strategies:
    print(f'{strategy}, {max_perm_count}, '
          f'{max_perm_count / math.factorial(_NUM_BOXES)}')

def try_strategy(strategy, perms):
  count_kept = 0
  for p in perms:
    keep = True
    for i, pick in enumerate(strategy):
      if pick and p[i] not in pick:
        keep = False
    if keep:
      count_kept += 1
      # print(p)
  # print(count_kept)
  return count_kept

if __name__ == '__main__':
  main()
