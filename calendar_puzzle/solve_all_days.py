#!/usr/bin/python3

import calendar
import datetime
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
  file_name = 'output.txt'

  context = calendar.BoardContext()
  suffix = ''
  # context = calendar.BoardContext({'solve_for_all': False, 'use_line': None})
  # suffix = '_cross'
  stop_on_no_solution = True

  with open(f'best_solutions{suffix}.txt', 'w') as f_best:
    with open(f'all_solutions{suffix}.txt', 'w') as f_all:
      for month, max_days in days_per_month:
        for day in range(1, max_days+1):
          context.Solve(month, day)
          solved = context.OrderSolutionsMostCommonToLeast()
          print(f'{month} {day} has {len(solved)} solutions')
          if not solved and stop_on_no_solution:
            print('stopping because there is no solution.')
            sys.exit(1)
          if solved:
            print(str(solved[-1]))
          f_best.write(f'{month} {day} has {len(solved)} solutions\n')
          if solved:
            f_best.write(str(solved[-1]))
            f_best.write(f'\n')
          f_best.flush()
          f_all.write(f'{month} {day} has {len(solved)} solutions\n')
          if solved:
            f_all.write('\n\n'.join([str(x) for x in solved]))
            f_all.write(f'\n')
          f_all.write(f'-' *78)
          f_all.write(f'\n')
          f_all.write(f'#' *78)
          f_all.write(f'\n')
          f_all.write(f'-' *78)
          f_all.write(f'\n')
          f_all.flush()
