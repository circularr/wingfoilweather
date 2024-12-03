#!/bin/bash

OUTPUT_FILE="concatenated_source.txt"
echo "" > $OUTPUT_FILE

# Function to add a file to our output
add_file() {
    local filepath=$1
    local relpath=${filepath#/Users/paul/weatherhero/}
    
    echo "=======================================" >> $OUTPUT_FILE
    echo "File: $relpath" >> $OUTPUT_FILE
    echo "=======================================" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    cat "$filepath" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
}

# Add root HTML file
add_file "/Users/paul/weatherhero/index.html"

# Add all source files
find "/Users/paul/weatherhero/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" \) | while read file; do
    add_file "$file"
done

echo "Source code has been concatenated into $OUTPUT_FILE"
