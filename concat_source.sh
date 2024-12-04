#!/bin/bash

OUTPUT_FILE="src_files.txt"
echo "" > $OUTPUT_FILE

# Function to add a file to our output
add_file() {
    local filepath=$1
    local relpath=${filepath#/Users/paul/Documents/tensor/wingfoilweather/}
    
    echo "=== START FILE: $relpath ===" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    cat "$filepath" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    echo "=== END FILE: $relpath ===" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
}

# Add all source files recursively
find "/Users/paul/Documents/tensor/wingfoilweather/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) | sort | while read file; do
    add_file "$file"
done

echo "Source code has been concatenated into $OUTPUT_FILE"
