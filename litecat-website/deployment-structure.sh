#!/bin/bash

# Create professional directory structure
mkdir -p /opt/lightcat-rgb/{bin,config,data,logs,scripts,services}
mkdir -p /var/log/lightcat
mkdir -p /var/backups/lightcat
mkdir -p /etc/lightcat

# Set permissions
chmod 755 /opt/lightcat-rgb
chmod 750 /opt/lightcat-rgb/{data,config}
chmod 755 /var/log/lightcat

# Create lightcat user for security
useradd -r -s /bin/false -d /opt/lightcat-rgb lightcat || true
chown -R lightcat:lightcat /opt/lightcat-rgb
chown -R lightcat:lightcat /var/log/lightcat
