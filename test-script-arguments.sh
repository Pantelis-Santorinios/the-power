#!/bin/bash

# Simple test script to verify arguments are passed correctly
echo "Test script started"
echo "Number of arguments: $#"
echo "All arguments: $@"

if [ $# -eq 0 ]; then
    echo "No arguments provided"
else
    echo "First argument: $1"
    if [ $# -gt 1 ]; then
        echo "Second argument: $2"
    fi
fi

echo "Test script completed"