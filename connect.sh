#!/bin/bash

source .env

echo "Fetching instance ID..."
BASTION_INSTANCE_ID=$(aws cloudformation describe-stacks --stack-name ${BASE_STACK_NAME}-output --query 'Stacks[0].Outputs[?OutputKey==`BastionInstanceId`].OutputValue' --output text)
echo "Bastion Instance ID: $BASTION_INSTANCE_ID"
echo ""

# -----

echo "Fetching Aurora credentials..."
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id $AURORA_CREDENTIALS_SECRET_NAME --query SecretString --output text)

HOST=$(echo $SECRET_JSON | jq -r '.host')
PORT=$(echo $SECRET_JSON | jq -r '.port')
USERNAME=$(echo $SECRET_JSON | jq -r '.username')
PASSWORD=$(echo $SECRET_JSON | jq -r '.password')

LOCAL_HOST=localhost
LOCAL_PORT=3306

echo "Press Enter to show credentials"
echo "<Enter>"
read

echo "===== ===== ===== ===== ====="
echo "HOST    : $HOST"
echo "  -> Forward to $LOCAL_HOST:"
echo "PORT    : $PORT"
echo "  -> Forward to $LOCAL_PORT"
echo "USERNAME: $USERNAME"
echo "PASSWORD: $PASSWORD"
echo "===== ===== ===== ===== ====="
echo ""

echo "Press Enter to connect to Aurora"
echo "<Enter>"
read

echo "Connecting to Aurora..."

aws ssm start-session --target $BASTION_INSTANCE_ID --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters '{"host":["'$HOST'"],"portNumber":["'$PORT'"],"localPortNumber":["'$LOCAL_PORT'"]}'
