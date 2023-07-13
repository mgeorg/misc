#!/usr/bin/env python3
"""Download the list of files in Drive.

Ensure you have the required deps for the script:
  pip install --upgrade google-api-python-client google-auth-httplib2 \
    google-auth-oauthlib

"""

import json
import os
import pathlib
import re

import google.auth.exceptions
from google.auth.transport import requests
from google.oauth2 import credentials
from google_auth_oauthlib import flow
from googleapiclient import discovery

_LOCAL_DUMP = pathlib.Path.home().joinpath('drive_photos')
_SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/photoslibrary.readonly',
]
_SECRETS_DIR = pathlib.Path.home().joinpath('.drive_certificate')
_TOKEN_FILE_NAME = _SECRETS_DIR.joinpath('drive_auth_token.json')
_CREDENTIALS_FILE_NAME = _SECRETS_DIR.joinpath(
    'client_secret_550164719385-87akuf534g71lgol2hd17e3l6bhhi338'
    '.apps.googleusercontent.com.json')


class Error(Exception):
  pass


def compute_paths(current_dir, files, directories, paths):
  prefix = paths[current_dir] + '/'
  for file in directories[current_dir]:
    paths[file] = prefix + files[file]['name']
    if file in directories:
      compute_paths(file, files, directories, paths)


def get_creds(creds_file, token_file, scopes):
  """Get the credentials.

  This function tries to use the given token_file to get credentials
  with the given scope.  It may, pop up a web browser window (or lynx)
  to get the proper approval.

  Args:
    creds_file: The credentials file for the webapp.
    token_file: A file to use to store the authentication token which is
                reused if possible.
    scopes: The scopes requested.
  Returns:
    The credentials object.
  """
  creds = None
  # The file token.json stores the user's access and refresh tokens, and is
  # created automatically when the authorization flow completes for the first
  # time.
  if pathlib.Path(token_file).exists():
    creds = credentials.Credentials.from_authorized_user_file(
        token_file, scopes)
  if not creds or not creds.valid:
    cred_valid = False
    if creds and creds.expired and creds.refresh_token:
      try:
        creds.refresh(requests.Request())
      except google.auth.exceptions.RefreshError:
        pass
      if not creds.expired:
        cred_valid = True
    if not cred_valid:
      auth_flow = flow.InstalledAppFlow.from_client_secrets_file(
          creds_file, scopes)
      creds = auth_flow.run_local_server(port=0)
    with open(token_file, 'w') as token:
      token.write(creds.to_json())
  return creds


def get_default_creds():
  return get_creds(_CREDENTIALS_FILE_NAME,
                   _TOKEN_FILE_NAME,
                   _SCOPES)


def get_drive_id(service, drive_name):
  """Get the id of the shared drive."""
  # Find the drive id.
  results = service.drives().list(
      # q=f"name = '{drive_name}'",
      pageSize=10, useDomainAdminAccess=False).execute()
    
  items = results.get('drives', [])
  for elem in items:
    print(elem)

  if not items:
    raise Error('Could not find drive.')
  if len(items) > 1:
    raise Error('More than one drive found.')
  return (items[0]['id'], drive_name)


def get_drive_service():
  """Get the service to access drive.
    
  The service is cached in a global variable.
  Returns:
    A dict containing 'creds', 'service', 'drive_id', and 'drive_name'.
  """
  creds = get_default_creds()
  assert creds
  service = discovery.build('drive', 'v3', credentials=creds)

  return {
      'creds': creds,
      'service': service,
  }


def get_photos_service():
  """Get the service to access photos.

  Returns:
    A dict containing 'creds', and 'service'.
  """
  creds = get_default_creds()
  assert creds
  service = discovery.build(
      'photoslibrary', 'v1', credentials=creds, static_discovery=False)

  return {
      'creds': creds,
      'service': service,
  }


class DriveDownloader(object):
  def __init__(self, drive_name):
    self.drive_service = get_drive_service()
    if drive_name:
      self.drive_id, self.drive_name = get_drive_id(
          self.drive_service['service'], drive_name)
      self.fetch_files(self.drive_id)
    else:
      self.fetch_files()
    
  def fetch_files(self, drive_id=None):
    # Fetch metadata for every file in the drive, so we can figure everything
    # out locally.

    use_default_drive_id = False
    if not drive_id:
      use_default_drive_id = True
      drive_id = self.drive_service['service'].files().get(
          fileId='root').execute()['id']
      print(f'Using default drive: {drive_id}')

    files = dict()
    has_more = True
    next_token = ''
    while has_more:
      print(f'Reading a page of files from "{drive_id}". {len(files)} read.')
      fields = 'nextPageToken, files(id, name, mimeType, parents, md5Checksum)'
      if use_default_drive_id:
        results = self.drive_service['service'].files().list(
            # q=f"mimeType = 'application/vnd.google-apps.folder'",
            # q="name = 'Wash Bear belt story'",
            # q="'0AMGGXEP20xVBUk9PVA' in parents",
            pageToken=next_token,
            # driveId=drive_service['drive_id'],
            # includeItemsFromAllDrives=True,
            # supportsAllDrives=True,
            # corpora='drive',
            pageSize=1000,
            fields=fields).execute()
      else:
        results = self.drive_service['service'].files().list(
            # q=f"mimeType = 'application/vnd.google-apps.folder'",
            # q="name = 'Wash Bear belt story'",
            pageToken=next_token,
            driveId=drive_id,
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
            corpora='drive',
            pageSize=1000,
            fields=fields).execute()
      assert not results.get('incompleteSearch', False)
      items = results.get('files', [])
      has_more = 'nextPageToken' in results
      next_token = results.get('nextPageToken', None)

      for item in items:
        files[item['id']] = item

    print(f'total of {len(files)} files read.')
    # print(files)

    # Create a map from directory ids to the file ids of what is in it.
    directories = dict()
    for file_id, item in files.items():
      if len(item.get('parents', [])) != 1:
        if len(item.get('parents', [])) == 0:
          print(f'item {item["name"]} has no parent, ignoring')
          continue
        print(item)
        raise Error(
            f'Unable to understand directory structure where one directory is'
            'in more than one place {file_id}.')
      parent = item['parents'][0]
      if parent not in directories:
        directories[parent] = []
      directories[parent].append(item['id'])

    # Compute '/' deliminated paths for each file.
    paths = dict()
    paths[drive_id] = ''
    compute_paths(drive_id, files, directories, paths)

    # Reverse the paths data structure.
    path_to_id = dict()
    for file_id, path in sorted(paths.items(), key=lambda x: (x[1], x[0])):
      path_to_id[path] = file_id

    for path, file_id in path_to_id.items():
      print(f'{file_id} {path}')


class PhotosDownloader(object):
  def __init__(self):
    """Get the current state of the Google photos files."""
    photos_service = get_photos_service()

    media_items = list()
    has_more = True
    next_token = ''
    while has_more:
      print(f'Reading a page of media items from photos library. '
            f'{len(media_items)} items read.')
      results = photos_service['service'].mediaItems().list(
          pageSize=100,
          pageToken=next_token).execute()
      items = results.get('mediaItems', [])
      has_more = 'nextPageToken' in results
      next_token = results.get('nextPageToken', None)

      media_items.extend(items)
      for d in items:
        print(d['filename'])

    media_items.sort(key=lambda x: (x['mimeType'], x['filename'], x['id']))

    self.data = {
        'mediaItems': media_items,
    }
    # for d in self.data['mediaItems']:
    #   print(d['filename'])


def main():
  down = DriveDownloader('')
  # photos = PhotosDownloader()
  return
  drive_files = list()
  photos_files = list()
  with open('/home/mgeorg/drive_photos/file_list.txt', 'r') as f:
    for line in f:
      m = re.match(r'^.* /Google Photos/\d{4}$', line)
      if m:
        print(f'skipping directory {line.strip()}')
        continue
      m = re.match(r'^.* /Google Photos/\d{4}/\d{2}$', line)
      if m:
        print(f'skipping directory {line.strip()}')
        continue
      m = re.match(r'^.* (/Google Photos/\d{4}/\d{2}/)(.*)$', line)
      assert m, line
      drive_files.append((m.group(2), m.group(1) + m.group(2)))
  with open('/home/mgeorg/drive_photos/photos_list.txt', 'r') as f:
    for line in f:
      photos_files.append(line.strip())
  photos_files = set(photos_files)
  for filename, path in sorted(drive_files, key=lambda x: x[1]):
    if filename not in photos_files:
      print(f'Did not find file: {path}')

if __name__ == '__main__':
  main()

