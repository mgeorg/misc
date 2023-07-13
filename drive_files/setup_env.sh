#!/bin/bash

# Must be sourced directly to activate the python3 environment.
#
# Usage:
#   source setup_env.sh

if ! dpkg -s python3-dateutil ; then
  sudo aptitude install python3-dateutil
fi
if ! dpkg -s python3-venv ; then
  sudo aptitude install python3-venv
fi

if ! [[ -d ~/python3_primary_env ]] ; then
  python3 -m venv ~/python3_primary_env
fi

source ~/python3_primary_env/bin/activate

pip install --upgrade \
  numpy \
  google-api-python-client \
  google-auth-httplib2 \
  google-auth-oauthlib \
  python-dateutil \
  editdistance
