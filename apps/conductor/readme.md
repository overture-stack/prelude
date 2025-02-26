# Complete Conductor CLI Testing Commands

## Basic File Format Tests

1. **Valid CSV:**

   ```bash
   conductor -f ./data/valid.csv
   ```

2. **Malformed CSV:**

   ```bash
   conductor -f ./data/malformed.csv
   ```

3. **Semicolon Delimiter Without Flag:**

   ```bash
   conductor -f ./data/semicolon.csv
   ```

4. **Semicolon Delimiter With Flag:**

   ```bash
   conductor -f ./data/semicolon.csv --delimiter ";"
   ```

5. **Empty File:**

   ```bash
   conductor -f ./data/empty.csv
   ```

6. **Headers Only:**

   ```bash
   conductor -f ./data/headers_only.csv
   ```

7. **Invalid Headers:**

   ```bash
   conductor -f ./data/invalid_headers.csv
   ```

8. **Large Dataset:**
   ```bash
   conductor -f ./data/large.csv
   ```

## Configuration Options

9. **Custom Index:**

   ```bash
   conductor -f ./data/valid.csv -i custom-index
   ```

10. **Output Logs:**

    ```bash
    conductor -f ./data/valid.csv -o ./logs/test-output.log
    ```

11. **Custom Elasticsearch URL:**

    ```bash
    conductor -f ./data/valid.csv --url http://localhost:9200
    ```

12. **With Authentication:**

    ```bash
    conductor -f ./data/valid.csv -u elastic -p password
    ```

13. **Full Connection Settings:**

    ```bash
    conductor -f ./data/valid.csv --url http://localhost:9200 -u elastic -p password -i test-index
    ```

14. **Custom Batch Size:**

    ```bash
    conductor -f ./data/valid.csv -b 500
    ```

15. **Debug Mode:**
    ```bash
    conductor -f ./data/valid.csv --debug
    ```

## Error Cases

16. **Multiple Files (Valid):**

    ```bash
    conductor -f ./data/valid.csv ./data/headers_only.csv
    ```

17. **Multiple Files (Mixed Valid/Invalid):**

    ```bash
    conductor -f ./data/valid.csv ./data/invalid.txt
    ```

18. **Missing Required Arguments:**

    ```bash
    conductor
    ```

19. **Invalid File Extensions:**

    ```bash
    conductor -f ./data/valid.csv.txt
    ```

20. **File Not Found:**

    ```bash
    conductor -f ./data/nonexistent.csv
    ```

21. **Invalid Connection:**

    ```bash
    conductor -f ./data/valid.csv --url http://wronghost:9200
    ```

22. **Authentication Error:**

    ```bash
    conductor -f ./data/valid.csv -u wronguser -p wrongpass
    ```

23. **Invalid Index Name:**

    ```bash
    conductor -f ./data/valid.csv -i "invalid%index"
    ```

24. **Invalid Batch Size:**

    ```bash
    conductor -f ./data/valid.csv -b -1
    ```

25. **Invalid Batch Size (Non-Numeric):**
    ```bash
    conductor -f ./data/valid.csv -b xyz
    ```

## Help Command

26. **Help Command:**
    ```bash
    conductor --help
    ```
