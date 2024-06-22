#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import subprocess
import re
import sys
from argparse import ArgumentParser


parser = ArgumentParser(description='Tool: Quick song score submit files')
parser.add_argument("-t", "--token", dest="token", required=True,
                    help="API token", type=str, default ="88fe6ab2-8a5a-4ece-8f32-48a3e4db41fd")
parser.add_argument("-a", "--song", dest="song_url",
                    help="SONG URL", type=str, default ="https://song.demo.overture.bio")
parser.add_argument("-b", "--score", dest="score_url",
                    help="SCORE URL", type=str, default ="https://score.demo.overture.bio")
parser.add_argument("-s", "--study", dest="studyId",
                    help="studyId", type=str, default ="demoData")
parser.add_argument("-j", "--json", dest="json",
                    help="JSON file", type=str)
parser.add_argument("-d", "--directory", dest="directory",
                    help="JSON and data directory", type=str)

args = parser.parse_args()


token=args.token
song_url=args.song_url
studyId=args.studyId
score_url=args.score_url
json_directory=args.directory
json_file=args.json

submit_cmd=\
"""
docker run \
-e CLIENT_ACCESS_TOKEN=%s \
-e CLIENT_STUDY_ID=%s \
-e CLIENT_SERVER_URL=%s \
--network="host" \
--mount type=bind,source=%s,target=/output \
ghcr.io/overture-stack/song-client \
sing submit -f /output/%s
""" % (token,studyId,song_url,json_directory,json_file)

print("Running %s :" % submit_cmd)
proc = subprocess.Popen(
                submit_cmd,
                shell=True,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

stdout, stderr = proc.communicate()

if proc.returncode!=0:
    print("ERRORCODE : %s " % (str(proc.returncode)))
    print("STDOUT : %s " % (stdout.decode("utf-8").strip()))
    print("STDERR : %s " % (stderr.decode("utf-8").strip()))
    sys.exit(1)
else:
    print("SUCCESS")
    analysisId=re.findall('[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}',stdout.decode("utf-8").strip())[0]
    print("analysisId generated : %s" % (analysisId))


manifest_cmd=\
"""
docker run \
-e CLIENT_ACCESS_TOKEN=%s \
-e CLIENT_STUDY_ID=%s \
-e CLIENT_SERVER_URL=%s \
--network="host" \
--mount type=bind,source=%s,target=/output \
ghcr.io/overture-stack/song-client \
sing manifest -a %s -f /output/manifest.txt -d /output/
""" % (token,studyId,song_url,json_directory,analysisId)

print("Running : %s " % manifest_cmd)
proc = subprocess.Popen(
                manifest_cmd,
                shell=True,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

stdout, stderr = proc.communicate()

if proc.returncode!=0:
    print("ERRORCODE : %s " % (str(proc.returncode)))
    print("STDOUT : %s " % (stdout.decode("utf-8").strip()))
    print("STDERR : %s " % (stderr.decode("utf-8").strip()))
    sys.exit(1)
else:
    print("SUCCESS")

upload_cmd=\
"""
docker run \
-e ACCESSTOKEN=%s \
-e STORAGE_URL=%s \
-e METADATA_URL=%s \
--network="host" \
--mount type=bind,source="%s",target=/output \
ghcr.io/overture-stack/score \
score-client upload --manifest /output/manifest.txt
""" % (token,score_url,song_url,json_directory)
print("Running : %s" % upload_cmd)
proc = subprocess.Popen(
                upload_cmd,
                shell=True,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

stdout, stderr = proc.communicate()

if proc.returncode!=0:
    print("ERRORCODE : %s " % (str(proc.returncode)))
    print("STDOUT : %s " % (stdout.decode("utf-8").strip()))
    print("STDERR : %s " % (stderr.decode("utf-8").strip()))
    sys.exit(1)
else:
    print("SUCCESS")

publish_cmd=\
"""
docker run \
-e CLIENT_ACCESS_TOKEN=%s \
-e CLIENT_STUDY_ID=%s \
-e CLIENT_SERVER_URL=%s \
--network="host" \
--mount type=bind,source=%s,target=/output \
ghcr.io/overture-stack/song-client \
sing publish -a %s
""" % (token,studyId,song_url,json_directory,analysisId)
print("Running : %s" % publish_cmd)
proc = subprocess.Popen(
                publish_cmd,
                shell=True,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

stdout, stderr = proc.communicate()

if proc.returncode!=0:
    print("ERRORCODE : %s " % (str(proc.returncode)))
    print("STDOUT : %s " % (stdout.decode("utf-8").strip()))
    print("STDERR : %s " % (stderr.decode("utf-8").strip()))
    sys.exit(1)
else:
    print("SUCCESS")