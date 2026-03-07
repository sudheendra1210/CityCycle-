import sqlite3

def check_schema():
    conn = sqlite3.connect('waste_management.db')
    cursor = conn.cursor()
    
    tables = ['users', 'bins', 'bin_readings', 'complaints']
    for table in tables:
        print(f"\nSchema for {table}:")
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        for col in columns:
            print(col)
    
    conn.close()

if __name__ == "__main__":
    check_schema()
