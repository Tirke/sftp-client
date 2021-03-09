#!/bin/sh -eux
/usr/bin/docker create  -p 2222:22  -e "SFTP_USERS=sftp:sftp:::upload" -e GITHUB_ACTIONS=true -e CI=true -v "/$(pwd)/test/__fixtures__/samples":"/home/sftp/samples" atmoz/sftp
sleep 10