import sqlite3

def inspect_db():
    conn = sqlite3.connect('waste_management.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    tables = ['users', 'bins', 'bin_readings', 'complaints']
    for table in tables:
        print(f"\n--- Table: {table} ---")
        cursor.execute(f"SELECT * FROM {table} LIMIT 1")
        row = cursor.fetchone()
        if row:
            for key in row.keys():
                print(f"{key}: {row[key]} (type: {type(row[key])})")
        else:
            print("No data in table")
            cursor.execute(f"PRAGMA table_info({table})")
            for col in cursor.fetchall():
                print(f"Col {col[0]}: {col[1]} ({col[2]})")
    
    conn.close()

if __name__ == "__main__":
    inspect_db()
